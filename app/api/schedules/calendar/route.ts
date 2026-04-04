import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildScheduleIcs } from "@/lib/schedule-ics";
import { serializeScheduleDate } from "@/lib/schedule-format";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || "";
    const tag = searchParams.get("tag") || "";

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return new NextResponse("month は YYYY-MM 形式で指定してください。", { status: 400 });
    }

    const monthStart = new Date(`${month}-01T00:00:00+09:00`);
    const nextMonth = new Date(monthStart);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

    const schedules = await prisma.scheduleEntry.findMany({
      where: {
        eventDate: {
          gte: monthStart,
          lt: nextMonth
        },
        ...(tag ? { tags: { has: tag } } : {})
      },
      orderBy: [{ eventDate: "asc" }, { startTime: "asc" }, { createdAt: "asc" }]
    });

    const ics = buildScheduleIcs(
      schedules.map((entry) => ({
        id: entry.id,
        eventDate: serializeScheduleDate(entry.eventDate),
        startTime: entry.startTime,
        endTime: entry.endTime,
        location: entry.location,
        content: entry.content,
        tags: entry.tags,
        note: entry.note
      }))
    );

    const filename = buildFilename(month, tag);

    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "カレンダーファイルの作成に失敗しました。";
    return new NextResponse(message, { status: 500 });
  }
}

function buildFilename(month: string, tag: string) {
  const safeTag = toAsciiTag(tag);
  return `fc-kumano-schedule-${month}${safeTag ? `-${safeTag}` : ""}.ics`;
}

function toAsciiTag(tag: string) {
  const table: Record<string, string> = {
    "キッズ": "kids",
    "低学年": "lower",
    "中学年": "middle",
    "高学年": "upper",
    "1年": "grade1",
    "2年": "grade2",
    "3年": "grade3",
    "4年": "grade4",
    "5年": "grade5",
    "6年": "grade6"
  };

  if (table[tag]) {
    return table[tag];
  }

  return tag.replaceAll(/[^a-zA-Z0-9_-]/g, "-");
}

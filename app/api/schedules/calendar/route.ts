import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildScheduleIcs } from "@/lib/schedule-ics";
import { serializeScheduleDate } from "@/lib/schedule-format";

export async function GET(request: Request) {
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
}

function buildFilename(month: string, tag: string) {
  const safeTag = tag.replaceAll(/[^\p{L}\p{N}_-]/gu, "-");
  return `fc-kumano-schedule-${month}${safeTag ? `-${safeTag}` : ""}.ics`;
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleEntryInclude, serializeScheduleEntry } from "@/lib/schedule-entry";
import { upsertLineUser } from "@/lib/upsert-line-user";
import { z } from "zod";

const bodySchema = z.object({
  idToken: z.string().min(1),
  attendance: z.object({
    status: z.enum(["参加", "欠席", "未定"]),
    note: z.string()
  })
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = bodySchema.parse(await request.json());
    const user = await upsertLineUser(parsed.idToken);

    await prisma.attendance.upsert({
      where: {
        scheduleEntryId_userId: {
          scheduleEntryId: id,
          userId: user.id
        }
      },
      update: {
        status: parsed.attendance.status,
        note: parsed.attendance.note || null
      },
      create: {
        scheduleEntryId: id,
        userId: user.id,
        status: parsed.attendance.status,
        note: parsed.attendance.note || null
      }
    });

    const entry = await prisma.scheduleEntry.findUniqueOrThrow({
      where: { id },
      include: scheduleEntryInclude
    });

    return NextResponse.json(serializeScheduleEntry(entry));
  } catch (error) {
    const message = error instanceof Error ? error.message : "出欠保存に失敗しました。";
    return new NextResponse(message, { status: 400 });
  }
}

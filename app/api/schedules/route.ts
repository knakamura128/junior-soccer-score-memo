import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upsertLineUser } from "@/lib/upsert-line-user";
import { scheduleEntryInclude, serializeScheduleEntry } from "@/lib/schedule-entry";
import { buildApiErrorResponse } from "@/lib/api-error";
import { z } from "zod";

const schedulePayloadSchema = z.object({
  eventDate: z.string().min(1),
  tags: z.array(z.string()).min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  location: z.string().min(1),
  content: z.string().min(1),
  dutyLabel: z.string(),
  isMatch: z.boolean(),
  note: z.string()
});

const createSchema = z.object({
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
  schedule: schedulePayloadSchema
}).refine((value) => value.idToken || value.accessToken, {
  message: "LINEログインが必要です。"
});

export async function GET() {
  const schedules = await prisma.scheduleEntry.findMany({
    include: scheduleEntryInclude,
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }, { createdAt: "asc" }]
  });

  return NextResponse.json(schedules.map(serializeScheduleEntry));
}

export async function POST(request: Request) {
  try {
    const parsed = createSchema.parse(await request.json());
    const user = await upsertLineUser({ idToken: parsed.idToken, accessToken: parsed.accessToken });

    const saved = await prisma.scheduleEntry.create({
      data: {
        eventDate: new Date(`${parsed.schedule.eventDate}T00:00:00+09:00`),
        tags: parsed.schedule.tags,
        editedFields: [],
        startTime: parsed.schedule.startTime,
        endTime: parsed.schedule.endTime,
        location: parsed.schedule.location,
        content: parsed.schedule.content,
        dutyLabel: parsed.schedule.dutyLabel || null,
        isMatch: parsed.schedule.isMatch,
        note: parsed.schedule.note || null,
        createdById: user.id,
        updatedById: user.id
      },
      include: scheduleEntryInclude
    });

    return NextResponse.json(serializeScheduleEntry(saved));
  } catch (error) {
    return buildApiErrorResponse(error, "スケジュール作成に失敗しました。");
  }
}

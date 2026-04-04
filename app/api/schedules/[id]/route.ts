import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleEntryInclude, serializeScheduleEntry } from "@/lib/schedule-entry";
import { upsertLineUser } from "@/lib/upsert-line-user";
import { verifyLineSession } from "@/lib/line-auth";
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

const updateSchema = z.object({
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
  schedule: schedulePayloadSchema
}).refine((value) => value.idToken || value.accessToken, {
  message: "LINEログインが必要です。"
});

const deleteSchema = z.object({
  idToken: z.string().optional(),
  accessToken: z.string().optional()
}).refine((value) => value.idToken || value.accessToken, {
  message: "LINEログインが必要です。"
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = updateSchema.parse(await request.json());
    const user = await upsertLineUser({ idToken: parsed.idToken, accessToken: parsed.accessToken });

    const updated = await prisma.scheduleEntry.update({
      where: { id },
      data: {
        eventDate: new Date(`${parsed.schedule.eventDate}T00:00:00+09:00`),
        tags: parsed.schedule.tags,
        startTime: parsed.schedule.startTime,
        endTime: parsed.schedule.endTime,
        location: parsed.schedule.location,
        content: parsed.schedule.content,
        dutyLabel: parsed.schedule.dutyLabel || null,
        isMatch: parsed.schedule.isMatch,
        note: parsed.schedule.note || null,
        updatedById: user.id
      },
      include: scheduleEntryInclude
    });

    return NextResponse.json(serializeScheduleEntry(updated));
  } catch (error) {
    return buildApiErrorResponse(error, "スケジュール更新に失敗しました。");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = deleteSchema.parse(await request.json());
    await verifyLineSession({ idToken: parsed.idToken, accessToken: parsed.accessToken });

    await prisma.scheduleEntry.delete({
      where: { id }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return buildApiErrorResponse(error, "スケジュール削除に失敗しました。");
  }
}

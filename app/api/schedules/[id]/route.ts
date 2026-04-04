import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleEntryInclude, serializeScheduleEntry } from "@/lib/schedule-entry";
import { upsertLineUser } from "@/lib/upsert-line-user";
import { verifyLineSession } from "@/lib/line-auth";
import { buildApiErrorResponse } from "@/lib/api-error";
import { serializeScheduleDate } from "@/lib/schedule-format";
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
    const existing = await prisma.scheduleEntry.findUniqueOrThrow({
      where: { id }
    });
    const nextEditedFields = collectEditedFields(existing, parsed.schedule);

    const updated = await prisma.scheduleEntry.update({
      where: { id },
      data: {
        eventDate: new Date(`${parsed.schedule.eventDate}T00:00:00+09:00`),
        tags: parsed.schedule.tags,
        editedFields: nextEditedFields,
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

function collectEditedFields(
  existing: {
    eventDate: Date;
    tags: string[];
    startTime: string;
    endTime: string;
    location: string;
    content: string;
    dutyLabel: string | null;
    isMatch: boolean;
    note: string | null;
  },
  next: {
    eventDate: string;
    tags: string[];
    startTime: string;
    endTime: string;
    location: string;
    content: string;
    dutyLabel: string;
    isMatch: boolean;
    note: string;
  }
) {
  const editedFields: string[] = [];
  const existingDate = serializeScheduleDate(existing.eventDate);

  if (existingDate !== next.eventDate) editedFields.push("eventDate");
  if (!sameStringArray(existing.tags, next.tags)) editedFields.push("tags");
  if (existing.startTime !== next.startTime) editedFields.push("startTime");
  if (existing.endTime !== next.endTime) editedFields.push("endTime");
  if (existing.location !== next.location) editedFields.push("location");
  if (existing.content !== next.content) editedFields.push("content");
  if ((existing.dutyLabel || "") !== next.dutyLabel) editedFields.push("dutyLabel");
  if (existing.isMatch !== next.isMatch) editedFields.push("isMatch");
  if ((existing.note || "") !== next.note) editedFields.push("note");

  return editedFields;
}

function sameStringArray(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
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

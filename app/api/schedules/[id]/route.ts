import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeScheduleDate } from "@/lib/schedule-format";
import { upsertLineUser } from "@/lib/upsert-line-user";
import { verifyLineIdToken } from "@/lib/line-auth";
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
  idToken: z.string().min(1),
  schedule: schedulePayloadSchema
});

const deleteSchema = z.object({
  idToken: z.string().min(1)
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = updateSchema.parse(await request.json());
    const user = await upsertLineUser(parsed.idToken);

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
      include: {
        createdBy: true,
        updatedBy: true,
        attendances: {
          include: { user: true },
          orderBy: [{ updatedAt: "desc" }]
        },
        dutyAssignment: {
          include: {
            assignedUser: true,
            decidedBy: true
          }
        }
      }
    });

    return NextResponse.json({
      ...updated,
      eventDate: serializeScheduleDate(updated.eventDate),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      dutyAssignment: updated.dutyAssignment
        ? {
            ...updated.dutyAssignment,
            decidedAt: updated.dutyAssignment.decidedAt?.toISOString() || null,
            createdAt: updated.dutyAssignment.createdAt.toISOString(),
            updatedAt: updated.dutyAssignment.updatedAt.toISOString()
          }
        : null,
      attendances: updated.attendances.map((attendance) => ({
        ...attendance,
        createdAt: attendance.createdAt.toISOString(),
        updatedAt: attendance.updatedAt.toISOString()
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "スケジュール更新に失敗しました。";
    return new NextResponse(message, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = deleteSchema.parse(await request.json());
  await verifyLineIdToken(parsed.idToken);

  await prisma.scheduleEntry.delete({
    where: { id }
  });

  return NextResponse.json({ ok: true });
}

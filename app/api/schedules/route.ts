import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upsertLineUser } from "@/lib/upsert-line-user";
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

const createSchema = z.object({
  idToken: z.string().min(1),
  schedule: schedulePayloadSchema
});

export async function GET() {
  const schedules = await prisma.scheduleEntry.findMany({
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
    },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }, { createdAt: "asc" }]
  });

  return NextResponse.json(
    schedules.map((entry) => ({
      ...entry,
      eventDate: serializeScheduleDate(entry.eventDate),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      dutyAssignment: entry.dutyAssignment
        ? {
            ...entry.dutyAssignment,
            decidedAt: entry.dutyAssignment.decidedAt?.toISOString() || null,
            createdAt: entry.dutyAssignment.createdAt.toISOString(),
            updatedAt: entry.dutyAssignment.updatedAt.toISOString()
          }
        : null,
      attendances: entry.attendances.map((attendance) => ({
        ...attendance,
        createdAt: attendance.createdAt.toISOString(),
        updatedAt: attendance.updatedAt.toISOString()
      }))
    }))
  );
}

export async function POST(request: Request) {
  try {
    const parsed = createSchema.parse(await request.json());
    const user = await upsertLineUser(parsed.idToken);

    const saved = await prisma.scheduleEntry.create({
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
        createdById: user.id,
        updatedById: user.id
      },
      include: {
        createdBy: true,
        updatedBy: true,
        attendances: { include: { user: true }, orderBy: [{ updatedAt: "desc" }] },
        dutyAssignment: { include: { assignedUser: true, decidedBy: true } }
      }
    });

    return NextResponse.json({
      ...saved,
      eventDate: serializeScheduleDate(saved.eventDate),
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
      dutyAssignment: null,
      attendances: saved.attendances.map((attendance) => ({
        ...attendance,
        createdAt: attendance.createdAt.toISOString(),
        updatedAt: attendance.updatedAt.toISOString()
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "スケジュール作成に失敗しました。";
    return new NextResponse(message, { status: 400 });
  }
}

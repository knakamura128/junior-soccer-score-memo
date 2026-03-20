import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeScheduleDate } from "@/lib/schedule-format";
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
  });
}

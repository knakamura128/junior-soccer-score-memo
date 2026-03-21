import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleEntryInclude, serializeScheduleEntry } from "@/lib/schedule-entry";
import { upsertLineUser } from "@/lib/upsert-line-user";
import { z } from "zod";

const bodySchema = z.object({
  idToken: z.string().min(1),
  duty: z.object({
    assignedUserId: z.string().optional().nullable(),
    note: z.string()
  })
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = bodySchema.parse(await request.json());
    const user = await upsertLineUser(parsed.idToken);

    await prisma.dutyAssignment.upsert({
      where: { scheduleEntryId: id },
      update: {
        assignedUserId: parsed.duty.assignedUserId || null,
        decidedById: user.id,
        note: parsed.duty.note || null,
        decidedAt: new Date()
      },
      create: {
        scheduleEntryId: id,
        assignedUserId: parsed.duty.assignedUserId || null,
        decidedById: user.id,
        note: parsed.duty.note || null,
        decidedAt: new Date()
      }
    });

    const entry = await prisma.scheduleEntry.findUniqueOrThrow({
      where: { id },
      include: scheduleEntryInclude
    });

    return NextResponse.json(serializeScheduleEntry(entry));
  } catch (error) {
    const message = error instanceof Error ? error.message : "当番保存に失敗しました。";
    return new NextResponse(message, { status: 400 });
  }
}

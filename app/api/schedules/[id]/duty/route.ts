import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleEntryInclude, serializeScheduleEntry } from "@/lib/schedule-entry";
import { upsertLineUser } from "@/lib/upsert-line-user";
import { buildApiErrorResponse } from "@/lib/api-error";
import { z } from "zod";

const bodySchema = z.object({
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
  dutyAssignments: z.array(
    z.object({
      gradeTag: z.string().min(1),
      assignedUserId: z.string().optional().nullable(),
      note: z.string()
    })
  ).min(1)
}).refine((value) => value.idToken || value.accessToken, {
  message: "LINEログインが必要です。"
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = bodySchema.parse(await request.json());
    const user = await upsertLineUser({ idToken: parsed.idToken, accessToken: parsed.accessToken });
    const gradeTags = Array.from(new Set(parsed.dutyAssignments.map((assignment) => assignment.gradeTag.trim()).filter(Boolean)));
    if (gradeTags.length === 0) {
      throw new Error("当番対象の学年タグが必要です。");
    }
    const assignments = gradeTags.map((gradeTag) => {
      const assignment = parsed.dutyAssignments.find((item) => item.gradeTag.trim() === gradeTag);
      return {
        gradeTag,
        assignedUserId: assignment?.assignedUserId || null,
        note: assignment?.note || null
      };
    });

    await prisma.$transaction(async (tx) => {
      await tx.dutyAssignment.deleteMany({
        where: {
          scheduleEntryId: id,
          gradeTag: { notIn: gradeTags }
        }
      });

      for (const assignment of assignments) {
        await tx.dutyAssignment.upsert({
          where: {
            scheduleEntryId_gradeTag: {
              scheduleEntryId: id,
              gradeTag: assignment.gradeTag
            }
          },
          update: {
            assignedUserId: assignment.assignedUserId,
            decidedById: user.id,
            note: assignment.note,
            decidedAt: new Date()
          },
          create: {
            scheduleEntryId: id,
            gradeTag: assignment.gradeTag,
            assignedUserId: assignment.assignedUserId,
            decidedById: user.id,
            note: assignment.note,
            decidedAt: new Date()
          }
        });
      }
    });

    const entry = await prisma.scheduleEntry.findUniqueOrThrow({
      where: { id },
      include: scheduleEntryInclude
    });

    return NextResponse.json(serializeScheduleEntry(entry));
  } catch (error) {
    return buildApiErrorResponse(error, "当番保存に失敗しました。");
  }
}

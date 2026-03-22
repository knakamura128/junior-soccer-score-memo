import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleEntryInclude, serializeScheduleEntry } from "@/lib/schedule-entry";
import { upsertLineUser } from "@/lib/upsert-line-user";
import { z } from "zod";

const authSchemaBase = z.object({
  idToken: z.string().optional(),
  accessToken: z.string().optional()
});

const authSchema = authSchemaBase.refine((value) => value.idToken || value.accessToken, {
  message: "LINEログインが必要です。"
});

const bodySchema = authSchemaBase.extend({
  carpool: z.object({
    choice: z.enum(["配車希望", "現地集合", "自家用車同乗可"])
  })
}).refine((value) => value.idToken || value.accessToken, {
  message: "LINEログインが必要です。"
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = bodySchema.parse(await request.json());
    const user = await upsertLineUser({ idToken: parsed.idToken, accessToken: parsed.accessToken });

    await prisma.carpoolPreference.upsert({
      where: {
        scheduleEntryId_userId: {
          scheduleEntryId: id,
          userId: user.id
        }
      },
      update: {
        choice: parsed.carpool.choice
      },
      create: {
        scheduleEntryId: id,
        userId: user.id,
        choice: parsed.carpool.choice
      }
    });

    const entry = await prisma.scheduleEntry.findUniqueOrThrow({
      where: { id },
      include: scheduleEntryInclude
    });

    return NextResponse.json(serializeScheduleEntry(entry));
  } catch (error) {
    const message = error instanceof Error ? error.message : "配車保存に失敗しました。";
    return new NextResponse(message, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = authSchema.parse(await request.json());
    const user = await upsertLineUser({ idToken: parsed.idToken, accessToken: parsed.accessToken });

    await prisma.carpoolPreference.deleteMany({
      where: {
        scheduleEntryId: id,
        userId: user.id
      }
    });

    const entry = await prisma.scheduleEntry.findUniqueOrThrow({
      where: { id },
      include: scheduleEntryInclude
    });

    return NextResponse.json(serializeScheduleEntry(entry));
  } catch (error) {
    const message = error instanceof Error ? error.message : "配車取消に失敗しました。";
    return new NextResponse(message, { status: 400 });
  }
}

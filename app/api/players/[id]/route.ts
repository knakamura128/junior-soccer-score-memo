import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyLineSession } from "@/lib/line-auth";
import { normalizePlayerTags } from "@/lib/player-promotion";
import { buildApiErrorResponse } from "@/lib/api-error";
import { z } from "zod";
import { normalizeOwnGoalName } from "@/lib/own-goal";

const deleteSchema = z.object({
  idToken: z.string().optional(),
  accessToken: z.string().optional()
}).refine((value) => value.idToken || value.accessToken, {
  message: "LINEログインが必要です。"
});

const updateSchema = z.object({
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
  player: z.object({
    number: z.string().optional().default(""),
    name: z.string().trim().min(1, "選手名は必須です。").transform(normalizeOwnGoalName),
    tags: z.array(z.string()).min(1, "タグを1つ以上選択してください。")
  })
}).refine((value) => value.idToken || value.accessToken, {
  message: "LINEログインが必要です。"
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = updateSchema.parse(await request.json());
    await verifyLineSession({ idToken: parsed.idToken, accessToken: parsed.accessToken });

    const player = await prisma.player.update({
      where: { id },
      data: {
        number: parsed.player.number.trim(),
        name: parsed.player.name,
        tags: normalizePlayerTags(parsed.player.name, parsed.player.tags)
      }
    });

    return NextResponse.json(player);
  } catch (error) {
    return buildPlayerErrorResponse(error, "選手更新に失敗しました。");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = deleteSchema.parse(await request.json());
    await verifyLineSession({ idToken: parsed.idToken, accessToken: parsed.accessToken });

    await prisma.player.delete({
      where: { id }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return buildApiErrorResponse(error, "選手削除に失敗しました。");
  }
}

function buildPlayerErrorResponse(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return new NextResponse(error.issues[0]?.message || fallback, { status: 400 });
  }
  return buildApiErrorResponse(error, fallback);
}

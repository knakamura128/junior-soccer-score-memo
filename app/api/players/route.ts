import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyLineSession } from "@/lib/line-auth";
import { ensureAnnualPlayerPromotion, normalizeExistingPlayers, normalizePlayerTags } from "@/lib/player-promotion";
import { buildApiErrorResponse } from "@/lib/api-error";
import { z } from "zod";
import { normalizeOwnGoalName } from "@/lib/own-goal";

const playerSchema = z.object({
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

export async function GET() {
  try {
    await normalizeExistingPlayers();
    await ensureAnnualPlayerPromotion();
    const players = await prisma.player.findMany({
      orderBy: [{ createdAt: "asc" }]
    });
    return NextResponse.json(players);
  } catch (error) {
    return buildApiErrorResponse(error, "選手一覧の読み込みに失敗しました。");
  }
}

export async function POST(request: Request) {
  try {
    const parsed = playerSchema.parse(await request.json());
    await verifyLineSession({ idToken: parsed.idToken, accessToken: parsed.accessToken });

    const player = await prisma.player.create({
      data: {
        number: parsed.player.number.trim(),
        name: parsed.player.name,
        tags: normalizePlayerTags(parsed.player.name, parsed.player.tags)
      }
    });

    return NextResponse.json(player);
  } catch (error) {
    return buildPlayerErrorResponse(error, "選手保存に失敗しました。");
  }
}

function buildPlayerErrorResponse(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return new NextResponse(error.issues[0]?.message || fallback, { status: 400 });
  }
  return buildApiErrorResponse(error, fallback);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyLineSession } from "@/lib/line-auth";
import { ensureAnnualPlayerPromotion, normalizeExistingPlayers, normalizePlayerTags } from "@/lib/player-promotion";
import { z } from "zod";

const playerSchema = z.object({
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
  player: z.object({
    number: z.string().min(1),
    name: z.string().min(1),
    tags: z.array(z.string()).min(1)
  })
}).refine((value) => value.idToken || value.accessToken, {
  message: "LINEログインが必要です。"
});

export async function GET() {
  await normalizeExistingPlayers();
  await ensureAnnualPlayerPromotion();
  const players = await prisma.player.findMany({
    orderBy: [{ createdAt: "asc" }]
  });
  return NextResponse.json(players);
}

export async function POST(request: Request) {
  const parsed = playerSchema.parse(await request.json());
  await verifyLineSession({ idToken: parsed.idToken, accessToken: parsed.accessToken });

  const player = await prisma.player.create({
    data: {
      number: parsed.player.number,
      name: parsed.player.name,
      tags: normalizePlayerTags(parsed.player.name, parsed.player.tags)
    }
  });

  return NextResponse.json(player);
}

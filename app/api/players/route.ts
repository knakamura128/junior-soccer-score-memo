import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyLineIdToken } from "@/lib/line-auth";
import { ensureAnnualPlayerPromotion } from "@/lib/player-promotion";
import { z } from "zod";

const playerSchema = z.object({
  idToken: z.string().min(1),
  player: z.object({
    number: z.string().min(1),
    name: z.string().min(1),
    tags: z.array(z.string()).min(1)
  })
});

export async function GET() {
  await ensureAnnualPlayerPromotion();
  const players = await prisma.player.findMany({
    orderBy: [{ createdAt: "asc" }]
  });
  return NextResponse.json(players);
}

export async function POST(request: Request) {
  const parsed = playerSchema.parse(await request.json());
  await verifyLineIdToken(parsed.idToken);

  const player = await prisma.player.create({
    data: {
      number: parsed.player.number,
      name: parsed.player.name,
      tags: parsed.player.tags
    }
  });

  return NextResponse.json(player);
}

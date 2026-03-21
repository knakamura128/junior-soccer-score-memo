import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyLineIdToken } from "@/lib/line-auth";
import { calculateOutcome } from "@/lib/match-format";
import { z } from "zod";

const bodySchema = z.object({
  idToken: z.string().min(1),
  match: z.object({
    tournament: z.string(),
    title: z.string(),
    opponent: z.string(),
    tags: z.array(z.string()),
    matchDate: z.string(),
    periodMode: z.enum(["halves", "single"]),
    pkMode: z.enum(["off", "on"]),
    homePkScore: z.number(),
    awayPkScore: z.number(),
    homeScore: z.number(),
    awayScore: z.number(),
    duration: z.string(),
    events: z.array(
      z.object({
        side: z.enum(["home", "away"]),
        player: z.string(),
        period: z.string(),
        time: z.string()
      })
    )
  })
});

const deleteSchema = z.object({
  idToken: z.string().min(1)
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = bodySchema.parse(await request.json());
  const profile = await verifyLineIdToken(parsed.idToken);

  const user = await prisma.user.upsert({
    where: { lineUserId: profile.lineUserId },
    update: { displayName: profile.displayName, pictureUrl: profile.pictureUrl },
    create: {
      lineUserId: profile.lineUserId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl
    }
  });

  const outcome = calculateOutcome(parsed.match);

  const updated = await prisma.match.update({
    where: { id },
    data: {
      tournament: parsed.match.tournament || "未設定",
      title: parsed.match.title || "無題の試合",
      opponent: parsed.match.opponent,
      tags: parsed.match.tags,
      matchDate: new Date(`${parsed.match.matchDate}T00:00:00+09:00`),
      periodMode: parsed.match.periodMode,
      pkMode: parsed.match.pkMode,
      homePkScore: parsed.match.homePkScore,
      awayPkScore: parsed.match.awayPkScore,
      homeScore: parsed.match.homeScore,
      awayScore: parsed.match.awayScore,
      duration: parsed.match.duration,
      outcome,
      updatedById: user.id,
      goals: {
        deleteMany: {},
        create: parsed.match.events.map((event) => ({
          side: event.side,
          player: event.player || null,
          period: event.period,
          time: event.time
        }))
      }
    },
    include: {
      goals: true,
      createdBy: true,
      updatedBy: true
    }
  });

  return NextResponse.json({
    ...updated,
    matchDate: updated.matchDate.toISOString().slice(0, 10)
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = deleteSchema.parse(await request.json());
    await verifyLineIdToken(parsed.idToken);

    await prisma.match.delete({
      where: { id }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "試合結果削除に失敗しました。";
    return new NextResponse(message, { status: 400 });
  }
}

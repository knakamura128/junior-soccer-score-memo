import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyLineSession } from "@/lib/line-auth";

const HANDOFF_TTL_MS = 10 * 60 * 1000;

const createSchema = z.object({
  id: z.string().uuid(),
  returnTo: z.string().min(1).max(500).refine((value) => value.startsWith("/") && !value.startsWith("//"), {
    message: "戻り先URLが不正です。"
  })
});

const completeSchema = createSchema.extend({
  idToken: z.string().optional(),
  accessToken: z.string().optional()
}).refine((value) => value.idToken || value.accessToken, {
  message: "LINEログインが必要です。"
});

export async function POST(request: Request) {
  try {
    const parsed = createSchema.parse(await request.json());
    await deleteExpiredHandoffs();

    await prisma.lineLoginHandoff.upsert({
      where: { id: parsed.id },
      update: {
        returnTo: parsed.returnTo,
        idToken: null,
        accessToken: null,
        lineUserId: null,
        displayName: null,
        pictureUrl: null,
        completedAt: null,
        consumedAt: null,
        expiresAt: new Date(Date.now() + HANDOFF_TTL_MS)
      },
      create: {
        id: parsed.id,
        returnTo: parsed.returnTo,
        expiresAt: new Date(Date.now() + HANDOFF_TTL_MS)
      }
    });

    return NextResponse.json({ status: "pending" });
  } catch (error) {
    return buildErrorResponse(error, "LINEログインの準備に失敗しました。");
  }
}

export async function PATCH(request: Request) {
  try {
    const parsed = completeSchema.parse(await request.json());
    const handoff = await prisma.lineLoginHandoff.findUnique({ where: { id: parsed.id } });
    if (!handoff || handoff.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ status: "expired" }, { status: 410 });
    }

    const profile = await verifyLineSession({ idToken: parsed.idToken, accessToken: parsed.accessToken });
    await prisma.lineLoginHandoff.update({
      where: { id: parsed.id },
      data: {
        returnTo: parsed.returnTo,
        idToken: parsed.idToken || null,
        accessToken: parsed.accessToken || null,
        lineUserId: profile.lineUserId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        completedAt: new Date(),
        consumedAt: null
      }
    });

    return NextResponse.json({ status: "completed" });
  } catch (error) {
    return buildErrorResponse(error, "LINEログインの完了に失敗しました。");
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ status: "missing" }, { status: 400 });
  }

  await deleteExpiredHandoffs();

  const handoff = await prisma.lineLoginHandoff.findUnique({ where: { id } });
  if (!handoff) {
    return NextResponse.json({ status: "missing" }, { status: 404 });
  }
  if (handoff.consumedAt) {
    return NextResponse.json({ status: "consumed" }, { status: 410 });
  }
  if (handoff.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ status: "expired" }, { status: 410 });
  }
  if (!handoff.completedAt || (!handoff.idToken && !handoff.accessToken)) {
    return NextResponse.json({ status: "pending" });
  }

  await prisma.lineLoginHandoff.update({
    where: { id },
    data: { consumedAt: new Date() }
  });

  return NextResponse.json({
    status: "completed",
    idToken: handoff.idToken || "",
    accessToken: handoff.accessToken || "",
    displayName: handoff.displayName || "LINE user",
    pictureUrl: handoff.pictureUrl || undefined,
    lineUserId: handoff.lineUserId || undefined
  });
}

async function deleteExpiredHandoffs() {
  await prisma.lineLoginHandoff.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  });
}

function buildErrorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return new NextResponse(message || fallback, { status: 400 });
}

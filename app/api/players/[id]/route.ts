import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyLineIdToken } from "@/lib/line-auth";
import { z } from "zod";

const deleteSchema = z.object({
  idToken: z.string().min(1)
});

const updateSchema = z.object({
  idToken: z.string().min(1),
  player: z.object({
    number: z.string().min(1),
    name: z.string().min(1),
    tags: z.array(z.string()).min(1)
  })
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = updateSchema.parse(await request.json());
  await verifyLineIdToken(parsed.idToken);

  const player = await prisma.player.update({
    where: { id },
    data: {
      number: parsed.player.number,
      name: parsed.player.name,
      tags: parsed.player.tags
    }
  });

  return NextResponse.json(player);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = deleteSchema.parse(await request.json());
  await verifyLineIdToken(parsed.idToken);

  await prisma.player.delete({
    where: { id }
  });

  return NextResponse.json({ ok: true });
}

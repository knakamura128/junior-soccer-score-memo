import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyLineIdToken } from "@/lib/line-auth";
import { z } from "zod";

const deleteSchema = z.object({
  idToken: z.string().min(1)
});

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = deleteSchema.parse(await request.json());
  await verifyLineIdToken(parsed.idToken);

  await prisma.player.delete({
    where: { id }
  });

  return NextResponse.json({ ok: true });
}

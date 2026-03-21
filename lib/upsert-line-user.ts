import { prisma } from "@/lib/prisma";
import { type LineAuthPayload, verifyLineSession } from "@/lib/line-auth";

export async function upsertLineUser(auth: LineAuthPayload) {
  const profile = await verifyLineSession(auth);

  return prisma.user.upsert({
    where: { lineUserId: profile.lineUserId },
    update: {
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl
    },
    create: {
      lineUserId: profile.lineUserId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl
    }
  });
}

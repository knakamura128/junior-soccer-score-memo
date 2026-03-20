import { prisma } from "@/lib/prisma";
import { verifyLineIdToken } from "@/lib/line-auth";

export async function upsertLineUser(idToken: string) {
  const profile = await verifyLineIdToken(idToken);

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

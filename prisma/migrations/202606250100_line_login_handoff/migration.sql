CREATE TABLE "LineLoginHandoff" (
    "id" TEXT NOT NULL,
    "returnTo" TEXT NOT NULL,
    "idToken" TEXT,
    "accessToken" TEXT,
    "lineUserId" TEXT,
    "displayName" TEXT,
    "pictureUrl" TEXT,
    "completedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineLoginHandoff_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LineLoginHandoff_expiresAt_idx" ON "LineLoginHandoff"("expiresAt");

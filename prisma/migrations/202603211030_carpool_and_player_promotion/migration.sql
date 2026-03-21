-- CreateTable
CREATE TABLE "CarpoolPreference" (
    "id" TEXT NOT NULL,
    "scheduleEntryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarpoolPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerPromotionRun" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerPromotionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CarpoolPreference_scheduleEntryId_userId_key" ON "CarpoolPreference"("scheduleEntryId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerPromotionRun_year_key" ON "PlayerPromotionRun"("year");

-- AddForeignKey
ALTER TABLE "CarpoolPreference" ADD CONSTRAINT "CarpoolPreference_scheduleEntryId_fkey" FOREIGN KEY ("scheduleEntryId") REFERENCES "ScheduleEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarpoolPreference" ADD CONSTRAINT "CarpoolPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

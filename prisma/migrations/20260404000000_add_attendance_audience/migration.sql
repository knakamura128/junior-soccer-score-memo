DO $$
BEGIN
  CREATE TYPE "AttendanceAudience" AS ENUM ('PARENT', 'COACH');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Attendance"
ADD COLUMN IF NOT EXISTS "audience" "AttendanceAudience" NOT NULL DEFAULT 'PARENT';

ALTER TABLE "Attendance"
DROP CONSTRAINT IF EXISTS "Attendance_scheduleEntryId_userId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_scheduleEntryId_userId_audience_key"
ON "Attendance"("scheduleEntryId", "userId", "audience");

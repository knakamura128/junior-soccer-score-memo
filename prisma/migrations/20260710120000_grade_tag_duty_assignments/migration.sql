ALTER TABLE "DutyAssignment" ADD COLUMN "gradeTag" TEXT NOT NULL DEFAULT '全体';

UPDATE "DutyAssignment"
SET "gradeTag" = CASE
  WHEN "ScheduleEntry"."tags" @> ARRAY['キッズ']::TEXT[] THEN 'キッズ'
  WHEN "ScheduleEntry"."tags" @> ARRAY['1年']::TEXT[] THEN '1年'
  WHEN "ScheduleEntry"."tags" @> ARRAY['2年']::TEXT[] THEN '2年'
  WHEN "ScheduleEntry"."tags" @> ARRAY['低学年']::TEXT[] THEN '低学年'
  WHEN "ScheduleEntry"."tags" @> ARRAY['3年']::TEXT[] THEN '3年'
  WHEN "ScheduleEntry"."tags" @> ARRAY['4年']::TEXT[] THEN '4年'
  WHEN "ScheduleEntry"."tags" @> ARRAY['中学年']::TEXT[] THEN '中学年'
  WHEN "ScheduleEntry"."tags" @> ARRAY['5年']::TEXT[] THEN '5年'
  WHEN "ScheduleEntry"."tags" @> ARRAY['6年']::TEXT[] THEN '6年'
  WHEN "ScheduleEntry"."tags" @> ARRAY['高学年']::TEXT[] THEN '高学年'
  ELSE '全体'
END
FROM "ScheduleEntry"
WHERE "DutyAssignment"."scheduleEntryId" = "ScheduleEntry"."id";

DROP INDEX "DutyAssignment_scheduleEntryId_key";

CREATE UNIQUE INDEX "DutyAssignment_scheduleEntryId_gradeTag_key" ON "DutyAssignment"("scheduleEntryId", "gradeTag");

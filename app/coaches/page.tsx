import { prisma } from "@/lib/prisma";
import { ScheduleDashboard } from "@/components/schedule-dashboard";
import { scheduleEntryInclude, serializeScheduleEntry } from "@/lib/schedule-entry";

export const dynamic = "force-dynamic";

async function getInitialData() {
  const schedules = await prisma.scheduleEntry.findMany({
    include: scheduleEntryInclude,
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }, { createdAt: "asc" }]
  });

  return {
    schedules: schedules.map(serializeScheduleEntry)
  };
}

export default async function CoachesPage() {
  const initialData = await getInitialData();
  return <ScheduleDashboard initialData={initialData} audience="coach" />;
}

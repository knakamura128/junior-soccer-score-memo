import { ScheduleDashboard } from "@/components/schedule-dashboard";
import { getScheduleInitialData } from "@/lib/schedule-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialData = await getScheduleInitialData();
  return <ScheduleDashboard initialData={initialData} audience="parent" />;
}

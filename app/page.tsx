import { prisma } from "@/lib/prisma";
import { ScheduleDashboard } from "@/components/schedule-dashboard";

export const dynamic = "force-dynamic";

async function getInitialData() {
  const schedules = await prisma.scheduleEntry.findMany({
    include: {
      createdBy: true,
      updatedBy: true,
      attendances: {
        include: { user: true },
        orderBy: [{ updatedAt: "desc" }]
      },
      dutyAssignment: {
        include: {
          assignedUser: true,
          decidedBy: true
        }
      }
    },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }, { createdAt: "asc" }]
  });

  return {
    schedules: schedules.map((entry) => ({
      ...entry,
      eventDate: entry.eventDate.toISOString().slice(0, 10),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      dutyAssignment: entry.dutyAssignment
        ? {
            ...entry.dutyAssignment,
            decidedAt: entry.dutyAssignment.decidedAt?.toISOString() || null,
            createdAt: entry.dutyAssignment.createdAt.toISOString(),
            updatedAt: entry.dutyAssignment.updatedAt.toISOString()
          }
        : null,
      attendances: entry.attendances.map((attendance) => ({
        ...attendance,
        createdAt: attendance.createdAt.toISOString(),
        updatedAt: attendance.updatedAt.toISOString()
      }))
    }))
  };
}

export default async function Page() {
  const initialData = await getInitialData();
  return <ScheduleDashboard initialData={initialData} />;
}

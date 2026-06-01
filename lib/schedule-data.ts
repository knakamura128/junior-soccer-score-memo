import { prisma } from "@/lib/prisma";
import { scheduleEntryInclude, serializeScheduleEntry } from "@/lib/schedule-entry";

export async function getScheduleInitialData() {
  try {
    const schedules = await prisma.scheduleEntry.findMany({
      include: scheduleEntryInclude,
      orderBy: [{ eventDate: "asc" }, { startTime: "asc" }, { createdAt: "asc" }]
    });

    return {
      schedules: schedules.map(serializeScheduleEntry)
    };
  } catch {
    console.warn("Failed to load schedule data from database. Falling back to empty schedule data.");
    return {
      schedules: [],
      dataLoadError: "DBに接続できないため、空データで表示しています。保存や更新にはDB接続が必要です。"
    };
  }
}

import { Prisma } from "@prisma/client";
import { serializeScheduleDate } from "@/lib/schedule-format";

export const scheduleEntryInclude = Prisma.validator<Prisma.ScheduleEntryInclude>()({
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
  },
  carpoolPreferences: {
    include: { user: true },
    orderBy: [{ updatedAt: "desc" }]
  }
});

type ScheduleEntryWithRelations = Prisma.ScheduleEntryGetPayload<{
  include: typeof scheduleEntryInclude;
}>;

const EDITED_FIELD_HIGHLIGHT_DAYS = 10;
const EDITED_FIELD_HIGHLIGHT_MS = EDITED_FIELD_HIGHLIGHT_DAYS * 24 * 60 * 60 * 1000;

export function serializeScheduleEntry(entry: ScheduleEntryWithRelations) {
  return {
    ...entry,
    eventDate: serializeScheduleDate(entry.eventDate),
    editedFields: shouldHighlightEditedFields(entry.updatedAt) ? entry.editedFields : [],
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
    })),
    carpoolPreferences: entry.carpoolPreferences.map((preference) => ({
      ...preference,
      createdAt: preference.createdAt.toISOString(),
      updatedAt: preference.updatedAt.toISOString()
    }))
  };
}

function shouldHighlightEditedFields(updatedAt: Date) {
  return Date.now() - updatedAt.getTime() < EDITED_FIELD_HIGHLIGHT_MS;
}

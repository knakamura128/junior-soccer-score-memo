import { Prisma } from "@prisma/client";
import { serializeScheduleDate } from "@/lib/schedule-format";

export const scheduleEntryInclude = Prisma.validator<Prisma.ScheduleEntryInclude>()({
  createdBy: true,
  updatedBy: true,
  attendances: {
    include: { user: true },
    orderBy: [{ updatedAt: "desc" }]
  },
  dutyAssignments: {
    include: {
      assignedUser: true,
      decidedBy: true
    },
    orderBy: [{ gradeTag: "asc" }]
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
    dutyAssignments: entry.dutyAssignments.map((assignment) => ({
      ...assignment,
      decidedAt: assignment.decidedAt?.toISOString() || null,
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString()
    })),
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

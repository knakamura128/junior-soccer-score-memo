type CalendarSchedule = {
  id: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  content: string;
  tags: string[];
  note?: string | null;
};

export function buildScheduleIcs(schedules: CalendarSchedule[]) {
  const stamp = formatDateTimeUtc(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FC KUMANO//Schedule Export//JA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];

  for (const schedule of schedules) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeIcsText(`${schedule.id}@fc-kumano-schedule`)}`);
    lines.push(`DTSTAMP:${stamp}`);

    if (isTimedEvent(schedule.startTime, schedule.endTime)) {
      lines.push(`DTSTART;TZID=Asia/Tokyo:${formatLocalDateTime(schedule.eventDate, schedule.startTime)}`);
      lines.push(`DTEND;TZID=Asia/Tokyo:${formatLocalDateTime(schedule.eventDate, schedule.endTime)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(schedule.eventDate)}`);
      lines.push(`DTEND;VALUE=DATE:${formatDateOnly(addOneDay(schedule.eventDate))}`);
    }

    lines.push(`SUMMARY:${escapeIcsText(schedule.content)}`);
    lines.push(`LOCATION:${escapeIcsText(schedule.location)}`);
    lines.push(
      `DESCRIPTION:${escapeIcsText(
        [`学年: ${schedule.tags.join(" / ")}`, schedule.note ? `備考: ${schedule.note}` : ""].filter(Boolean).join("\\n")
      )}`
    );
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function isTimedEvent(startTime: string, endTime: string) {
  return startTime !== "-" && endTime !== "-" && startTime !== "" && endTime !== "";
}

function formatDateOnly(value: string) {
  return value.replaceAll("-", "");
}

function addOneDay(value: string) {
  const date = new Date(`${value}T00:00:00+09:00`);
  date.setUTCDate(date.getUTCDate() + 1);
  return formatDateParts(date);
}

function formatLocalDateTime(date: string, time: string) {
  const [hours = "00", minutes = "00"] = time.split(":");
  return `${formatDateOnly(date)}T${hours.padStart(2, "0")}${minutes.padStart(2, "0")}00`;
}

function formatDateTimeUtc(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function formatDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}

function escapeIcsText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll(",", "\\,").replaceAll("\n", "\\n");
}

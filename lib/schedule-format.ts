import { CATEGORY_OPTIONS } from "@/lib/match-format";
import { parseCsv } from "@/lib/csv";

export const SCHEDULE_TAG_OPTIONS = CATEGORY_OPTIONS;
export const ATTENDANCE_STATUSES = ["参加", "欠席", "未定"] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export type SchedulePayload = {
  eventDate: string;
  tags: string[];
  startTime: string;
  endTime: string;
  location: string;
  content: string;
  dutyLabel: string;
  isMatch: boolean;
  note: string;
};

export function createEmptySchedule(date?: string): SchedulePayload {
  return {
    eventDate: date || new Date().toISOString().slice(0, 10),
    tags: [],
    startTime: "09:00",
    endTime: "11:00",
    location: "",
    content: "",
    dutyLabel: "",
    isMatch: false,
    note: ""
  };
}

export function serializeScheduleDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatTimeRange(startTime: string, endTime: string) {
  return [startTime, endTime].filter(Boolean).join(" - ");
}

export function inferIsMatch(content: string) {
  return /(試合|大会|vs|ＶＳ|VS)/i.test(content);
}

export function extractOpponentFromContent(content: string) {
  const match = content.match(/vs[.\s\/]*([^\s/].*)$/i);
  if (!match) {
    return "";
  }
  const candidate = match[1].split(/[、,]/)[0]?.trim() || "";
  if (/未定/.test(candidate)) {
    return "";
  }
  return candidate;
}

export function contentToMatchTitle(content: string) {
  return content.replace(/\s+/g, " ").trim() || "スケジュール連携";
}

export function normalizeScheduleTags(value: string) {
  return value
    .split(/[、,/／\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => {
      if (SCHEDULE_TAG_OPTIONS.includes(item as (typeof SCHEDULE_TAG_OPTIONS)[number])) {
        return [item];
      }
      if (item === "1-2年") return ["低学年", "1年", "2年"];
      if (item === "3-4年") return ["中学年", "3年", "4年"];
      if (item === "4-5-6年") return ["高学年", "4年", "5年", "6年"];
      if (item === "5-6年") return ["高学年", "5年", "6年"];
      if (/^[1-6]年$/.test(item)) return [item];
      if (item.includes("低")) return ["低学年"];
      if (item.includes("中")) return ["中学年"];
      if (item.includes("高")) return ["高学年"];
      return [];
    })
    .filter((tag, index, array) => array.indexOf(tag) === index);
}

export function parseScheduleCsv(text: string) {
  const normalizedText = text.replace(/^\uFEFF/, "").replaceAll("\t", ",");
  const rows = parseCsv(normalizedText);
  const [headers = [], ...body] = rows.filter((row) => row.some((cell) => cell.trim() !== ""));
  const index = new Map(headers.map((header, headerIndex) => [header.trim(), headerIndex]));

  return body
    .map((row) => {
      const rawDate = readCell(row, index, ["日付", "date"]);
      const rawTags = readCell(row, index, ["学年", "タグ", "grade"]);
      const rawTime = readCell(row, index, ["時間", "time"]);
      const rawLocation = readCell(row, index, ["場所", "location"]);
      const rawContent = readCell(row, index, ["内容", "予定", "content"]);
      const rawDuty = readCell(row, index, ["登板", "当番", "duty"]);
      const rawNote = readCell(row, index, ["備考", "note"]);
      const rawMatch = readCell(row, index, ["試合", "isMatch"]);

      const [startTime = "09:00", endTime = "11:00"] = rawTime
        .replace(/[〜~]/g, "-")
        .split("-")
        .map((item) => item.trim())
        .filter(Boolean);

      return {
        eventDate: normalizeImportedDate(rawDate),
        tags: normalizeScheduleTags(rawTags),
        startTime,
        endTime,
        location: rawLocation,
        content: rawContent,
        dutyLabel: rawDuty,
        note: rawNote,
        isMatch: rawMatch ? /^(1|true|yes|試合)$/i.test(rawMatch) : inferIsMatch(rawContent)
      } satisfies SchedulePayload;
    })
    .filter((entry) => entry.eventDate && entry.content);
}

function readCell(row: string[], index: Map<string, number>, keys: string[]) {
  for (const key of keys) {
    const found = index.get(key);
    if (found !== undefined) {
      return (row[found] || "").trim();
    }
  }
  return "";
}

function normalizeImportedDate(value: string) {
  if (!value) {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    const year = new Date().getFullYear();
    return `${year}-${slashMatch[1].padStart(2, "0")}-${slashMatch[2].padStart(2, "0")}`;
  }
  const fullSlashMatch = value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (fullSlashMatch) {
    return `${fullSlashMatch[1]}-${fullSlashMatch[2].padStart(2, "0")}-${fullSlashMatch[3].padStart(2, "0")}`;
  }
  return value;
}

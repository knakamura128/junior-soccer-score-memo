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
    eventDate: date || getCurrentTokyoDate(),
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
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return formatter.format(date);
}

export function getCurrentTokyoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function getCurrentTokyoMonth() {
  return getCurrentTokyoDate().slice(0, 7);
}

export function formatTimeRange(startTime: string, endTime: string) {
  if ((startTime === "-" || !startTime) && (endTime === "-" || !endTime)) {
    return "-";
  }
  if (startTime === "-" && endTime) {
    return endTime;
  }
  if (endTime === "-" && startTime) {
    return startTime;
  }
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
  const source = String(value).trim();
  const tags = new Set<string>();

  if (!source) {
    return [];
  }

  if (source.includes("キッズ")) {
    tags.add("キッズ");
  }
  if (source.includes("低")) {
    tags.add("低学年");
  }
  if (source.includes("中")) {
    tags.add("中学年");
  }
  if (source.includes("高")) {
    tags.add("高学年");
  }

  for (const option of SCHEDULE_TAG_OPTIONS) {
    if (source.includes(option)) {
      tags.add(option);
    }
  }

  const rangeMatches = Array.from(source.matchAll(/([1-6])\s*[〜~\-]\s*([1-6])年/g));
  for (const match of rangeMatches) {
    addGradeRange(tags, Number(match[1]), Number(match[2]));
  }

  const dotMatches = Array.from(source.matchAll(/([1-6](?:\s*・\s*[1-6])+)(?:年)?/g));
  for (const match of dotMatches) {
    const grades = match[1]
      .split("・")
      .map((item) => Number(item.trim()))
      .filter((grade) => grade >= 1 && grade <= 6);
    for (const grade of grades) {
      addGrade(tags, grade);
    }
  }

  const singleGradeMatches = Array.from(source.matchAll(/([1-6])年/g));
  for (const match of singleGradeMatches) {
    addGrade(tags, Number(match[1]));
  }

  return [...tags];
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

      const normalizedTime = rawTime.trim();
      let startTime = "09:00";
      let endTime = "11:00";

      if (normalizedTime === "-") {
        startTime = "-";
        endTime = "-";
      } else {
        const parts = normalizedTime
          .replace(/[〜~]/g, "-")
          .split("-")
          .map((item) => item.trim())
          .filter(Boolean);

        if (parts.length >= 2) {
          [startTime, endTime] = parts;
        } else if (parts.length === 1) {
          startTime = parts[0];
          endTime = "-";
        }
      }

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
    const year = Number(getCurrentTokyoDate().slice(0, 4));
    return `${year}-${slashMatch[1].padStart(2, "0")}-${slashMatch[2].padStart(2, "0")}`;
  }
  const fullSlashMatch = value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (fullSlashMatch) {
    return `${fullSlashMatch[1]}-${fullSlashMatch[2].padStart(2, "0")}-${fullSlashMatch[3].padStart(2, "0")}`;
  }
  return value;
}

function addGradeRange(tags: Set<string>, from: number, to: number) {
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  for (let grade = start; grade <= end; grade += 1) {
    addGrade(tags, grade);
  }
}

function addGrade(tags: Set<string>, grade: number) {
  const label = `${grade}年`;
  tags.add(label);
  if (grade <= 2) {
    tags.add("低学年");
  } else if (grade <= 4) {
    tags.add("中学年");
  } else {
    tags.add("高学年");
  }
}

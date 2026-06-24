import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getScheduleTagFilterCandidates, serializeScheduleDate } from "@/lib/schedule-format";

export const dynamic = "force-dynamic";

type ScheduleImagePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const ROW_TAG_ORDER = ["キッズ", "1年", "2年", "3年", "4年", "5年", "6年"] as const;
const BADGE_TAG_ORDER = ["低学年", "中学年", "高学年", "キッズ", "1年", "2年", "3年", "4年", "5年", "6年"] as const;

export default async function ScheduleImagePage({ searchParams }: ScheduleImagePageProps) {
  const params = searchParams ? await searchParams : {};
  const month = typeof params.month === "string" && /^\d{4}-\d{2}$/.test(params.month) ? params.month : getCurrentTokyoMonth();
  const tag = typeof params.tag === "string" ? params.tag : "すべて";
  const audience = typeof params.audience === "string" && params.audience === "coach" ? "coach" : "parent";
  const rows = await getScheduleRows(month, tag);

  return (
    <main className="schedule-image-page">
      <header className="schedule-image-header">
        <div>
          <p>FC KUMANO</p>
          <h1>予定表（{formatMonthTitle(month)}）</h1>
        </div>
        <Link className="ghost link-chip" href={audience === "coach" ? "/coaches" : "/"}>
          戻る
        </Link>
      </header>
      <div className="schedule-image-note">
        <span>表示対象: {tag === "すべて" ? "すべて" : tag}</span>
        <span>活動時間や集合時間は内容欄も確認してください。</span>
      </div>
      <div className="table-wrap schedule-table-wrap is-image schedule-image-table-wrap">
        <table className="results-table schedule-results-table is-image">
          <thead>
            <tr>
              <th>日付</th>
              <th>学年</th>
              <th>時間</th>
              <th>場所</th>
              <th>内容</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>この月の予定はまだありません。</td>
              </tr>
            ) : (
              rows.map((entry, index) => {
                const previous = rows[index - 1];
                const isDateGroupStart = !previous || previous.eventDate !== entry.eventDate;
                return (
                  <tr key={entry.id} className={isDateGroupStart ? "schedule-date-group-start" : "schedule-date-group-continue"}>
                    <td>{renderDate(entry.eventDate)}</td>
                    <td>{sortTags(entry.tags).join("・")}</td>
                    <td>{formatRange(entry.startTime, entry.endTime)}</td>
                    <td>{entry.location}</td>
                    <td>
                      {entry.content}
                      {entry.note ? <span className="schedule-image-note-inline"> {entry.note}</span> : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

async function getScheduleRows(month: string, tag: string) {
  const monthStart = new Date(`${month}-01T00:00:00+09:00`);
  const nextMonth = new Date(monthStart);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const tagCandidates = getScheduleTagFilterCandidates(tag);
  try {
    const rows = await prisma.scheduleEntry.findMany({
      where: {
        eventDate: {
          gte: monthStart,
          lt: nextMonth
        },
        ...(tagCandidates.length > 0 ? { tags: { hasSome: tagCandidates } } : {})
      },
      orderBy: [{ eventDate: "asc" }, { startTime: "asc" }, { createdAt: "asc" }]
    });

    return rows
      .map((entry) => ({
        id: entry.id,
        eventDate: serializeScheduleDate(entry.eventDate),
        tags: entry.tags,
        startTime: entry.startTime,
        endTime: entry.endTime,
        location: entry.location,
        content: entry.content,
        note: entry.note
      }))
      .sort((left, right) => {
        const dateCompare = left.eventDate.localeCompare(right.eventDate);
        if (dateCompare !== 0) return dateCompare;
        const timeCompare = compareStartTime(left.startTime, right.startTime);
        if (timeCompare !== 0) return timeCompare;
        const tagCompare = primaryTagRank(left.tags) - primaryTagRank(right.tags);
        if (tagCompare !== 0) return tagCompare;
        return left.content.localeCompare(right.content, "ja");
      });
  } catch {
    console.warn("Failed to load schedule image data from database. Falling back to empty schedule data.");
    return [];
  }
}

function getCurrentTokyoMonth() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
    .format(new Date())
    .slice(0, 7);
}

function formatMonthTitle(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${year}年${Number(monthNumber)}月`;
}

function renderDate(value: string) {
  const date = new Date(`${value}T00:00:00+09:00`);
  const day = new Intl.DateTimeFormat("ja-JP", { day: "numeric" }).format(date);
  const weekday = new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(date);
  return `${day} (${weekday})`;
}

function formatRange(startTime: string, endTime: string) {
  const start = normalizeClock(startTime);
  const end = normalizeClock(endTime);
  if ((start === "-" || !start) && (end === "-" || !end)) return "-";
  if (start === "-" && end) return end;
  if (end === "-" && start) return start;
  if (start === end) return start;
  return `${start}〜${end}`;
}

function compareStartTime(left: string, right: string) {
  const normalize = (value: string) => (!value || value === "-" ? "99:99" : normalizeClock(value));
  return normalize(left).localeCompare(normalize(right));
}

function normalizeClock(value: string) {
  if (!value || value === "-") return value;
  const match = value.trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return value;
  const [, hours, minutes] = match;
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

function primaryTagRank(tags: string[]) {
  const sorted = [...tags].sort((left, right) => rowTagRank(left) - rowTagRank(right));
  return rowTagRank(sorted[0] || "");
}

function rowTagRank(tag: string) {
  const index = ROW_TAG_ORDER.indexOf(tag as (typeof ROW_TAG_ORDER)[number]);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function sortTags(tags: string[]) {
  return [...tags].sort((left, right) => {
    const leftIndex = BADGE_TAG_ORDER.indexOf(left as (typeof BADGE_TAG_ORDER)[number]);
    const rightIndex = BADGE_TAG_ORDER.indexOf(right as (typeof BADGE_TAG_ORDER)[number]);
    if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right, "ja");
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });
}

export const CATEGORY_OPTIONS = ["キッズ", "低学年", "中学年", "高学年", "1年", "2年", "3年", "4年", "5年", "6年"] as const;

export function serializeMatchDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function getCurrentTokyoDate() {
  return serializeMatchDate(new Date());
}

export function getCurrentTokyoMonth() {
  return getCurrentTokyoDate().slice(0, 7);
}

export type MatchPayload = {
  id?: string;
  tournament: string;
  title: string;
  opponent: string;
  tags: string[];
  matchDate: string;
  periodMode: "halves" | "single";
  currentPeriod: string;
  pkMode: "off" | "on";
  homePkScore: number;
  awayPkScore: number;
  homeScore: number;
  awayScore: number;
  duration: string;
  events: Array<{
    side: "home" | "away";
    player: string;
    period: string;
    time: string;
  }>;
};

export type PlayerPayload = {
  id?: string;
  number: string;
  name: string;
  tags: string[];
};

export function calculateOutcome(match: {
  homeScore: number;
  awayScore: number;
  pkMode: string;
  homePkScore: number;
  awayPkScore: number;
}): string {
  if (match.homeScore > match.awayScore) {
    return "勝ち";
  }
  if (match.homeScore < match.awayScore) {
    return "負け";
  }
  if (match.pkMode === "on") {
    if (match.homePkScore > match.awayPkScore) {
      return "勝ち";
    }
    if (match.homePkScore < match.awayPkScore) {
      return "負け";
    }
  }
  return "引き分け";
}

export function gradeToTags(value: string): string[] {
  const source = String(value);
  const tags = new Set<string>();
  if (source.includes("低")) tags.add("低学年");
  if (source.includes("中")) tags.add("中学年");
  if (source.includes("高")) tags.add("高学年");
  const gradeMatch = source.match(/([1-6])年/);
  if (gradeMatch) {
    const grade = `${gradeMatch[1]}年`;
    tags.add(grade);
    if (grade === "1年" || grade === "2年") tags.add("低学年");
    if (grade === "3年" || grade === "4年") tags.add("中学年");
    if (grade === "5年" || grade === "6年") tags.add("高学年");
  }
  return [...tags];
}

export function parseScoreText(value: string) {
  const normalized = String(value).replace(/\s+/g, "");
  const match = normalized.match(/^(\d+)-(\d+)(?:\(PK(\d+)-(\d+)\))?$/i);
  if (!match) {
    return { homeScore: 0, awayScore: 0, pkMode: "off" as const, homePkScore: 0, awayPkScore: 0 };
  }
  return {
    homeScore: Number(match[1]),
    awayScore: Number(match[2]),
    pkMode: match[3] ? ("on" as const) : ("off" as const),
    homePkScore: Number(match[3] || 0),
    awayPkScore: Number(match[4] || 0)
  };
}

export function expandScorers(value: string): string[] {
  return String(value)
    .split(/[、,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => {
      const cleaned = item.replace(/^[①②③④⑤]/u, "");
      const match = cleaned.match(/^(.*?)[×xX](\d+)$/);
      if (!match) {
        return [cleaned];
      }
      return Array.from({ length: Number(match[2]) }, () => match[1].trim());
    });
}

export function splitTournamentAndTitle(value: string) {
  const parts = String(value).split("/").map((item) => item.trim()).filter(Boolean);
  return {
    tournament: parts[0] || value || "未設定",
    title: parts[1] || value || "無題の試合"
  };
}

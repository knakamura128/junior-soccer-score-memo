import { escapeCsvCell, parseCsv } from "@/lib/csv";
import {
  expandScorers,
  getCurrentTokyoDate,
  gradeToTags,
  parseScoreText,
  splitTournamentAndTitle,
  type MatchPayload
} from "@/lib/match-format";

type MatchLike = {
  tournament: string;
  title: string;
  opponent: string;
  tags: string[];
  matchDate: string;
  outcome: string;
  homeScore: number;
  awayScore: number;
  homePkScore: number;
  awayPkScore: number;
  pkMode: string;
  goals: Array<{ side: string; player: string | null }>;
};

export function buildMatchesCsv(matches: MatchLike[]) {
  const rows = [
    ["日付", "大会・試合名", "学年", "対戦相手", "スコア", "勝敗", "得点者"],
    ...matches.map((entry) => [
      exportDateForCsv(entry.matchDate),
      joinTournamentAndTitle(entry),
      entry.tags.join("・"),
      entry.opponent,
      formatScore(entry),
      outcomeToMark(entry.outcome),
      entry.goals.filter((goal) => goal.side === "home" && goal.player).map((goal) => goal.player).join("、")
    ])
  ];
  return rows.map((row) => row.map((cell) => escapeCsvCell(String(cell ?? ""))).join(",")).join("\n");
}

export function parseReferenceMatchesCsv(text: string, fileName: string): MatchPayload[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) {
    return [];
  }
  const columns = header.map((value) => value.replace(/^\uFEFF/, "").trim());
  return rows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => {
      const data = Object.fromEntries(columns.map((name, index) => [name, row[index] || ""]));
      const score = parseScoreText(data["スコア"] || "");
      const names = expandScorers(data["得点者"] || "");
      const parts = splitTournamentAndTitle(data["大会・試合名"] || "");
      return {
        tournament: parts.tournament,
        title: parts.title,
        opponent: data["対戦相手"] || "",
        tags: gradeToTags(data["学年"] || ""),
        matchDate: normalizeImportedDate(data["日付"] || "", inferYearFromFileName(fileName)),
        periodMode: "halves",
        currentPeriod: "前半",
        pkMode: score.pkMode,
        homePkScore: score.homePkScore,
        awayPkScore: score.awayPkScore,
        homeScore: score.homeScore,
        awayScore: score.awayScore,
        duration: "00:00",
        events: names.map((player, index) => ({
          side: "home" as const,
          player,
          period: "試合中",
          time: `${String(index).padStart(2, "0")}:00`
        }))
      } satisfies MatchPayload;
    });
}

function formatScore(entry: {
  homeScore: number;
  awayScore: number;
  pkMode: string;
  homePkScore: number;
  awayPkScore: number;
}) {
  const base = `${entry.homeScore}-${entry.awayScore}`;
  return entry.pkMode === "on" ? `${base}(PK${entry.homePkScore}-${entry.awayPkScore})` : base;
}

function exportDateForCsv(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${Number(month)}/${Number(day)}`;
}

function inferYearFromFileName(fileName: string) {
  const match = fileName.match(/(20\d{2})/);
  return match ? Number(match[1]) : Number(getCurrentTokyoDate().slice(0, 4));
}

function normalizeImportedDate(value: string, year: number) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return getCurrentTokyoDate();
  return `${year}-${String(Number(match[1])).padStart(2, "0")}-${String(Number(match[2])).padStart(2, "0")}`;
}

function joinTournamentAndTitle(entry: { tournament: string; title: string }) {
  if (!entry.title || entry.title === "無題の試合") return entry.tournament;
  if (!entry.tournament || entry.tournament === "未設定") return entry.title;
  return `${entry.tournament} / ${entry.title}`;
}

function outcomeToMark(value: string) {
  if (value === "勝ち") return "〇";
  if (value === "負け") return "●";
  return "△";
}

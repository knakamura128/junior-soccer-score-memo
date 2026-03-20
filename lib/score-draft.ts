import { type MatchPayload } from "@/lib/match-format";

export function createEmptyMatch(): MatchPayload {
  return {
    tournament: "",
    title: "",
    opponent: "",
    tags: [],
    matchDate: new Date().toISOString().slice(0, 10),
    periodMode: "halves",
    currentPeriod: "前半",
    pkMode: "off",
    homePkScore: 0,
    awayPkScore: 0,
    homeScore: 0,
    awayScore: 0,
    duration: "00:00",
    events: []
  };
}

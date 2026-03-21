"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buildMatchesCsv, parseReferenceMatchesCsv } from "@/lib/match-csv";
import {
  CATEGORY_OPTIONS,
  type MatchPayload
} from "@/lib/match-format";
import { createEmptyMatch } from "@/lib/score-draft";

type Player = {
  id: string;
  number: string;
  name: string;
  tags: string[];
};

type MatchRow = {
  id: string;
  tournament: string;
  title: string;
  opponent: string;
  tags: string[];
  matchDate: string;
  periodMode: string;
  pkMode: string;
  homePkScore: number;
  awayPkScore: number;
  homeScore: number;
  awayScore: number;
  duration: string;
  outcome: string;
  goals: Array<{ side: string; player: string | null; period: string; time: string }>;
  createdBy: { displayName: string } | null;
  updatedBy: { displayName: string } | null;
  createdAt: string;
  updatedAt: string;
};

type DashboardProps = {
  initialData: {
    players: Player[];
    matches: MatchRow[];
  };
  initialMatch?: MatchPayload;
};

type AuthState = {
  status: "loading" | "ready" | "error";
  idToken: string;
  displayName: string;
  pictureUrl?: string;
  lineUserId?: string;
  error?: string;
};

const DRAFT_STORAGE_KEY = "score-mini-app-next-draft";

export function Dashboard({ initialData, initialMatch }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"scoring" | "results">("scoring");
  const [players, setPlayers] = useState(initialData.players);
  const [matches, setMatches] = useState(initialData.matches);
  const [match, setMatch] = useState<MatchPayload>(() => initialMatch || createEmptyMatch());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [goalPlayer, setGoalPlayer] = useState("");
  const [playerForm, setPlayerForm] = useState({ number: "", name: "", tags: [] as string[] });
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState("すべて");
  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [sortValue, setSortValue] = useState("date-desc");
  const [compactResultsView, setCompactResultsView] = useState(true);
  const [auth, setAuth] = useState<AuthState>({ status: "loading", idToken: "", displayName: "" });
  const [feedback, setFeedback] = useState<string>("");

  useEffect(() => {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as { match: MatchPayload; timerSeconds: number; editingId: string | null };
      setMatch(draft.match);
      setTimerSeconds(draft.timerSeconds);
      setEditingId(draft.editingId);
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        match,
        timerSeconds,
        editingId
      })
    );
  }, [match, timerSeconds, editingId]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setTimerSeconds((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    setMatch((current) => ({ ...current, duration: formatClock(timerSeconds) }));
  }, [timerSeconds]);

  const filteredPlayers = players.filter((player) =>
    match.tags.length === 0 ? true : player.tags.some((tag) => match.tags.includes(tag))
  );
  const playerNameCounts = players.reduce<Record<string, number>>((counts, player) => {
    counts[player.name] = (counts[player.name] || 0) + 1;
    return counts;
  }, {});

  useEffect(() => {
    if (!goalPlayer) {
      return;
    }
    const stillVisible = filteredPlayers.some((player) => player.id === goalPlayer);
    if (!stillVisible) {
      setGoalPlayer("");
    }
  }, [goalPlayer, filteredPlayers]);

  useEffect(() => {
    let cancelled = false;
    async function initLiff() {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        setAuth({ status: "error", idToken: "", displayName: "", error: "NEXT_PUBLIC_LIFF_ID が未設定です。" });
        return;
      }
      try {
        const { default: liff } = await import("@line/liff");
        await liff.init({ liffId });
        if (!liff.isLoggedIn()) {
          setAuth({ status: "ready", idToken: "", displayName: "未ログイン" });
          return;
        }
        const [profile, idToken] = await Promise.all([liff.getProfile(), Promise.resolve(liff.getIDToken() || "")]);
        if (!cancelled) {
          setAuth({
            status: "ready",
            idToken,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
            lineUserId: profile.userId
          });
        }
      } catch (error) {
        if (!cancelled) {
          setAuth({
            status: "error",
            idToken: "",
            displayName: "",
            error: buildDashboardLiffErrorMessage(error, "LIFF 初期化に失敗しました。")
          });
        }
      }
    }
    void initLiff();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleMatches = matches
    .filter((entry) => (filterTag === "すべて" ? true : entry.tags.includes(filterTag)))
    .filter((entry) => (filterMonth && filterMonth !== "all" ? entry.matchDate.startsWith(filterMonth) : true))
    .sort((left, right) => {
      switch (sortValue) {
        case "date-asc":
          return left.matchDate.localeCompare(right.matchDate);
        case "goals-desc":
          return right.homeScore + right.awayScore - (left.homeScore + left.awayScore);
        case "opponent-asc":
          return left.opponent.localeCompare(right.opponent, "ja");
        default:
          return right.matchDate.localeCompare(left.matchDate);
      }
    });

  const topScorers = Array.from(
    visibleMatches
      .flatMap((entry) =>
        entry.goals
          .filter((goal) => goal.side === "home" && goal.player)
          .map((goal) => resolveGoalPlayerName(goal.player as string, players, entry.tags, playerNameCounts))
      )
      .reduce((map, name) => map.set(name, (map.get(name) || 0) + 1), new Map<string, number>())
  ).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"));

  const opponentRecords = Array.from(
    visibleMatches.reduce((map, entry) => {
      const record = map.get(entry.opponent) || { win: 0, draw: 0, loss: 0 };
      if (entry.outcome === "勝ち") record.win += 1;
      else if (entry.outcome === "負け") record.loss += 1;
      else record.draw += 1;
      map.set(entry.opponent, record);
      return map;
    }, new Map<string, { win: number; draw: number; loss: number }>())
  ).sort((a, b) => a[0].localeCompare(b[0], "ja"));

  const totals = visibleMatches.reduce(
    (acc, entry) => {
      if (entry.outcome === "勝ち") acc.win += 1;
      else if (entry.outcome === "負け") acc.loss += 1;
      else acc.draw += 1;
      return acc;
    },
    { win: 0, draw: 0, loss: 0 }
  );
  const matchMonthOptions = getMonthOptions(filterMonth);

  async function requireIdToken() {
    if (!auth.idToken) {
      await loginWithLine();
      throw new Error("LINEログインを更新しています。再度操作してください。");
    }
    return auth.idToken;
  }

  async function savePlayer() {
    if (!playerForm.number || !playerForm.name || playerForm.tags.length === 0) {
      setFeedback("選手登録には背番号、名前、タグが必要です。");
      return;
    }
    try {
      const idToken = await requireIdToken();
      const response = await fetch(editingPlayerId ? `/api/players/${editingPlayerId}` : "/api/players", {
        method: editingPlayerId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          player: playerForm
        })
      });
      if (!response.ok) throw new Error();
      const saved = (await response.json()) as Player;
      setPlayers((current) =>
        editingPlayerId ? current.map((entry) => (entry.id === editingPlayerId ? saved : entry)) : [...current, saved]
      );
      setPlayerForm({ number: "", name: "", tags: [] });
      setEditingPlayerId(null);
      setFeedback(editingPlayerId ? "選手を更新しました。" : "選手を保存しました。");
    } catch (error) {
      if (shouldRefreshDashboardLineLogin(error)) {
        await loginWithLine();
        return;
      }
      setFeedback(error instanceof Error ? error.message : "選手保存に失敗しました。");
    }
  }

  async function registerPlayersFromMatches() {
    const candidates = extractPlayersFromMatches(matches).filter(
      (candidate) => !players.some((player) => getPlayerIdentityKey(player) === getPlayerIdentityKey(candidate))
    );
    if (candidates.length === 0) {
      setFeedback("試合結果から追加できる選手はありません。");
      return;
    }

    try {
      const idToken = await requireIdToken();
      const savedPlayers: Player[] = [];
      for (const candidate of candidates) {
        const response = await fetch("/api/players", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken,
            player: candidate
          })
        });
        if (!response.ok) {
          throw new Error("試合結果からの選手登録に失敗しました。");
        }
        savedPlayers.push((await response.json()) as Player);
      }
      setPlayers((current) => [...current, ...savedPlayers]);
      setFeedback(`${savedPlayers.length}人の選手を試合結果から登録しました。`);
    } catch (error) {
      if (shouldRefreshDashboardLineLogin(error)) {
        await loginWithLine();
        return;
      }
      setFeedback(error instanceof Error ? error.message : "試合結果からの選手登録に失敗しました。");
    }
  }

  async function deletePlayer(id: string) {
    const player = players.find((entry) => entry.id === id);
    const confirmed = window.confirm(
      `${player ? `${player.number} ${player.name}` : "この選手"}を削除します。元に戻せません。`
    );
    if (!confirmed) {
      return;
    }

    try {
      const idToken = await requireIdToken();
      const response = await fetch(`/api/players/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "選手削除に失敗しました。");
      }
      setPlayers((current) => current.filter((entry) => entry.id !== id));
      if (goalPlayer && player && goalPlayer === player.id) {
        setGoalPlayer("");
      }
      if (editingPlayerId === id) {
        cancelPlayerEditing();
      }
      setFeedback("選手を削除しました。");
    } catch (error) {
      if (shouldRefreshDashboardLineLogin(error)) {
        await loginWithLine();
        return;
      }
      setFeedback(error instanceof Error ? error.message : "選手削除に失敗しました。");
    }
  }

  function startPlayerEditing(player: Player) {
    setEditingPlayerId(player.id);
    setPlayerForm({
      number: player.number,
      name: player.name,
      tags: player.tags
    });
    setFeedback("");
  }

  function cancelPlayerEditing() {
    setEditingPlayerId(null);
    setPlayerForm({ number: "", name: "", tags: [] });
  }

  function addGoal(side: "home" | "away") {
    setMatch((current) => ({
      ...current,
      homeScore: side === "home" ? current.homeScore + 1 : current.homeScore,
      awayScore: side === "away" ? current.awayScore + 1 : current.awayScore,
      events: [
        ...current.events,
        {
          side,
          player: side === "home" ? playerIdToStoredValue(goalPlayer, players, playerNameCounts) : "",
          period: current.periodMode === "halves" ? current.currentPeriod : "試合中",
          time: formatClock(timerSeconds)
        }
      ]
    }));
  }

  function updateEventPlayer(index: number, player: string) {
    setMatch((current) => ({
      ...current,
      events: current.events.map((event, eventIndex) => (eventIndex === index ? { ...event, player } : event))
    }));
  }

  function removeEvent(index: number) {
    setMatch((current) => {
      const nextEvents = current.events.filter((_, eventIndex) => eventIndex !== index);
      return {
        ...current,
        events: nextEvents,
        homeScore: nextEvents.filter((event) => event.side === "home").length,
        awayScore: nextEvents.filter((event) => event.side === "away").length
      };
    });
  }

  async function saveMatch() {
    if (!match.opponent || match.tags.length === 0) {
      setFeedback("相手チームとタグは必須です。");
      return;
    }
    try {
      const idToken = await requireIdToken();
      const response = await fetch(editingId ? `/api/matches/${editingId}` : "/api/matches", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, match })
      });
      if (!response.ok) throw new Error("保存に失敗しました。");
      const saved = (await response.json()) as MatchRow;
      setMatches((current) =>
        editingId ? current.map((entry) => (entry.id === editingId ? saved : entry)) : [saved, ...current]
      );
      resetDraft();
      setActiveTab("results");
      setFeedback("試合結果を保存しました。");
    } catch (error) {
      if (shouldRefreshDashboardLineLogin(error)) {
        await loginWithLine();
        return;
      }
      setFeedback(error instanceof Error ? error.message : "保存に失敗しました。");
    }
  }

  async function deleteMatch(id: string) {
    const target = matches.find((entry) => entry.id === id);
    const confirmed = window.confirm(
      `${target ? `${joinTournamentAndTitle(target)} / vs ${target.opponent}` : "この試合結果"}を削除します。元に戻せません。`
    );
    if (!confirmed) {
      return;
    }

    try {
      const idToken = await requireIdToken();
      const response = await fetch(`/api/matches/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "削除に失敗しました。");
      }
      setMatches((current) => current.filter((entry) => entry.id !== id));
      if (editingId === id) {
        resetDraft();
      }
      setFeedback("試合結果を削除しました。");
    } catch (error) {
      if (shouldRefreshDashboardLineLogin(error)) {
        await loginWithLine();
        return;
      }
      setFeedback(error instanceof Error ? error.message : "削除に失敗しました。");
    }
  }

  function resetDraft() {
    setEditingId(null);
    setGoalPlayer("");
    setTimerRunning(false);
    setTimerSeconds(0);
    setMatch(createEmptyMatch());
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  }

  function cancelEditing() {
    resetDraft();
    setActiveTab("results");
    setFeedback("試合修正を取り消しました。");
  }

  function editMatch(entry: MatchRow) {
    setEditingId(entry.id);
    setTimerRunning(false);
    setTimerSeconds(parseClockToSeconds(entry.duration));
    setMatch({
      id: entry.id,
      tournament: entry.tournament,
      title: entry.title,
      opponent: entry.opponent,
      tags: entry.tags,
      matchDate: entry.matchDate,
      periodMode: (entry.periodMode === "single" ? "single" : "halves"),
      currentPeriod: entry.periodMode === "halves" ? "前半" : "試合中",
      pkMode: (entry.pkMode === "on" ? "on" : "off"),
      homePkScore: entry.homePkScore,
      awayPkScore: entry.awayPkScore,
      homeScore: entry.homeScore,
      awayScore: entry.awayScore,
      duration: entry.duration,
      events: entry.goals.map((goal) => ({
        side: goal.side === "away" ? "away" : "home",
        player: goal.player || "",
        period: goal.period,
        time: goal.time
      }))
    });
    setActiveTab("scoring");
  }

  async function importReferenceCsv(file: File) {
    try {
      const idToken = await requireIdToken();
      const text = await file.text();
      const payloads = parseReferenceMatchesCsv(text, file.name);
      for (const payload of payloads) {
        const response = await fetch("/api/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, match: payload })
        });
        if (!response.ok) throw new Error("CSVの取り込みに失敗しました。");
        const saved = (await response.json()) as MatchRow;
        setMatches((current) => [saved, ...current]);
      }
      setFeedback("CSVを取り込みました。");
    } catch (error) {
      if (shouldRefreshDashboardLineLogin(error)) {
        await loginWithLine();
        return;
      }
      setFeedback(error instanceof Error ? error.message : "CSV取り込みに失敗しました。");
    }
  }

  function exportCsv() {
    const csv = buildMatchesCsv(visibleMatches);
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `match-results-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function loginWithLine() {
    try {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        throw new Error("NEXT_PUBLIC_LIFF_ID が未設定です。");
      }
      const { default: liff } = await import("@line/liff");
      await liff.init({ liffId });
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
      }
    } catch (error) {
      setAuth({
        status: "error",
        idToken: "",
        displayName: "",
        error: buildDashboardLiffErrorMessage(error, "LINEログインに失敗しました。")
      });
    }
  }

  async function logoutFromLine() {
    try {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        throw new Error("NEXT_PUBLIC_LIFF_ID が未設定です。");
      }
      const { default: liff } = await import("@line/liff");
      await liff.init({ liffId });
      if (liff.isLoggedIn()) {
        liff.logout();
      }
      window.location.reload();
    } catch (error) {
      setAuth({
        status: "error",
        idToken: "",
        displayName: "",
        error: buildDashboardLiffErrorMessage(error, "LINEログアウトに失敗しました。")
      });
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">LINE Mini App Prototype</p>
          <div className="brand-lockup">
            <img src="/fc-kumano-logo.png" alt="FC KUMANO logo" className="brand-logo" />
            <div>
              <h1>FC KUMANO スコア管理</h1>
              <p className="hero-copy">Vercel + DB + LINEログイン前提の保存/更新対応版です。</p>
            </div>
          </div>
        </div>
        <aside className="auth-box">
          {auth.pictureUrl ? (
            <div className="auth-row">
              <img src={auth.pictureUrl} alt={auth.displayName} />
              <div>
                <strong>{auth.displayName}</strong>
                <div className="auth-meta">保存・更新者として記録されます</div>
              </div>
            </div>
          ) : (
            <div>
              <strong>{auth.status === "loading" ? "LINE認証を確認中" : auth.displayName || "LINE未ログイン"}</strong>
              <div className={`auth-meta ${auth.error ? "error" : ""}`}>{auth.error || "保存前にログイン状態を確認します"}</div>
            </div>
          )}
          {!auth.idToken ? (
            <button className="primary" type="button" onClick={() => void loginWithLine()} style={{ marginTop: 12 }}>
              LINEでログイン
            </button>
          ) : (
            <button className="ghost link-chip" type="button" onClick={() => void logoutFromLine()} style={{ marginTop: 12 }}>
              LINEログアウト
            </button>
          )}
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link href="/guide" className="ghost link-chip">
              使い方ガイド
            </Link>
            <Link href="/" className="ghost link-chip">
              スケジュール管理へ
            </Link>
          </div>
        </aside>
      </header>

      {feedback ? <p className={feedback.includes("失敗") ? "error" : "muted"}>{feedback}</p> : null}

      <nav className="tab-bar" aria-label="ページ切り替え">
        <button className={`tab ${activeTab === "scoring" ? "is-active" : ""}`} onClick={() => setActiveTab("scoring")} type="button">スコア付け</button>
        <button className={`tab ${activeTab === "results" ? "is-active" : ""}`} onClick={() => setActiveTab("results")} type="button">試合結果一覧</button>
      </nav>

      <section className={`tab-panel ${activeTab === "scoring" ? "is-active" : ""}`}>
        <div className="panel-grid">
          <section className="card">
            <div className="section-title"><h2>試合情報</h2><span>基本設定</span></div>
            <div className="form-grid">
              <label>大会名<input value={match.tournament} onChange={(event) => setMatch({ ...match, tournament: event.target.value })} /></label>
              <label>試合タイトル<input value={match.title} onChange={(event) => setMatch({ ...match, title: event.target.value })} /></label>
              <label>相手チーム<input value={match.opponent} onChange={(event) => setMatch({ ...match, opponent: event.target.value })} /></label>
              <label>年代タグ<TagSelector value={match.tags} onChange={(tags) => setMatch({ ...match, tags })} /></label>
              <label>日付<input type="date" value={match.matchDate} onChange={(event) => setMatch({ ...match, matchDate: event.target.value })} /></label>
              <label>前後半<select value={match.periodMode} onChange={(event) => setMatch({ ...match, periodMode: event.target.value as "halves" | "single" })}><option value="halves">前後半あり</option><option value="single">前後半なし</option></select></label>
              {match.periodMode === "halves" ? <label>現在の区分<select value={match.currentPeriod} onChange={(event) => setMatch({ ...match, currentPeriod: event.target.value })}><option value="前半">前半</option><option value="後半">後半</option></select></label> : null}
              <label>PK戦<select value={match.pkMode} onChange={(event) => setMatch({ ...match, pkMode: event.target.value as "off" | "on" })}><option value="off">なし</option><option value="on">あり</option></select></label>
            </div>
            {match.pkMode === "on" ? (
              <div className="pk-grid">
                <label>PK 自チーム<input type="number" min="0" value={match.homePkScore} onChange={(event) => setMatch({ ...match, homePkScore: Number(event.target.value || 0) })} /></label>
                <label>PK 相手チーム<input type="number" min="0" value={match.awayPkScore} onChange={(event) => setMatch({ ...match, awayPkScore: Number(event.target.value || 0) })} /></label>
              </div>
            ) : null}
          </section>

          <section className="card score-card">
            <div className="section-title"><h2>スコア</h2><span>{match.periodMode === "halves" ? match.currentPeriod : "試合中"}</span></div>
            <div className="scoreboard">
              <div className="team-panel"><p className="team-label">自チーム</p><p className="score">{match.homeScore}</p><button className="score-btn home" type="button" onClick={() => addGoal("home")}>ゴールを追加</button></div>
              <div className="score-separator"><p className="period-indicator">{match.periodMode === "halves" ? match.currentPeriod : "試合中"}</p><span>vs</span></div>
              <div className="team-panel"><p className="team-label">相手チーム</p><p className="score">{match.awayScore}</p><button className="score-btn away" type="button" onClick={() => addGoal("away")}>失点を追加</button></div>
            </div>
            <label>得点選手<select value={goalPlayer} onChange={(event) => setGoalPlayer(event.target.value)}><option value="">未選択</option>{filteredPlayers.map((player) => <option key={player.id} value={player.id}>{formatPlayerDisplay(player, playerNameCounts)}</option>)}</select></label>
            <div className="timer-block">
              <div className="timer-display">{formatClock(timerSeconds)}</div>
              <div className="timer-actions">
                <button type="button" onClick={() => setTimerRunning(true)}>スタート</button>
                <button type="button" className="ghost" onClick={() => setTimerRunning(false)}>ストップ</button>
                <button type="button" className="ghost" onClick={resetDraftTimer}>リセット</button>
              </div>
            </div>
            <div className="event-log-wrap">
              <div className="log-head"><h3>ゴールログ</h3><button className="text-button" type="button" onClick={resetDraft}>この試合を初期化</button></div>
              <ul className="event-log">
                {match.events.length === 0 ? (
                  <li className="empty-state">まだゴールは登録されていません。</li>
                ) : (
                  match.events.map((event, index) => (
                    <li key={`${event.time}-${index}`} className="event-item">
                      <div>
                        <strong>{event.time} {event.period} {event.side === "home" ? "自チーム得点" : "相手チーム得点"}</strong>
                      </div>
                      {event.side === "home" ? (
                        <select
                          value={resolveStoredPlayerId(event.player, players, match.tags)}
                          onChange={(e) => updateEventPlayer(index, playerIdToStoredValue(e.target.value, players, playerNameCounts))}
                        >
                          <option value="">未選択</option>
                          {filteredPlayers.map((player) => (
                            <option key={player.id} value={player.id}>
                              {formatPlayerDisplay(player, playerNameCounts)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="muted">得点選手なし</div>
                      )}
                      <button className="text-button danger" type="button" onClick={() => removeEvent(index)}>
                        得点を取り消す
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="stack-actions">
              {editingId ? <button className="ghost dark-ghost" type="button" onClick={cancelEditing}>修正を取り消す</button> : null}
              <button className="primary save-button" type="button" onClick={() => void saveMatch()}>{editingId ? "試合結果を更新" : "試合結果を保存"}</button>
            </div>
          </section>

          <section className="card">
            <div className="section-title"><h2>選手登録</h2><span>DB保存</span></div>
            <div className="player-form">
              <label>背番号<input value={playerForm.number} onChange={(event) => setPlayerForm({ ...playerForm, number: event.target.value })} /></label>
              <label>名前<input value={playerForm.name} onChange={(event) => setPlayerForm({ ...playerForm, name: event.target.value })} /></label>
              <label>グループ<TagSelector compact value={playerForm.tags} onChange={(tags) => setPlayerForm({ ...playerForm, tags })} /></label>
              <button className="primary" type="button" onClick={() => void savePlayer()}>{editingPlayerId ? "選手を更新" : "選手を追加"}</button>
              <button className="ghost dark-ghost" type="button" onClick={() => void registerPlayersFromMatches()}>試合結果から登録</button>
              {editingPlayerId ? <button className="ghost" type="button" onClick={cancelPlayerEditing}>編集を取り消す</button> : null}
            </div>
            <details className="expandable" open={players.length <= 8}>
              <summary>登録選手一覧 {players.length}人</summary>
              <ul className="player-list">
                {players.length === 0 ? <li className="empty-state">選手を登録すると、得点時に選択できます。</li> : players.map((player) => (
                  <li key={player.id} className="player-item">
                    <div><strong>{formatPlayerDisplay(player, playerNameCounts)}</strong><p className="player-meta">タグ: {player.tags.join(", ")}</p></div>
                    <div className="action-row">
                      <button className="text-button" type="button" onClick={() => startPlayerEditing(player)}>編集</button>
                      <button className="text-button danger" type="button" onClick={() => void deletePlayer(player.id)}>削除</button>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        </div>
      </section>

      <section className={`tab-panel ${activeTab === "results" ? "is-active" : ""}`}>
        <section className="card">
          <div className="section-title"><h2>試合結果一覧</h2><span>保存者/更新者つき</span></div>
          <div className="results-toolbar compact-toolbar score-results-toolbar">
            <div className="month-filter">
              <span className="month-filter-label">表示月</span>
              <div className="month-chip-row">
                {matchMonthOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`tab month-chip ${filterMonth === option.value ? "is-active" : ""}`}
                    onClick={() => setFilterMonth(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="month-filter">
              <span className="month-filter-label">表示切替</span>
              <div className="month-chip-row">
                <button
                  type="button"
                  className={`tab month-chip ${compactResultsView ? "is-active" : ""}`}
                  onClick={() => setCompactResultsView(true)}
                >
                  短縮
                </button>
                <button
                  type="button"
                  className={`tab month-chip ${compactResultsView ? "" : "is-active"}`}
                  onClick={() => setCompactResultsView(false)}
                >
                  通常
                </button>
              </div>
            </div>
            <label>タグで絞り込み<select value={filterTag} onChange={(event) => setFilterTag(event.target.value)}><option value="すべて">すべて</option>{CATEGORY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
            <label>並び順<select value={sortValue} onChange={(event) => setSortValue(event.target.value)}><option value="date-desc">日付が新しい順</option><option value="date-asc">日付が古い順</option><option value="goals-desc">総得点が多い順</option><option value="opponent-asc">対戦相手順</option></select></label>
            <button className="primary csv-export" type="button" onClick={exportCsv}>CSVを書き出す</button>
            <label className="file-input csv-import">CSVを取り込む<input type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importReferenceCsv(file); event.currentTarget.value = ""; }} /></label>
          </div>
          <div className="summary-grid">
            <section className="summary-card">
              <h3>通算結果</h3>
              <div className="totals-row">
                <span className="total-pill win-pill">勝ち {totals.win}</span>
                <span className="total-pill draw-pill">引分 {totals.draw}</span>
                <span className="total-pill loss-pill">負け {totals.loss}</span>
              </div>
            </section>
            <section className="summary-card">
              <h3>最多得点者ランキング</h3>
              {topScorers.length === 0 ? <div className="empty-state">得点データがまだありません。</div> : <ol className="summary-list">{topScorers.slice(0, 10).map(([name, goals]) => <li key={name}>{name} {goals}得点</li>)}</ol>}
            </section>
            <section className="summary-card">
              <h3>対戦相手別勝敗表</h3>
              {opponentRecords.length === 0 ? <div className="empty-state">対戦結果データがまだありません。</div> : <details className="expandable" open={opponentRecords.length <= 8}><summary>対戦相手 {opponentRecords.length}件</summary><div className="record-table">{opponentRecords.map(([name, record]) => <div key={name} className="record-row"><strong>{name}</strong><span>{record.win}勝 {record.draw}分 {record.loss}敗</span></div>)}</div></details>}
            </section>
          </div>
          <div className={`table-wrap ${compactResultsView ? "is-compact" : ""}`}>
            <table className={`results-table score-results-table ${compactResultsView ? "is-compact" : ""}`}>
              <thead>
                <tr>
                  <th>日時</th><th>大会・試合名</th><th>タグ</th><th>対戦相手</th><th>スコア</th><th>勝敗</th><th>得点者</th>{!compactResultsView ? <th>保存者 / 更新者</th> : null}{!compactResultsView ? <th>操作</th> : null}
                </tr>
              </thead>
              <tbody>
                {visibleMatches.length === 0 ? <tr><td colSpan={compactResultsView ? 7 : 9} className="empty-state">保存された試合結果はまだありません。</td></tr> : visibleMatches.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.matchDate}</td>
                    <td>{joinTournamentAndTitle(entry)}</td>
                    <td><div className="badge-row">{entry.tags.map((tag) => <span key={tag} className={`badge ${getTagBadgeClass(tag)}`}>{tag}</span>)}</div></td>
                    <td>{entry.opponent}</td>
                    <td>{formatScore(entry)}</td>
                    <td><span className={`badge ${getOutcomeBadgeClass(entry.outcome)}`}>{entry.outcome}</span></td>
                    <td>{entry.goals.filter((goal) => goal.side === "home" && goal.player).map((goal) => resolveGoalPlayerName(goal.player as string, players, entry.tags, playerNameCounts)).join(", ") || "なし"}</td>
                    {!compactResultsView ? <td><div>{entry.createdBy?.displayName || "不明"} / {entry.updatedBy?.displayName || "不明"}</div></td> : null}
                    {!compactResultsView ? <td>
                      <div className="action-row">
                        <button className="text-button" type="button" onClick={() => editMatch(entry)}>修正</button>
                        <button className="text-button danger" type="button" onClick={() => void deleteMatch(entry.id)}>削除</button>
                      </div>
                    </td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );

  function resetDraftTimer() {
    setTimerRunning(false);
    setTimerSeconds(0);
  }
}

function TagSelector({
  value,
  onChange,
  compact = false
}: {
  value: string[];
  onChange: (value: string[]) => void;
  compact?: boolean;
}) {
  const selected = new Set(value);
  return (
    <div className={`tag-selector ${compact ? "compact" : ""}`}>
      {CATEGORY_OPTIONS.map((option) => (
        <label key={option} className="tag-option">
          <input
            type="checkbox"
            checked={selected.has(option)}
            onChange={(event) => {
              const next = new Set(value);
              if (event.target.checked) next.add(option);
              else next.delete(option);
              onChange([...next]);
            }}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function formatClock(totalSeconds: number) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function parseClockToSeconds(value: string) {
  const [minutes = "0", seconds = "0"] = String(value).split(":");
  return Number(minutes) * 60 + Number(seconds);
}

function formatScore(entry: { homeScore: number; awayScore: number; pkMode: string; homePkScore: number; awayPkScore: number }) {
  const base = `${entry.homeScore}-${entry.awayScore}`;
  return entry.pkMode === "on" ? `${base}(PK${entry.homePkScore}-${entry.awayPkScore})` : base;
}

function joinTournamentAndTitle(entry: { tournament: string; title: string }) {
  if (!entry.title || entry.title === "無題の試合") return entry.tournament;
  if (!entry.tournament || entry.tournament === "未設定") return entry.title;
  return `${entry.tournament} / ${entry.title}`;
}

function extractPlayersFromMatches(matches: MatchRow[]) {
  const map = new Map<string, { number: string; name: string; tags: Set<string> }>();
  matches.forEach((match) => {
    match.goals
      .filter((goal) => goal.side === "home" && goal.player)
      .forEach((goal) => {
        const rawName = String(goal.player || "").trim();
        if (!rawName) {
          return;
        }
        const name = normalizeStoredPlayerName(rawName);
        const draft = { number: "-", name, tags: new Set<string>() };
        match.tags.forEach((tag) => draft.tags.add(tag));
        const key = getPlayerIdentityKey({ ...draft, tags: [...draft.tags] });
        const entry = map.get(key) || draft;
        match.tags.forEach((tag) => entry.tags.add(tag));
        map.set(key, entry);
      });
  });
  return [...map.values()].map((entry) => ({
    number: entry.number,
    name: entry.name,
    tags: [...entry.tags]
  }));
}

function getTagBadgeClass(tag: string) {
  if (tag === "低学年" || tag === "1年" || tag === "2年") {
    return "tag-low";
  }
  if (tag === "中学年" || tag === "3年" || tag === "4年") {
    return "tag-mid";
  }
  if (tag === "高学年" || tag === "5年" || tag === "6年") {
    return "tag-high";
  }
  return "";
}

function getOutcomeBadgeClass(outcome: string) {
  if (outcome === "勝ち") {
    return "result-win";
  }
  if (outcome === "負け") {
    return "result-loss";
  }
  return "result-draw";
}

function buildDashboardLiffErrorMessage(error: unknown, fallback: string) {
  const detail =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : "";

  if (detail) {
    return `${fallback} ${detail}`;
  }

  return `${fallback} LINE Developers の LIFF Endpoint URL が現在のURLに一致しているか確認してください。`;
}

function shouldRefreshDashboardLineLogin(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  if (
    error.message.includes("LINE認証") ||
    error.message.includes("LINEログインが必要") ||
    error.message.includes("LINEログインを更新しています")
  ) {
    return true;
  }

  return false;
}

function getMonthOptions(selectedMonth: string) {
  if (selectedMonth === "all") {
    const baseDate = new Date();
    return [
      { value: "all", label: "全期間" },
      ...[-1, 0, 1].map((offset) => {
        const date = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);
        return {
          value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
          label: `${date.getMonth() + 1}月`
        };
      })
    ];
  }
  const [yearText = "2026", monthText = "1"] = selectedMonth.split("-");
  const baseDate = new Date(Number(yearText), Number(monthText) - 1, 1);

  return [
    { value: "all", label: "全期間" },
    ...[-1, 0, 1].map((offset) => {
      const date = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);
      return {
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: `${date.getMonth() + 1}月`
      };
    })
  ];
}

function getPlayerIdentityKey(player: { name: string; tags: string[] }) {
  return `${player.name}::${getPrimaryPlayerTag(player.tags)}`;
}

function getPrimaryPlayerTag(tags: string[]) {
  const ordered = ["キッズ", "1年", "2年", "3年", "4年", "5年", "6年", "低学年", "中学年", "高学年"];
  return ordered.find((tag) => tags.includes(tag)) || tags.slice().sort().join("/");
}

function formatPlayerDisplay(player: Player, counts: Record<string, number>) {
  const base = player.number && player.number !== "-" ? `${player.number} ${player.name}` : player.name;
  if ((counts[player.name] || 0) < 2) {
    return base;
  }
  return `${base} (${getPrimaryPlayerTag(player.tags)})`;
}

function normalizeStoredPlayerName(value: string) {
  return String(value || "")
    .replace(/^\S+\s+/, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
}

function resolveStoredPlayerId(storedValue: string, players: Player[], matchTags: string[]) {
  if (!storedValue) {
    return "";
  }
  const exactId = players.find((player) => player.id === storedValue);
  if (exactId) {
    return exactId.id;
  }
  const counts = players.reduce<Record<string, number>>((result, player) => {
    result[player.name] = (result[player.name] || 0) + 1;
    return result;
  }, {});
  const exactLabel = players.find((player) => formatPlayerDisplay(player, counts) === storedValue);
  if (exactLabel) {
    return exactLabel.id;
  }
  const normalized = normalizeStoredPlayerName(storedValue);
  const candidates = players.filter((player) => player.name === normalized);
  if (candidates.length === 1) {
    return candidates[0].id;
  }
  const tagMatched = candidates.find((player) => player.tags.some((tag) => matchTags.includes(tag) && /^(キッズ|[1-6]年)$/.test(tag)));
  return tagMatched?.id || "";
}

function playerIdToStoredValue(playerId: string, players: Player[], counts: Record<string, number>) {
  if (!playerId) {
    return "";
  }
  const player = players.find((entry) => entry.id === playerId);
  if (!player) {
    return "";
  }
  return formatPlayerDisplay(player, counts);
}

function resolveGoalPlayerName(
  storedValue: string,
  players: Player[],
  matchTags: string[],
  counts: Record<string, number>
) {
  if (!storedValue) {
    return "";
  }
  const playerId = resolveStoredPlayerId(storedValue, players, matchTags);
  if (!playerId) {
    return storedValue;
  }
  return playerIdToStoredValue(playerId, players, counts) || storedValue;
}

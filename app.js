const CATEGORY_OPTIONS = ["低学年", "中学年", "高学年", "1年", "2年", "3年", "4年", "5年", "6年"];
const PLAYER_STORAGE_KEY = "score-mini-app-players";
const RESULT_STORAGE_KEY = "score-mini-app-results";
const DRAFT_STORAGE_KEY = "score-mini-app-match-draft";

const state = {
  players: [],
  results: [],
  match: createEmptyMatch(),
  editingResultId: null,
  timerSeconds: 0,
  timerId: null,
};

const elements = {
  tabs: document.querySelectorAll(".tab"),
  panels: document.querySelectorAll(".tab-panel"),
  tournamentName: document.querySelector("#tournamentName"),
  matchTitle: document.querySelector("#matchTitle"),
  opponentName: document.querySelector("#opponentName"),
  matchCategoryTags: document.querySelector("#matchCategoryTags"),
  matchDate: document.querySelector("#matchDate"),
  periodMode: document.querySelector("#periodMode"),
  currentPeriod: document.querySelector("#currentPeriod"),
  periodSelectWrap: document.querySelector("#periodSelectWrap"),
  pkMode: document.querySelector("#pkMode"),
  pkScoreWrap: document.querySelector("#pkScoreWrap"),
  homePkScore: document.querySelector("#homePkScore"),
  awayPkScore: document.querySelector("#awayPkScore"),
  periodBadge: document.querySelector("#periodBadge"),
  homeScore: document.querySelector("#homeScore"),
  awayScore: document.querySelector("#awayScore"),
  goalPlayer: document.querySelector("#goalPlayer"),
  homeGoalButton: document.querySelector("#homeGoalButton"),
  awayGoalButton: document.querySelector("#awayGoalButton"),
  timerDisplay: document.querySelector("#timerDisplay"),
  startTimer: document.querySelector("#startTimer"),
  stopTimer: document.querySelector("#stopTimer"),
  resetTimer: document.querySelector("#resetTimer"),
  clearCurrentMatch: document.querySelector("#clearCurrentMatch"),
  saveMatch: document.querySelector("#saveMatch"),
  eventLog: document.querySelector("#eventLog"),
  playerNumber: document.querySelector("#playerNumber"),
  playerName: document.querySelector("#playerName"),
  playerGroupTags: document.querySelector("#playerGroupTags"),
  addPlayer: document.querySelector("#addPlayer"),
  playerList: document.querySelector("#playerList"),
  playerTemplate: document.querySelector("#playerItemTemplate"),
  resultFilter: document.querySelector("#resultFilter"),
  filterDateFrom: document.querySelector("#filterDateFrom"),
  filterDateTo: document.querySelector("#filterDateTo"),
  resultSort: document.querySelector("#resultSort"),
  exportCsv: document.querySelector("#exportCsv"),
  importCsv: document.querySelector("#importCsv"),
  resultsTableBody: document.querySelector("#resultsTableBody"),
  topScorers: document.querySelector("#topScorers"),
  opponentRecords: document.querySelector("#opponentRecords"),
};

initialize();

function initialize() {
  renderTagSelector(elements.matchCategoryTags, CATEGORY_OPTIONS, "match");
  renderTagSelector(elements.playerGroupTags, CATEGORY_OPTIONS, "player");
  populateSelect(elements.resultFilter, ["すべて", ...CATEGORY_OPTIONS], null);

  state.players = normalizePlayers(loadFromStorage(PLAYER_STORAGE_KEY, []));
  state.results = normalizeResults(loadFromStorage(RESULT_STORAGE_KEY, []));

  bindEvents();
  hydrateDraft();
  syncGoalPlayerOptions();
  renderPlayers();
  renderMatch();
  renderResults();
}

function bindEvents() {
  elements.tabs.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tabTarget));
  });

  elements.tournamentName.addEventListener("input", (event) => updateMatchField("tournament", event.target.value.trim()));
  elements.matchTitle.addEventListener("input", (event) => updateMatchField("title", event.target.value.trim()));
  elements.opponentName.addEventListener("input", (event) => updateMatchField("opponent", event.target.value.trim()));
  elements.matchDate.addEventListener("change", (event) => updateMatchField("date", event.target.value));

  elements.periodMode.addEventListener("change", (event) => {
    state.match.periodMode = event.target.value;
    if (state.match.periodMode === "single") {
      state.match.currentPeriod = "試合中";
    } else if (state.match.currentPeriod === "試合中") {
      state.match.currentPeriod = "前半";
    }
    syncMatchState();
  });

  elements.currentPeriod.addEventListener("change", (event) => updateMatchField("currentPeriod", event.target.value));
  elements.pkMode.addEventListener("change", (event) => {
    state.match.pkMode = event.target.value;
    syncMatchState();
  });
  elements.homePkScore.addEventListener("input", (event) => updateMatchField("homePkScore", Number(event.target.value || 0)));
  elements.awayPkScore.addEventListener("input", (event) => updateMatchField("awayPkScore", Number(event.target.value || 0)));

  elements.homeGoalButton.addEventListener("click", () => addGoal("home"));
  elements.awayGoalButton.addEventListener("click", () => addGoal("away"));
  elements.startTimer.addEventListener("click", startTimer);
  elements.stopTimer.addEventListener("click", stopTimer);
  elements.resetTimer.addEventListener("click", resetTimer);
  elements.clearCurrentMatch.addEventListener("click", resetCurrentMatch);
  elements.saveMatch.addEventListener("click", saveMatchResult);

  elements.addPlayer.addEventListener("click", addPlayer);

  elements.resultFilter.addEventListener("change", renderResults);
  elements.filterDateFrom.addEventListener("change", renderResults);
  elements.filterDateTo.addEventListener("change", renderResults);
  elements.resultSort.addEventListener("change", renderResults);
  elements.exportCsv.addEventListener("click", exportCsv);
  elements.importCsv.addEventListener("change", importCsv);
}

function createEmptyMatch() {
  return {
    tournament: "",
    title: "",
    opponent: "",
    categories: [],
    date: formatDateInput(new Date()),
    periodMode: "halves",
    currentPeriod: "前半",
    pkMode: "off",
    homePkScore: 0,
    awayPkScore: 0,
    homeScore: 0,
    awayScore: 0,
    events: [],
  };
}

function switchTab(targetId) {
  elements.tabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tabTarget === targetId);
  });
  elements.panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === targetId);
  });
}

function renderTagSelector(container, options, scope) {
  container.innerHTML = "";
  options.forEach((option) => {
    const label = document.createElement("label");
    label.className = "tag-option";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = option;
    input.dataset.scope = scope;
    input.addEventListener("change", onTagChange);

    const chip = document.createElement("span");
    chip.textContent = option;

    label.append(input, chip);
    container.append(label);
  });
}

function onTagChange(event) {
  const values = getCheckedValues(event.target.dataset.scope === "match" ? elements.matchCategoryTags : elements.playerGroupTags);
  if (event.target.dataset.scope === "match") {
    state.match.categories = values;
    syncMatchState();
    return;
  }
  state.selectedPlayerGroups = values;
}

function getCheckedValues(container) {
  return [...container.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
}

function setCheckedValues(container, values) {
  const selected = new Set(values);
  container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

function updateMatchField(key, value) {
  state.match[key] = value;
  syncMatchState();
}

function syncMatchState() {
  persistDraft();
  renderMatch();
}

function renderMatch() {
  elements.tournamentName.value = state.match.tournament;
  elements.matchTitle.value = state.match.title;
  elements.opponentName.value = state.match.opponent;
  elements.matchDate.value = state.match.date || formatDateInput(new Date());
  setCheckedValues(elements.matchCategoryTags, state.match.categories);
  elements.periodMode.value = state.match.periodMode;
  elements.periodSelectWrap.style.display = state.match.periodMode === "halves" ? "grid" : "none";
  elements.currentPeriod.value = state.match.periodMode === "halves" ? state.match.currentPeriod : "前半";
  elements.pkMode.value = state.match.pkMode;
  elements.pkScoreWrap.style.display = state.match.pkMode === "on" ? "grid" : "none";
  elements.homePkScore.value = String(state.match.homePkScore);
  elements.awayPkScore.value = String(state.match.awayPkScore);
  elements.periodBadge.textContent = state.match.periodMode === "halves" ? state.match.currentPeriod : "試合中";
  elements.homeScore.textContent = state.match.homeScore;
  elements.awayScore.textContent = state.match.awayScore;
  elements.timerDisplay.textContent = formatClock(state.timerSeconds);
  elements.saveMatch.textContent = state.editingResultId ? "試合結果を更新" : "試合結果を保存";
  renderEventLog();
}

function renderEventLog() {
  elements.eventLog.innerHTML = "";
  if (state.match.events.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "まだゴールは登録されていません。";
    elements.eventLog.append(empty);
    return;
  }

  state.match.events.slice().reverse().forEach((event) => {
    const item = document.createElement("li");
    const scorer = event.player ? ` / ${event.player}` : "";
    item.textContent = `${event.time} ${event.period} ${event.side === "home" ? "自チーム得点" : "相手チーム得点"}${scorer}`;
    elements.eventLog.append(item);
  });
}

function syncGoalPlayerOptions() {
  const currentValue = elements.goalPlayer.value;
  populateSelect(elements.goalPlayer, state.players.map((player) => player.label), "未選択");
  elements.goalPlayer.value = currentValue;
}

function addGoal(side) {
  if (side === "home") {
    state.match.homeScore += 1;
  } else {
    state.match.awayScore += 1;
  }

  state.match.events.push({
    side,
    player: side === "home" ? elements.goalPlayer.value : "",
    period: state.match.periodMode === "halves" ? state.match.currentPeriod : "試合中",
    time: formatClock(state.timerSeconds),
  });

  syncMatchState();
}

function startTimer() {
  if (state.timerId !== null) {
    return;
  }

  persistDraft();
  state.timerId = window.setInterval(() => {
    state.timerSeconds += 1;
    elements.timerDisplay.textContent = formatClock(state.timerSeconds);
  }, 1000);
}

function stopTimer() {
  if (state.timerId === null) {
    return;
  }
  window.clearInterval(state.timerId);
  state.timerId = null;
  persistDraft();
}

function resetTimer() {
  stopTimer();
  state.timerSeconds = 0;
  persistDraft();
  renderMatch();
}

function addPlayer() {
  const number = elements.playerNumber.value.trim();
  const name = elements.playerName.value.trim();
  const groups = getCheckedValues(elements.playerGroupTags);

  if (!number || !name || groups.length === 0) {
    window.alert("背番号、名前、グループタグを入力してください。");
    return;
  }

  state.players.push({
    id: createId(),
    number,
    name,
    groups,
    label: `${number} ${name}`,
  });
  persist(PLAYER_STORAGE_KEY, state.players);

  elements.playerNumber.value = "";
  elements.playerName.value = "";
  setCheckedValues(elements.playerGroupTags, []);
  syncGoalPlayerOptions();
  renderPlayers();
}

function renderPlayers() {
  elements.playerList.innerHTML = "";
  if (state.players.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "選手を登録すると、得点時に選択できます。";
    elements.playerList.append(empty);
    return;
  }

  state.players.forEach((player) => {
    const fragment = elements.playerTemplate.content.cloneNode(true);
    fragment.querySelector(".player-summary").textContent = `${player.number} ${player.name}`;
    fragment.querySelector(".player-meta").textContent = `タグ: ${player.groups.join(", ")}`;
    fragment.querySelector(".player-remove").addEventListener("click", () => {
      state.players = state.players.filter((entry) => entry.id !== player.id);
      persist(PLAYER_STORAGE_KEY, state.players);
      syncGoalPlayerOptions();
      renderPlayers();
    });
    elements.playerList.append(fragment);
  });
}

function saveMatchResult() {
  if (!state.match.opponent) {
    window.alert("相手チーム名を入力してください。");
    return;
  }
  if (state.match.categories.length === 0) {
    window.alert("年代タグを1つ以上選択してください。");
    return;
  }

  const result = {
    id: state.editingResultId || createId(),
    tournament: state.match.tournament || "未設定",
    title: state.match.title || "無題の試合",
    opponent: state.match.opponent,
    categories: state.match.categories,
    date: state.match.date || formatDateInput(new Date()),
    periodMode: state.match.periodMode,
    pkMode: state.match.pkMode,
    homePkScore: state.match.pkMode === "on" ? state.match.homePkScore : 0,
    awayPkScore: state.match.pkMode === "on" ? state.match.awayPkScore : 0,
    homeScore: state.match.homeScore,
    awayScore: state.match.awayScore,
    events: [...state.match.events],
    duration: formatClock(state.timerSeconds),
    savedAt: new Date().toISOString(),
    outcome: calculateOutcome(state.match),
  };

  if (state.editingResultId) {
    state.results = state.results.map((entry) => (entry.id === state.editingResultId ? result : entry));
  } else {
    state.results = [result, ...state.results];
  }

  persist(RESULT_STORAGE_KEY, state.results);
  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  state.editingResultId = null;
  renderResults();
  resetCurrentMatch();
  switchTab("results");
}

function renderResults() {
  const visibleResults = getVisibleResults();
  elements.resultsTableBody.innerHTML = "";
  renderTopScorers(visibleResults);
  renderOpponentRecords(visibleResults);

  if (visibleResults.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="8" class="empty-state">保存された試合結果はまだありません。</td>';
    elements.resultsTableBody.append(row);
    return;
  }

  visibleResults.forEach((result) => {
    const row = document.createElement("tr");
    const scorers = result.events.filter((event) => event.side === "home" && event.player).map((event) => event.player);
    row.innerHTML = `
      <td>${escapeHtml(result.date)}</td>
      <td>${escapeHtml(result.tournament)} / ${escapeHtml(result.title)}</td>
      <td>${renderBadges(result.categories)}</td>
      <td>${escapeHtml(result.opponent)}</td>
      <td>${escapeHtml(formatScore(result))}</td>
      <td><span class="badge">${escapeHtml(result.outcome)}</span></td>
      <td>${scorers.length > 0 ? escapeHtml(scorers.join(", ")) : "なし"}</td>
      <td><button class="text-button" data-edit-id="${result.id}" type="button">修正</button></td>
    `;
    row.querySelector("[data-edit-id]").addEventListener("click", () => startEditingResult(result.id));
    elements.resultsTableBody.append(row);
  });
}

function getVisibleResults() {
  const filterValue = elements.resultFilter.value || "すべて";
  const dateFrom = elements.filterDateFrom.value;
  const dateTo = elements.filterDateTo.value;
  const sortValue = elements.resultSort.value || "date-desc";

  const filtered = state.results.filter((result) => {
    if (filterValue !== "すべて" && !result.categories.includes(filterValue)) {
      return false;
    }
    if (dateFrom && result.date < dateFrom) {
      return false;
    }
    if (dateTo && result.date > dateTo) {
      return false;
    }
    return true;
  });

  filtered.sort((left, right) => {
    switch (sortValue) {
      case "date-asc":
        return left.date.localeCompare(right.date);
      case "goals-desc":
        return (right.homeScore + right.awayScore) - (left.homeScore + left.awayScore);
      case "opponent-asc":
        return left.opponent.localeCompare(right.opponent, "ja");
      case "date-desc":
      default:
        return right.date.localeCompare(left.date);
    }
  });

  return filtered;
}

function renderTopScorers(results) {
  elements.topScorers.innerHTML = "";
  const ranking = new Map();
  results.forEach((result) => {
    result.events.filter((event) => event.side === "home" && event.player).forEach((event) => {
      ranking.set(event.player, (ranking.get(event.player) || 0) + 1);
    });
  });

  const rows = [...ranking.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja")).slice(0, 10);
  if (rows.length === 0) {
    elements.topScorers.innerHTML = '<div class="empty-state">得点データがまだありません。</div>';
    return;
  }

  const list = document.createElement("ol");
  list.className = "summary-list";
  rows.forEach(([player, goals]) => {
    const item = document.createElement("li");
    item.textContent = `${player} ${goals}得点`;
    list.append(item);
  });
  elements.topScorers.append(list);
}

function renderOpponentRecords(results) {
  elements.opponentRecords.innerHTML = "";
  const records = new Map();
  results.forEach((result) => {
    const record = records.get(result.opponent) || { win: 0, draw: 0, loss: 0 };
    if (result.outcome === "勝ち") {
      record.win += 1;
    } else if (result.outcome === "負け") {
      record.loss += 1;
    } else {
      record.draw += 1;
    }
    records.set(result.opponent, record);
  });

  const rows = [...records.entries()].sort((a, b) => a[0].localeCompare(b[0], "ja"));
  if (rows.length === 0) {
    elements.opponentRecords.innerHTML = '<div class="empty-state">対戦結果データがまだありません。</div>';
    return;
  }

  const table = document.createElement("div");
  table.className = "record-table";
  rows.forEach(([opponent, record]) => {
    const row = document.createElement("div");
    row.className = "record-row";
    row.innerHTML = `<strong>${escapeHtml(opponent)}</strong><span>${record.win}勝 ${record.draw}分 ${record.loss}敗</span>`;
    table.append(row);
  });
  elements.opponentRecords.append(table);
}

function startEditingResult(resultId) {
  const result = state.results.find((entry) => entry.id === resultId);
  if (!result) {
    return;
  }

  stopTimer();
  state.editingResultId = result.id;
  state.match = {
    tournament: result.tournament,
    title: result.title,
    opponent: result.opponent,
    categories: [...result.categories],
    date: result.date,
    periodMode: result.periodMode,
    currentPeriod: result.periodMode === "halves" ? "前半" : "試合中",
    pkMode: result.pkMode,
    homePkScore: result.homePkScore,
    awayPkScore: result.awayPkScore,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    events: [...result.events],
  };
  state.timerSeconds = parseClockToSeconds(result.duration);
  persistDraft();
  renderMatch();
  switchTab("scoring");
}

function resetCurrentMatch() {
  stopTimer();
  state.match = createEmptyMatch();
  state.editingResultId = null;
  state.timerSeconds = 0;
  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  elements.goalPlayer.selectedIndex = 0;
  renderMatch();
}

function hydrateDraft() {
  const draft = loadFromStorage(DRAFT_STORAGE_KEY, null);
  if (!draft) {
    state.match = createEmptyMatch();
    return;
  }

  state.match = normalizeDraft(draft);
  state.timerSeconds = Number(draft.timerSeconds || 0);
  state.editingResultId = draft.editingResultId || null;
}

function persistDraft() {
  const draft = {
    ...state.match,
    timerSeconds: state.timerSeconds,
    editingResultId: state.editingResultId,
  };
  persist(DRAFT_STORAGE_KEY, draft);
}

function exportCsv() {
  const rows = [
    ["日付", "大会・試合名", "学年", "対戦相手", "スコア", "勝敗", "得点者"],
    ...state.results.map((result) => [
      exportDateForCsv(result.date),
      joinTournamentAndTitle(result),
      result.categories.join("・"),
      result.opponent,
      formatScoreCsv(result),
      outcomeToMark(result.outcome),
      formatScorersCsv(result.events),
    ]),
  ];

  const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `match-results-${formatDateInput(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function importCsv(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = parseCsv(String(reader.result || ""));
      const [header, ...body] = rows;
      const columns = header.map((cell) => cell.trim());
      const imported = body
        .filter((row) => row.some((cell) => cell.trim() !== ""))
        .map((row) => mapCsvRow(columns, row, file.name));
      state.results = normalizeResults([...imported, ...state.results]);
      persist(RESULT_STORAGE_KEY, state.results);
      renderResults();
      elements.importCsv.value = "";
    } catch (error) {
      window.alert("CSVの読み込みに失敗しました。形式を確認してください。");
    }
  };
  reader.readAsText(file, "utf-8");
}

function mapCsvRow(columns, row, fileName = "") {
  const data = Object.fromEntries(columns.map((name, index) => [name, row[index] || ""]));
  const isReferenceStyle = "日付" in data || "大会・試合名" in data;
  if (isReferenceStyle) {
    return mapReferenceCsvRow(data, fileName);
  }

  const scorers = data.scorers ? data.scorers.split("|").filter(Boolean) : [];
  return {
    id: createId(),
    date: data.date || formatDateInput(new Date()),
    tournament: data.tournament || "未設定",
    title: data.title || "無題の試合",
    categories: data.categories ? data.categories.split("|").filter(Boolean) : [],
    opponent: data.opponent || "",
    homeScore: Number(data.homeScore || 0),
    awayScore: Number(data.awayScore || 0),
    pkMode: data.pkMode || "off",
    homePkScore: Number(data.homePkScore || 0),
    awayPkScore: Number(data.awayPkScore || 0),
    periodMode: data.periodMode || "halves",
    duration: data.duration || "00:00",
    outcome: data.outcome || "引き分け",
    savedAt: new Date().toISOString(),
    events: scorers.map((player, index) => ({
      side: "home",
      player,
      period: "試合中",
      time: `${String(index).padStart(2, "0")}:00`,
    })),
  };
}

function mapReferenceCsvRow(data, fileName) {
  const parsedScore = parseScoreText(data["スコア"] || "");
  const scorers = expandScorers(data["得点者"] || "");
  const date = normalizeImportedDate(data["日付"] || "", inferYearFromFileName(fileName));
  const tournamentAndTitle = splitTournamentAndTitle(data["大会・試合名"] || "");
  const categories = gradeToTags(data["学年"] || "");
  const outcome = markToOutcome(data["勝敗"] || "") || calculateOutcome({
    homeScore: parsedScore.homeScore,
    awayScore: parsedScore.awayScore,
    pkMode: parsedScore.pkMode,
    homePkScore: parsedScore.homePkScore,
    awayPkScore: parsedScore.awayPkScore,
  });

  return {
    id: createId(),
    date,
    tournament: tournamentAndTitle.tournament,
    title: tournamentAndTitle.title,
    categories,
    opponent: data["対戦相手"] || "",
    homeScore: parsedScore.homeScore,
    awayScore: parsedScore.awayScore,
    pkMode: parsedScore.pkMode,
    homePkScore: parsedScore.homePkScore,
    awayPkScore: parsedScore.awayPkScore,
    periodMode: "halves",
    duration: "00:00",
    outcome,
    savedAt: new Date().toISOString(),
    events: scorers.map((player, index) => ({
      side: "home",
      player,
      period: "試合中",
      time: `${String(index).padStart(2, "0")}:00`,
    })),
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }
    current += char;
  }

  if (current !== "" || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

function populateSelect(select, options, placeholder) {
  select.innerHTML = "";
  let defaultValue = "";
  if (placeholder !== null) {
    const first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder;
    select.append(first);
  } else if (options.length > 0) {
    defaultValue = options[0];
  }
  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option;
    item.textContent = option;
    select.append(item);
  });
  select.value = defaultValue;
}

function normalizePlayers(players) {
  return players.map((player) => ({
    ...player,
    groups: Array.isArray(player.groups) ? player.groups : player.group ? [player.group] : [],
    label: player.label || `${player.number} ${player.name}`,
  }));
}

function normalizeResults(results) {
  return results.map((result) => ({
    ...result,
    categories: Array.isArray(result.categories) ? result.categories : result.category ? [result.category] : [],
    homePkScore: Number(result.homePkScore || 0),
    awayPkScore: Number(result.awayPkScore || 0),
    homeScore: Number(result.homeScore || 0),
    awayScore: Number(result.awayScore || 0),
    pkMode: result.pkMode || "off",
    periodMode: result.periodMode || "halves",
    duration: result.duration || "00:00",
    outcome: result.outcome || "引き分け",
    events: Array.isArray(result.events) ? result.events : [],
  }));
}

function normalizeDraft(draft) {
  return {
    tournament: draft.tournament || "",
    title: draft.title || "",
    opponent: draft.opponent || "",
    categories: Array.isArray(draft.categories) ? draft.categories : [],
    date: draft.date || formatDateInput(new Date()),
    periodMode: draft.periodMode || "halves",
    currentPeriod: draft.currentPeriod || "前半",
    pkMode: draft.pkMode || "off",
    homePkScore: Number(draft.homePkScore || 0),
    awayPkScore: Number(draft.awayPkScore || 0),
    homeScore: Number(draft.homeScore || 0),
    awayScore: Number(draft.awayScore || 0),
    events: Array.isArray(draft.events) ? draft.events : [],
  };
}

function loadFromStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function persist(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function formatClock(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function parseClockToSeconds(value) {
  const [minutes = "0", seconds = "0"] = String(value).split(":");
  return (Number(minutes) * 60) + Number(seconds);
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatScore(result) {
  const base = `${result.homeScore} - ${result.awayScore}`;
  return result.pkMode === "on" ? `${base} (PK ${result.homePkScore}-${result.awayPkScore})` : base;
}

function formatScoreCsv(result) {
  const base = `${result.homeScore}-${result.awayScore}`;
  return result.pkMode === "on" ? `${base}(PK${result.homePkScore}-${result.awayPkScore})` : base;
}

function formatScorersCsv(events) {
  return events
    .filter((event) => event.side === "home" && event.player)
    .map((event) => event.player)
    .join("、");
}

function exportDateForCsv(value) {
  if (!value) {
    return "";
  }
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${Number(month)}/${Number(day)}`;
}

function joinTournamentAndTitle(result) {
  if (!result.title || result.title === "無題の試合") {
    return result.tournament;
  }
  if (!result.tournament || result.tournament === "未設定") {
    return result.title;
  }
  return `${result.tournament} / ${result.title}`;
}

function splitTournamentAndTitle(value) {
  const [tournament, title] = String(value).split("/").map((item) => item.trim()).filter(Boolean);
  return {
    tournament: tournament || value || "未設定",
    title: title || value || "無題の試合",
  };
}

function parseScoreText(value) {
  const normalized = String(value).replace(/\s+/g, "");
  const match = normalized.match(/^(\d+)-(\d+)(?:\(PK(\d+)-(\d+)\))?$/i);
  if (!match) {
    return { homeScore: 0, awayScore: 0, pkMode: "off", homePkScore: 0, awayPkScore: 0 };
  }
  return {
    homeScore: Number(match[1]),
    awayScore: Number(match[2]),
    pkMode: match[3] !== undefined ? "on" : "off",
    homePkScore: Number(match[3] || 0),
    awayPkScore: Number(match[4] || 0),
  };
}

function expandScorers(value) {
  return String(value)
    .split(/[、,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => {
      const cleaned = item.replace(/^①|^②|^③|^④|^⑤/u, "");
      const match = cleaned.match(/^(.*?)[×xX](\d+)$/);
      if (!match) {
        return [cleaned];
      }
      return Array.from({ length: Number(match[2]) }, () => match[1].trim());
    });
}

function inferYearFromFileName(fileName) {
  const match = String(fileName).match(/(20\d{2})/);
  return match ? Number(match[1]) : new Date().getFullYear();
}

function normalizeImportedDate(value, year) {
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) {
    return formatDateInput(new Date());
  }
  return `${year}-${String(Number(match[1])).padStart(2, "0")}-${String(Number(match[2])).padStart(2, "0")}`;
}

function gradeToTags(value) {
  const source = String(value);
  const tags = new Set();
  if (source.includes("低")) {
    tags.add("低学年");
  }
  if (source.includes("中")) {
    tags.add("中学年");
  }
  if (source.includes("高")) {
    tags.add("高学年");
  }
  const gradeMatch = source.match(/([1-6])年/);
  if (gradeMatch) {
    const grade = `${gradeMatch[1]}年`;
    tags.add(grade);
    if (["1年", "2年"].includes(grade)) {
      tags.add("低学年");
    }
    if (["3年", "4年"].includes(grade)) {
      tags.add("中学年");
    }
    if (["5年", "6年"].includes(grade)) {
      tags.add("高学年");
    }
  }
  return [...tags];
}

function markToOutcome(value) {
  const normalized = String(value).trim();
  if (normalized === "〇" || normalized === "○") {
    return "勝ち";
  }
  if (normalized === "●") {
    return "負け";
  }
  if (normalized === "△") {
    return "引き分け";
  }
  return "";
}

function outcomeToMark(value) {
  if (value === "勝ち") {
    return "〇";
  }
  if (value === "負け") {
    return "●";
  }
  return "△";
}

function renderBadges(tags) {
  return tags.map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`).join(" ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeCsvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function calculateOutcome(match) {
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

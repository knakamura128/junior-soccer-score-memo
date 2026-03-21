"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  createEmptySchedule,
  extractOpponentFromContent,
  formatTimeRange,
  inferIsMatch,
  parseScheduleCsv,
  SCHEDULE_TAG_OPTIONS,
  type AttendanceStatus,
  type SchedulePayload
} from "@/lib/schedule-format";
import { buildScheduleIcs } from "@/lib/schedule-ics";

const SCHEDULE_ROW_TAG_ORDER = ["キッズ", "1年", "2年", "3年", "4年", "5年", "6年"] as const;
const SCHEDULE_BADGE_ORDER = ["低学年", "中学年", "高学年", "キッズ", "1年", "2年", "3年", "4年", "5年", "6年"] as const;
const CARPOOL_CHOICES = ["配車希望", "現地集合", "自家用車同乗可"] as const;

type AuthState = {
  status: "loading" | "ready" | "error";
  idToken: string;
  displayName: string;
  pictureUrl?: string;
  lineUserId?: string;
  error?: string;
};

type UserLite = {
  id: string;
  lineUserId: string;
  displayName: string;
  pictureUrl?: string | null;
};

type AttendanceRow = {
  id: string;
  userId: string;
  status: string;
  note: string | null;
  updatedAt: string;
  user: UserLite;
};

type DutyAssignmentRow = {
  id: string;
  assignedUserId: string | null;
  decidedById: string | null;
  note: string | null;
  decidedAt: string | null;
  assignedUser: UserLite | null;
  decidedBy: UserLite | null;
};

type CarpoolPreferenceRow = {
  id: string;
  userId: string;
  choice: string;
  createdAt: string;
  updatedAt: string;
  user: UserLite;
};

type ScheduleRow = {
  id: string;
  eventDate: string;
  tags: string[];
  startTime: string;
  endTime: string;
  location: string;
  content: string;
  dutyLabel: string | null;
  isMatch: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: UserLite | null;
  updatedBy: UserLite | null;
  attendances: AttendanceRow[];
  dutyAssignment: DutyAssignmentRow | null;
  carpoolPreferences: CarpoolPreferenceRow[];
};

type ScheduleDashboardProps = {
  initialData: {
    schedules: ScheduleRow[];
  };
};

type ModalTab = "attendance-input" | "attendance-list" | "duty" | "carpool";

export function ScheduleDashboard({ initialData }: ScheduleDashboardProps) {
  const [schedules, setSchedules] = useState(initialData.schedules);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterTag, setFilterTag] = useState("すべて");
  const [auth, setAuth] = useState<AuthState>({ status: "loading", idToken: "", displayName: "" });
  const [feedback, setFeedback] = useState("");
  const [modalEntryId, setModalEntryId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>("attendance-input");
  const [attendanceNote, setAttendanceNote] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>("参加");
  const [dutyUserId, setDutyUserId] = useState("");
  const [dutyNote, setDutyNote] = useState("");
  const [carpoolChoice, setCarpoolChoice] = useState<(typeof CARPOOL_CHOICES)[number] | "">("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState<SchedulePayload>(() => createEmptySchedule());
  const [compactView, setCompactView] = useState(true);
  const [bulkAttendanceOpen, setBulkAttendanceOpen] = useState(false);
  const [bulkAttendanceStatus, setBulkAttendanceStatus] = useState<AttendanceStatus>("参加");
  const [bulkAttendanceNote, setBulkAttendanceNote] = useState("");
  const [bulkAttendanceDate, setBulkAttendanceDate] = useState("すべて");
  const [bulkAttendanceTag, setBulkAttendanceTag] = useState("すべて");

  useEffect(() => {
    let cancelled = false;
    async function initLiff() {
      try {
        const session = await fetchLiffSession();
        if (!cancelled) {
          setAuth(session);
        }
      } catch (error) {
        if (!cancelled) {
          setAuth({
            status: "error",
            idToken: "",
            displayName: "",
            error: buildLiffErrorMessage(error, "LIFF 初期化に失敗しました。")
          });
        }
      }
    }
    void initLiff();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleSchedules = useMemo(
    () =>
      schedules
        .filter((entry) => entry.eventDate.startsWith(selectedMonth))
        .filter((entry) => (filterTag === "すべて" ? true : entry.tags.includes(filterTag)))
        .sort((left, right) => {
          const dateCompare = left.eventDate.localeCompare(right.eventDate);
          if (dateCompare !== 0) return dateCompare;
          const tagCompare = primaryTagRank(left.tags) - primaryTagRank(right.tags);
          if (tagCompare !== 0) return tagCompare;
          return left.startTime.localeCompare(right.startTime);
        }),
    [filterTag, schedules, selectedMonth]
  );
  const monthOptions = getMonthOptions(selectedMonth);
  const bulkAttendanceDateOptions = Array.from(new Set(visibleSchedules.map((entry) => entry.eventDate))).sort((left, right) =>
    left.localeCompare(right)
  );
  const bulkAttendanceTagOptions = Array.from(
    new Set(visibleSchedules.flatMap((entry) => entry.tags.filter((tag) => /^(キッズ|低学年|中学年|高学年|[1-6]年)$/.test(tag))))
  ).sort((left, right) => scheduleRowTagRank(left) - scheduleRowTagRank(right));
  const bulkAttendanceTargets = visibleSchedules.filter((entry) => {
    const matchesDate = bulkAttendanceDate === "すべて" ? true : entry.eventDate === bulkAttendanceDate;
    const matchesTag = bulkAttendanceTag === "すべて" ? true : entry.tags.includes(bulkAttendanceTag);
    return matchesDate && matchesTag;
  });

  const modalEntry = schedules.find((entry) => entry.id === modalEntryId) || null;
  const currentAttendance =
    modalEntry && auth.lineUserId
      ? modalEntry.attendances.find((attendance) => attendance.user.lineUserId === auth.lineUserId) || null
      : null;
  const participatingUsers = modalEntry
    ? modalEntry.attendances.filter((attendance) => attendance.status === "参加")
    : [];
  const currentCarpoolPreference =
    modalEntry && auth.lineUserId
      ? modalEntry.carpoolPreferences.find((preference) => preference.user.lineUserId === auth.lineUserId) || null
      : null;

  useEffect(() => {
    if (!modalEntry) {
      return;
    }
    setAttendanceNote(currentAttendance?.note || "");
    setAttendanceStatus((currentAttendance?.status as AttendanceStatus | undefined) || "参加");
    setDutyUserId(modalEntry.dutyAssignment?.assignedUserId || "");
    setDutyNote(modalEntry.dutyAssignment?.note || "");
    setCarpoolChoice((currentCarpoolPreference?.choice as (typeof CARPOOL_CHOICES)[number] | undefined) || "");
  }, [currentAttendance, currentCarpoolPreference, modalEntry]);

  function upsertSchedule(nextEntry: ScheduleRow) {
    setSchedules((current) => {
      const exists = current.some((entry) => entry.id === nextEntry.id);
      if (!exists) {
        return [...current, nextEntry];
      }
      return current.map((entry) => (entry.id === nextEntry.id ? nextEntry : entry));
    });
  }

  async function requireIdToken() {
    const session = await fetchLiffSession();
    setAuth(session);
    if (!session.idToken) {
      await loginWithLine();
      throw new Error("LINEログインを更新しています。再度操作してください。");
    }
    return session.idToken;
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
        error: buildLiffErrorMessage(error, "LINEログインに失敗しました。")
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
        error: buildLiffErrorMessage(error, "LINEログアウトに失敗しました。")
      });
    }
  }

  function openModal(entryId: string, tab: ModalTab) {
    const entry = schedules.find((current) => current.id === entryId);
    setModalEntryId(entryId);
    setModalTab(tab === "carpool" && entry && shouldHideCarpool(entry.location) ? "attendance-input" : tab);
  }

  function closeModal() {
    setModalEntryId(null);
  }

  function openBulkAttendance() {
    setBulkAttendanceStatus("参加");
    setBulkAttendanceNote("");
    setBulkAttendanceDate("すべて");
    setBulkAttendanceTag("すべて");
    setFeedback("");
    setBulkAttendanceOpen(true);
  }

  function closeBulkAttendance() {
    setBulkAttendanceOpen(false);
  }

  function openNewEditor() {
    setEditingId(null);
    setScheduleForm(createEmptySchedule(`${selectedMonth}-01`));
    setFeedback("");
    setEditorOpen(true);
  }

  function openEditEditor(entry: ScheduleRow) {
    setEditingId(entry.id);
    setScheduleForm({
      eventDate: entry.eventDate,
      tags: entry.tags,
      startTime: entry.startTime,
      endTime: entry.endTime,
      location: entry.location,
      content: entry.content,
      dutyLabel: entry.dutyLabel || "",
      isMatch: entry.isMatch,
      note: entry.note || ""
    });
    setFeedback("");
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingId(null);
    setScheduleForm(createEmptySchedule());
  }

  async function saveSchedule() {
    if (!scheduleForm.eventDate || scheduleForm.tags.length === 0 || !scheduleForm.location || !scheduleForm.content) {
      setFeedback("日付、タグ、場所、内容は必須です。");
      return;
    }
    try {
      const idToken = await requireIdToken();
      const response = await fetch(editingId ? `/api/schedules/${editingId}` : "/api/schedules", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, schedule: scheduleForm })
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "スケジュール保存に失敗しました。");
      }
      const saved = (await response.json()) as ScheduleRow;
      upsertSchedule(saved);
      setSelectedMonth(saved.eventDate.slice(0, 7));
      closeEditor();
      setFeedback(editingId ? "スケジュールを更新しました。" : "スケジュールを追加しました。");
    } catch (error) {
      if (shouldRefreshLineLogin(error)) {
        await loginWithLine();
        return;
      }
      setFeedback(error instanceof Error ? error.message : "スケジュール保存に失敗しました。");
    }
  }

  async function deleteSchedule(id: string) {
    const target = schedules.find((entry) => entry.id === id);
    const confirmed = window.confirm(
      `${target ? `${target.eventDate} ${target.content}` : "この予定"}を削除します。元に戻せません。`
    );
    if (!confirmed) {
      return;
    }
    try {
      const idToken = await requireIdToken();
      const response = await fetch(`/api/schedules/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });
      if (!response.ok) {
        throw new Error("スケジュール削除に失敗しました。");
      }
      setSchedules((current) => current.filter((entry) => entry.id !== id));
      if (modalEntryId === id) {
        closeModal();
      }
      setFeedback("スケジュールを削除しました。");
    } catch (error) {
      if (shouldRefreshLineLogin(error)) {
        await loginWithLine();
        return;
      }
      setFeedback(error instanceof Error ? error.message : "スケジュール削除に失敗しました。");
    }
  }

  async function saveAttendance() {
    if (!modalEntry) {
      return;
    }
    try {
      const idToken = await requireIdToken();
      const response = await fetch(`/api/schedules/${modalEntry.id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          attendance: { status: attendanceStatus, note: attendanceNote }
        })
      });
      if (!response.ok) {
        const detail = await readResponseError(response, "出欠保存に失敗しました。");
        throw new Error(detail);
      }
      const saved = (await response.json()) as ScheduleRow;
      upsertSchedule(saved);
      setFeedback("出欠を保存しました。");
    } catch (error) {
      if (shouldRefreshLineLogin(error)) {
        await loginWithLine();
        return;
      }
      setFeedback(error instanceof Error ? error.message : "出欠保存に失敗しました。");
    }
  }

  async function saveDuty() {
    if (!modalEntry) {
      return;
    }
    try {
      const idToken = await requireIdToken();
      const response = await fetch(`/api/schedules/${modalEntry.id}/duty`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          duty: {
            assignedUserId: dutyUserId || null,
            note: dutyNote
          }
        })
      });
      if (!response.ok) {
        const detail = await readResponseError(response, "当番保存に失敗しました。");
        throw new Error(detail);
      }
      const saved = (await response.json()) as ScheduleRow;
      upsertSchedule(saved);
      setFeedback("当番を更新しました。");
    } catch (error) {
      if (shouldRefreshLineLogin(error)) {
        await loginWithLine();
        return;
      }
      setFeedback(error instanceof Error ? error.message : "当番保存に失敗しました。");
    }
  }

  async function saveCarpool() {
    if (!modalEntry) {
      return;
    }
    if (!carpoolChoice) {
      setFeedback("配車管理ではいずれかを選択してください。");
      return;
    }
    try {
      const idToken = await requireIdToken();
      const response = await fetch(`/api/schedules/${modalEntry.id}/carpool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          carpool: {
            choice: carpoolChoice
          }
        })
      });
      if (!response.ok) {
        const detail = await readResponseError(response, "配車保存に失敗しました。");
        throw new Error(detail);
      }
      const saved = (await response.json()) as ScheduleRow;
      upsertSchedule(saved);
      setFeedback("配車希望を更新しました。");
    } catch (error) {
      if (shouldRefreshLineLogin(error)) {
        await loginWithLine();
        return;
      }
      setFeedback(error instanceof Error ? error.message : "配車保存に失敗しました。");
    }
  }

  async function saveBulkAttendance() {
    if (bulkAttendanceTargets.length === 0) {
      setFeedback("一括登録できる予定がありません。");
      return;
    }

    try {
      const idToken = await requireIdToken();
      const savedRows: ScheduleRow[] = [];

      for (const entry of bulkAttendanceTargets) {
        const response = await fetch(`/api/schedules/${entry.id}/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken,
            attendance: { status: bulkAttendanceStatus, note: bulkAttendanceNote }
          })
        });
        if (!response.ok) {
          const detail = await readResponseError(response, `出欠一括登録に失敗しました。`);
          throw new Error(`${entry.eventDate} ${entry.content}: ${detail}`);
        }
        savedRows.push((await response.json()) as ScheduleRow);
      }

      setSchedules((current) =>
        current.map((entry) => savedRows.find((saved) => saved.id === entry.id) || entry)
      );
      setBulkAttendanceOpen(false);
      setFeedback(`${savedRows.length}件の予定に出欠を一括登録しました。`);
    } catch (error) {
      if (shouldRefreshLineLogin(error)) {
        await loginWithLine();
        return;
      }
      setFeedback(error instanceof Error ? error.message : "出欠一括登録に失敗しました。");
    }
  }

  async function importSchedules(file: File) {
    try {
      if (!/\.(csv|txt|tsv)$/i.test(file.name)) {
        setFeedback("現時点の一括取込は CSV / TSV に対応しています。画像は次段階で追加します。");
        return;
      }
      const parsed = parseScheduleCsv(await file.text());
      if (parsed.length === 0) {
        setFeedback("取り込める予定が見つかりませんでした。");
        return;
      }
      const idToken = await requireIdToken();
      const savedRows: ScheduleRow[] = [];
      for (const [index, schedule] of parsed.entries()) {
        if (schedule.tags.length === 0) {
          throw new Error(`CSV ${index + 2}行目の学年タグを解釈できませんでした。`);
        }
        if (!schedule.location) {
          throw new Error(`CSV ${index + 2}行目の場所が空です。`);
        }
        const response = await fetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, schedule })
        });
        if (!response.ok) {
          const detail = await response.text();
          throw new Error(`CSV ${index + 2}行目の取り込みに失敗しました。${detail}`);
        }
        savedRows.push((await response.json()) as ScheduleRow);
      }
      setSchedules((current) => [...current, ...savedRows]);
      setFeedback(`${savedRows.length}件の予定を取り込みました。`);
    } catch (error) {
      if (shouldRefreshLineLogin(error)) {
        await loginWithLine();
        return;
      }
      setFeedback(error instanceof Error ? error.message : "取り込みに失敗しました。");
    }
  }

  const totalDutyPending = schedules.filter((entry) => !entry.dutyAssignment?.assignedUser).length;
  const latestUpdated = schedules
    .map((entry) => entry.updatedAt)
    .sort((left, right) => right.localeCompare(left))[0];

  function exportGoogleCalendar() {
    if (visibleSchedules.length === 0) {
      setFeedback("現在の絞り込み条件で書き出せる予定がありません。");
      return;
    }

    const ics = buildScheduleIcs(
      visibleSchedules.map((entry) => ({
        id: entry.id,
        eventDate: entry.eventDate,
        startTime: entry.startTime,
        endTime: entry.endTime,
        location: entry.location,
        content: entry.content,
        tags: entry.tags,
        note: entry.note
      }))
    );

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fc-kumano-schedule-${selectedMonth}${filterTag === "すべて" ? "" : `-${filterTag}`}.ics`;
    link.click();
    URL.revokeObjectURL(url);
    setFeedback("Googleカレンダー取り込み用ファイルを書き出しました。同期はされません。");
  }

  return (
    <div className="app-shell schedule-shell">
      <header className="hero schedule-hero">
        <div>
          <p className="eyebrow">LINE Mini App</p>
          <div className="brand-lockup">
            <img src="/fc-kumano-logo.png" alt="FC KUMANO logo" className="brand-logo" />
            <div>
              <h1>FC KUMANO スケジュール管理</h1>
              <p className="hero-copy">月間予定、出欠、当番、試合日のスコア連携をトップで扱います。</p>
            </div>
          </div>
        </div>
        <aside className="auth-box">
          {auth.pictureUrl ? (
            <div className="auth-row">
              <img src={auth.pictureUrl} alt={auth.displayName} />
              <div>
                <strong>{auth.displayName}</strong>
                <div className="auth-meta">出欠入力と修正者として記録されます</div>
              </div>
            </div>
          ) : (
            <div>
              <strong>{auth.status === "loading" ? "LINE認証を確認中" : auth.displayName || "LINE未ログイン"}</strong>
              <div className={`auth-meta ${auth.error ? "error" : ""}`}>{auth.error || "保存前にログイン状態を確認します"}</div>
            </div>
          )}
          <div className="schedule-hero-actions">
            {!auth.idToken ? (
              <button className="primary" type="button" onClick={() => void loginWithLine()}>
                LINEでログイン
              </button>
            ) : (
              <button className="ghost link-chip" type="button" onClick={() => void logoutFromLine()}>
                LINEログアウト
              </button>
            )}
            <Link href="/guide" className="ghost link-chip">
              使い方ガイド
            </Link>
            <Link href="/score" className="ghost link-chip">
              スコア管理へ
            </Link>
          </div>
        </aside>
      </header>

      {feedback ? <p className={feedback.includes("失敗") ? "error" : "muted"}>{feedback}</p> : null}

      <section className="card schedule-card">
        <div className="section-title schedule-title">
          <div>
            <h2>月間スケジュール</h2>
            <span>
              当番調整あり {totalDutyPending}件 / 最新更新{" "}
              {latestUpdated ? new Date(latestUpdated).toLocaleDateString("ja-JP") : "-"}
            </span>
          </div>
          <div className="action-row">
            <button className="ghost dark-ghost" type="button" onClick={openBulkAttendance}>
              出欠一括登録
            </button>
            <button className="primary" type="button" onClick={openNewEditor}>
              予定を追加
            </button>
          </div>
        </div>

        <div className="results-toolbar compact-toolbar schedule-toolbar">
          <div className="month-filter">
            <span className="month-filter-label">表示月</span>
            <div className="month-chip-row">
              {monthOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`tab month-chip ${selectedMonth === option.value ? "is-active" : ""}`}
                  onClick={() => setSelectedMonth(option.value)}
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
                className={`tab month-chip ${compactView ? "is-active" : ""}`}
                onClick={() => setCompactView(true)}
              >
                短縮
              </button>
              <button
                type="button"
                className={`tab month-chip ${compactView ? "" : "is-active"}`}
                onClick={() => setCompactView(false)}
              >
                通常
              </button>
            </div>
          </div>
          <label>
            学年
            <select value={filterTag} onChange={(event) => setFilterTag(event.target.value)}>
              <option value="すべて">すべて</option>
              {SCHEDULE_TAG_OPTIONS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
          <label className="file-input">
            予定表を取り込む
            <input
              type="file"
              accept=".csv,.tsv,.txt,.png,.jpg,.jpeg"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void importSchedules(file);
                }
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        <div className={`table-wrap schedule-table-wrap ${compactView ? "is-compact" : ""}`}>
          <table className={`results-table schedule-results-table ${compactView ? "is-compact" : ""}`}>
            <thead>
              <tr>
                <th>日付</th>
                <th>学年</th>
                <th>時間</th>
                <th>場所</th>
                <th>内容</th>
                <th>当番</th>
                <th>出欠</th>
                {!compactView ? <th>修正</th> : null}
                {!compactView ? <th>操作</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleSchedules.length === 0 ? (
                <tr>
                  <td colSpan={compactView ? 7 : 9} className="empty-state schedule-empty">
                    この月の予定はまだありません。
                  </td>
                </tr>
              ) : (
                visibleSchedules.map((entry) => {
                  const counts = summarizeAttendance(entry.attendances);
                  const assignedName = entry.dutyAssignment?.assignedUser?.displayName || entry.dutyLabel || "未定";
                  return (
                    <tr key={entry.id} className={entry.isMatch ? "schedule-is-match" : ""}>
                      <td>{renderScheduleDate(entry.eventDate)}</td>
                      <td>
                        <div className="badge-row">
                          {sortTagsForDisplay(entry.tags).map((tag) => (
                            <span key={tag} className={`badge ${tagClassName(tag)}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{renderScheduleTime(entry.startTime, entry.endTime)}</td>
                      <td>{entry.location}</td>
                      <td>
                        <div>{entry.content}</div>
                        {entry.note ? <div className="muted">{entry.note}</div> : null}
                      </td>
                      <td>
                        <div>{assignedName}</div>
                      </td>
                      <td>
                        <div className="badge-row">
                          <span className="badge result-win">参 {counts.present}</span>
                          <span className="badge result-loss">欠 {counts.absent}</span>
                          <span className="badge result-draw">未 {counts.pending}</span>
                        </div>
                      </td>
                      {!compactView ? (
                        <td>
                          <div>{entry.updatedBy?.displayName || "-"}</div>
                          <div className="muted">{formatDateTimeCell(entry.updatedAt)}</div>
                        </td>
                      ) : null}
                      {!compactView ? (
                        <td>
                          <div className="schedule-actions">
                            <button className="text-button" type="button" onClick={() => openModal(entry.id, "attendance-input")}>
                              出欠
                            </button>
                            <button className="text-button" type="button" onClick={() => openModal(entry.id, "attendance-list")}>
                              一覧
                            </button>
                            {!shouldHideCarpool(entry.location) ? (
                              <button className="text-button" type="button" onClick={() => openModal(entry.id, "carpool")}>
                                配車
                              </button>
                            ) : null}
                            <button className="text-button" type="button" onClick={() => openModal(entry.id, "duty")}>
                              当番
                            </button>
                            <button className="text-button" type="button" onClick={() => openEditEditor(entry)}>
                              修正
                            </button>
                            <button className="text-button danger" type="button" onClick={() => void deleteSchedule(entry.id)}>
                              削除
                            </button>
                            {entry.isMatch ? (
                              <Link href={buildScoreHref(entry)} className="text-button score-link-inline">
                                スコア管理
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="schedule-footer-actions">
          <button className="ghost calendar-export" type="button" onClick={exportGoogleCalendar}>
            Googleカレンダー取込
          </button>
          <p className="calendar-note">Googleカレンダーへは現在の絞り込み結果だけを書き出します。取り込み後も同期はされません。</p>
        </div>
      </section>

      {modalEntry ? (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="modal-card schedule-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>
                  {formatDateCell(modalEntry.eventDate)} {modalEntry.content}
                </h2>
                <p>
                  {modalEntry.location} / {formatTimeRange(modalEntry.startTime, modalEntry.endTime)} / 修正者:{" "}
                  {modalEntry.updatedBy?.displayName || "-"}
                </p>
              </div>
              <button className="ghost modal-close" type="button" onClick={closeModal}>
                閉じる
              </button>
            </div>

            <div className="modal-tabs schedule-modal-tabs">
              <button className={`tab ${modalTab === "attendance-input" ? "is-active" : ""}`} type="button" onClick={() => setModalTab("attendance-input")}>
                出欠入力
              </button>
              <button className={`tab ${modalTab === "attendance-list" ? "is-active" : ""}`} type="button" onClick={() => setModalTab("attendance-list")}>
                出欠一覧
              </button>
              {!shouldHideCarpool(modalEntry.location) ? (
                <button className={`tab ${modalTab === "carpool" ? "is-active" : ""}`} type="button" onClick={() => setModalTab("carpool")}>
                  配車管理
                </button>
              ) : null}
              <button className={`tab ${modalTab === "duty" ? "is-active" : ""}`} type="button" onClick={() => setModalTab("duty")}>
                当番管理
              </button>
            </div>

            {modalTab === "attendance-input" ? (
              <div className="modal-section">
                <div className="attendance-choice-row">
                  {(["参加", "欠席", "未定"] as AttendanceStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`status-toggle ${attendanceStatus === status ? "is-active" : ""}`}
                      onClick={() => setAttendanceStatus(status)}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <label>
                  備考
                  <input value={attendanceNote} onChange={(event) => setAttendanceNote(event.target.value)} placeholder="集合や欠席理由など" />
                </label>
                <div className="stack-actions">
                  <button className="primary" type="button" onClick={() => void saveAttendance()}>
                    出欠を保存
                  </button>
                </div>
              </div>
            ) : null}

            {modalTab === "attendance-list" ? (
              <div className="modal-section">
                <div className="summary-grid schedule-summary-grid">
                  <div className="summary-card">
                    <h3>参加</h3>
                    <strong>{summarizeAttendance(modalEntry.attendances).present}</strong>
                  </div>
                  <div className="summary-card">
                    <h3>欠席</h3>
                    <strong>{summarizeAttendance(modalEntry.attendances).absent}</strong>
                  </div>
                  <div className="summary-card">
                    <h3>未定</h3>
                    <strong>{summarizeAttendance(modalEntry.attendances).pending}</strong>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="results-table modal-results-table">
                    <thead>
                      <tr>
                        <th>入力者</th>
                        <th>出欠</th>
                        <th>備考</th>
                        <th>更新</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalEntry.attendances.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="empty-state schedule-empty">
                            まだ出欠入力はありません。
                          </td>
                        </tr>
                      ) : (
                        modalEntry.attendances.map((attendance) => (
                          <tr key={attendance.id}>
                            <td>{attendance.user.displayName}</td>
                            <td>
                              <span className={`badge ${attendanceBadgeClass(attendance.status)}`}>{attendance.status}</span>
                            </td>
                            <td>{attendance.note || "-"}</td>
                            <td>{formatDateTimeCell(attendance.updatedAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {modalTab === "duty" ? (
              <div className="modal-section">
                <label>
                  参加者から当番を選択
                  <select value={dutyUserId} onChange={(event) => setDutyUserId(event.target.value)}>
                    <option value="">未設定</option>
                    {participatingUsers.map((attendance) => (
                      <option key={attendance.userId} value={attendance.userId}>
                        {attendance.user.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  メモ
                  <input value={dutyNote} onChange={(event) => setDutyNote(event.target.value)} placeholder="集合時間や役割メモ" />
                </label>
                <div className="muted duty-meta">
                  {modalEntry.dutyAssignment?.decidedBy ? (
                    <>
                      決定者: {modalEntry.dutyAssignment.decidedBy.displayName} / 決定日時:{" "}
                      {modalEntry.dutyAssignment.decidedAt ? formatDateTimeCell(modalEntry.dutyAssignment.decidedAt) : "-"}
                    </>
                  ) : (
                    "まだ当番は確定していません。"
                  )}
                </div>
                <div className="stack-actions">
                  <button className="primary" type="button" onClick={() => void saveDuty()}>
                    当番を保存
                  </button>
                </div>
              </div>
            ) : null}

            {modalTab === "carpool" ? (
              <div className="modal-section">
                <div className="attendance-choice-row">
                  {CARPOOL_CHOICES.map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      className={`status-toggle ${carpoolChoice === choice ? "is-active" : ""}`}
                      onClick={() => setCarpoolChoice(choice)}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
                <div className="summary-grid schedule-summary-grid">
                  {CARPOOL_CHOICES.map((choice) => (
                    <div key={choice} className="summary-card">
                      <h3>{choice}</h3>
                      <strong>{modalEntry.carpoolPreferences.filter((preference) => preference.choice === choice).length}</strong>
                    </div>
                  ))}
                </div>
                <div className="table-wrap">
                  <table className="results-table modal-results-table">
                    <thead>
                      <tr>
                        <th>入力者</th>
                        <th>選択</th>
                        <th>更新</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalEntry.carpoolPreferences.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="empty-state schedule-empty">
                            まだ配車の入力はありません。
                          </td>
                        </tr>
                      ) : (
                        modalEntry.carpoolPreferences.map((preference) => (
                          <tr key={preference.id}>
                            <td>{preference.user.displayName}</td>
                            <td>{preference.choice}</td>
                            <td>{formatDateTimeCell(preference.updatedAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="stack-actions">
                  <button className="primary" type="button" onClick={() => void saveCarpool()}>
                    配車を保存
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {editorOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeEditor}>
          <div className="modal-card schedule-modal editor-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>{editingId ? "予定を修正" : "予定を追加"}</h2>
                <p>修正者はLINEログイン名で記録されます。</p>
              </div>
              <button className="ghost modal-close" type="button" onClick={closeEditor}>
                閉じる
              </button>
            </div>
            <div className="form-grid schedule-form-grid">
              <label>
                日付
                <input
                  type="date"
                  value={scheduleForm.eventDate}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, eventDate: event.target.value }))}
                />
              </label>
              <label>
                タグ
                <TagSelector value={scheduleForm.tags} onChange={(tags) => setScheduleForm((current) => ({ ...current, tags }))} />
              </label>
              <label>
                開始
                <input
                  type="text"
                  value={scheduleForm.startTime}
                  placeholder="09:00 または -"
                  onChange={(event) => setScheduleForm((current) => ({ ...current, startTime: event.target.value }))}
                />
              </label>
              <label>
                終了
                <input
                  type="text"
                  value={scheduleForm.endTime}
                  placeholder="11:00 または -"
                  onChange={(event) => setScheduleForm((current) => ({ ...current, endTime: event.target.value }))}
                />
              </label>
              <label>
                場所
                <input
                  value={scheduleForm.location}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, location: event.target.value }))}
                />
              </label>
              <label>
                内容
                <input
                  value={scheduleForm.content}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      content: event.target.value,
                      isMatch: inferIsMatch(event.target.value)
                    }))
                  }
                />
              </label>
              <label>
                登板メモ
                <input
                  value={scheduleForm.dutyLabel}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, dutyLabel: event.target.value }))}
                />
              </label>
              <label>
                備考
                <input value={scheduleForm.note} onChange={(event) => setScheduleForm((current) => ({ ...current, note: event.target.value }))} />
              </label>
            </div>
            {feedback ? <p className={feedback.includes("失敗") ? "error" : "muted"}>{feedback}</p> : null}
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={scheduleForm.isMatch}
                onChange={(event) => setScheduleForm((current) => ({ ...current, isMatch: event.target.checked }))}
              />
              試合として扱う
            </label>
            <div className="stack-actions">
              <button className="primary" type="button" onClick={() => void saveSchedule()}>
                {editingId ? "予定を更新" : "予定を保存"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bulkAttendanceOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeBulkAttendance}>
          <div className="modal-card schedule-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>出欠一括登録</h2>
                <p>
                  現在の表示月・学年から、日付と対象タグを選んでまとめて登録します。
                </p>
              </div>
              <button className="ghost modal-close" type="button" onClick={closeBulkAttendance}>
                閉じる
              </button>
            </div>
            <div className="modal-section">
              <div className="form-grid schedule-form-grid">
                <label>
                  日付
                  <select value={bulkAttendanceDate} onChange={(event) => setBulkAttendanceDate(event.target.value)}>
                    <option value="すべて">すべての日付</option>
                    {bulkAttendanceDateOptions.map((date) => (
                      <option key={date} value={date}>
                        {formatDateCell(date)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  対象タグ
                  <select value={bulkAttendanceTag} onChange={(event) => setBulkAttendanceTag(event.target.value)}>
                    <option value="すべて">すべてのタグ</option>
                    {bulkAttendanceTagOptions.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="attendance-choice-row">
                {(["参加", "欠席", "未定"] as AttendanceStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`status-toggle ${bulkAttendanceStatus === status ? "is-active" : ""}`}
                    onClick={() => setBulkAttendanceStatus(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <label>
                備考
                <input value={bulkAttendanceNote} onChange={(event) => setBulkAttendanceNote(event.target.value)} placeholder="全予定に同じ備考を入れます" />
              </label>
              <p className="muted">対象件数: {bulkAttendanceTargets.length}件</p>
              <div className="stack-actions">
                <button className="primary" type="button" onClick={() => void saveBulkAttendance()}>
                  一括保存
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

async function fetchLiffSession(): Promise<AuthState> {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) {
    return { status: "error", idToken: "", displayName: "", error: "NEXT_PUBLIC_LIFF_ID が未設定です。" };
  }

  const { default: liff } = await import("@line/liff");
  await liff.init({ liffId });

  if (!liff.isLoggedIn()) {
    return { status: "ready", idToken: "", displayName: "未ログイン" };
  }

  const [profile, idToken] = await Promise.all([liff.getProfile(), Promise.resolve(liff.getIDToken() || "")]);

  return {
    status: "ready",
    idToken,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
    lineUserId: profile.userId
  };
}

function buildLiffErrorMessage(error: unknown, fallback: string) {
  const detail =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : "";

  if (detail) {
    return `${fallback} ${detail}`;
  }

  return `${fallback} LINE Developers の LIFF Endpoint URL が現在のURLに一致しているか確認してください。`;
}

function shouldRefreshLineLogin(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("LINE認証") ||
    error.message.includes("LINEログインが必要") ||
    error.message.includes("LINEログインを更新しています")
  );
}

async function readResponseError(response: Response, fallback: string) {
  const detail = (await response.text()).trim();
  return detail || fallback;
}

function TagSelector({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  return (
    <div className="tag-selector compact">
      {SCHEDULE_TAG_OPTIONS.map((option) => {
        const checked = value.includes(option);
        return (
          <label className="tag-option" key={option}>
            <input
              type="checkbox"
              checked={checked}
              onChange={() =>
                onChange(checked ? value.filter((tag) => tag !== option) : [...value, option])
              }
            />
            <span>{option}</span>
          </label>
        );
      })}
    </div>
  );
}

function summarizeAttendance(attendances: AttendanceRow[]) {
  return attendances.reduce(
    (acc, attendance) => {
      if (attendance.status === "参加") acc.present += 1;
      else if (attendance.status === "欠席") acc.absent += 1;
      else acc.pending += 1;
      return acc;
    },
    { present: 0, absent: 0, pending: 0 }
  );
}

function tagClassName(tag: string) {
  if (tag === "低学年" || tag === "1年" || tag === "2年") return "tag-low";
  if (tag === "中学年" || tag === "3年" || tag === "4年") return "tag-mid";
  if (tag === "高学年" || tag === "5年" || tag === "6年") return "tag-high";
  return "";
}

function primaryTagRank(tags: string[]) {
  const sorted = [...tags].sort((left, right) => scheduleRowTagRank(left) - scheduleRowTagRank(right));
  const first = sorted[0];
  return scheduleRowTagRank(first || "");
}

function scheduleRowTagRank(tag: string) {
  const index = SCHEDULE_ROW_TAG_ORDER.indexOf(tag as (typeof SCHEDULE_ROW_TAG_ORDER)[number]);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function sortTagsForDisplay(tags: string[]) {
  return [...tags].sort((left, right) => {
    const leftIndex = SCHEDULE_BADGE_ORDER.indexOf(left as (typeof SCHEDULE_BADGE_ORDER)[number]);
    const rightIndex = SCHEDULE_BADGE_ORDER.indexOf(right as (typeof SCHEDULE_BADGE_ORDER)[number]);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right, "ja");
    }
    if (leftIndex === -1) {
      return 1;
    }
    if (rightIndex === -1) {
      return -1;
    }
    return leftIndex - rightIndex;
  });
}

function attendanceBadgeClass(status: string) {
  if (status === "参加") return "result-win";
  if (status === "欠席") return "result-loss";
  return "result-draw";
}

function shouldHideCarpool(location: string) {
  return location.includes("板七小");
}

function formatDateCell(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", weekday: "short" }).format(
    new Date(`${value}T00:00:00+09:00`)
  );
}

function formatDateTimeCell(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function buildScoreHref(entry: ScheduleRow) {
  const params = new URLSearchParams({
    date: entry.eventDate,
    tags: entry.tags.join(","),
    title: entry.content,
    tournament: entry.location,
    opponent: extractOpponentFromContent(entry.content)
  });
  return `/score?${params.toString()}`;
}

function renderScheduleTime(startTime: string, endTime: string) {
  const label = formatTimeRange(startTime, endTime);
  if (label === "-" || !endTime || startTime === endTime) {
    return <span className="schedule-time"><span className="schedule-time-part">{label}</span></span>;
  }

  return (
    <span className="schedule-time">
      <span className="schedule-time-part">{startTime}</span>
      <span className="schedule-time-dash">-</span>
      <span className="schedule-time-part">{endTime}</span>
    </span>
  );
}

function renderScheduleDate(value: string) {
  const date = new Date(`${value}T00:00:00+09:00`);
  const monthDay = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(date);
  const weekday = new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(date);

  return (
    <span className="schedule-date">
      <span className="schedule-date-main">{monthDay}</span>
      <span className="schedule-date-week">({weekday})</span>
    </span>
  );
}

function getMonthOptions(selectedMonth: string) {
  const [yearText = "2026", monthText = "1"] = selectedMonth.split("-");
  const baseDate = new Date(Number(yearText), Number(monthText) - 1, 1);

  return [-1, 0, 1].map((offset) => {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: `${date.getMonth() + 1}月`
    };
  });
}

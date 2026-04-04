"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type CalendarExportClientProps = {
  month: string;
  tag: string;
};

export function CalendarExportClient({ month, tag }: CalendarExportClientProps) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const apiUrl = useMemo(() => {
    const query = new URLSearchParams();
    if (month) {
      query.set("month", month);
    }
    if (tag) {
      query.set("tag", tag);
    }
    return `/api/schedules/calendar?${query.toString()}`;
  }, [month, tag]);

  async function handleOpenCalendar() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error((await response.text()) || "カレンダーファイルの作成に失敗しました。");
      }

      const blob = await response.blob();
      const filename = getFilename(month, tag);
      const file = new File([blob], filename, { type: "text/calendar" });

      if (
        typeof navigator !== "undefined" &&
        "share" in navigator &&
        "canShare" in navigator &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: "FC KUMANO スケジュール",
          text: "カレンダーアプリへ取り込むファイルです。",
          files: [file]
        });
        setMessage("共有シートを開きました。Googleカレンダーや標準カレンダーを選んで取り込んでください。");
        return;
      }

      downloadBlob(blob, filename);
      setMessage("icsファイルをダウンロードしました。Googleカレンダーまたは標準カレンダーへ取り込んでください。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "カレンダー書き出しに失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="calendar-export-page">
      <div className="calendar-export-card">
        <p className="eyebrow">Calendar Export</p>
        <h1>Googleカレンダー取込</h1>
        <p className="calendar-export-copy">
          書き出し対象は、現在の表示月と担当学年で絞り込まれた予定です。取り込み後もこのアプリとは同期されません。
        </p>
        <dl className="calendar-export-summary">
          <div>
            <dt>表示月</dt>
            <dd>{formatMonthLabel(month)}</dd>
          </div>
          <div>
            <dt>担当学年</dt>
            <dd>{tag || "すべて"}</dd>
          </div>
        </dl>
        <button className="primary calendar-export-action" type="button" disabled={busy || !month} onClick={() => void handleOpenCalendar()}>
          {busy ? "準備中..." : "カレンダーに取り込む"}
        </button>
        <a className="ghost link-chip calendar-export-download" href={apiUrl} download={getFilename(month, tag)}>
          icsファイルをダウンロード
        </a>
        {message ? <p className="calendar-export-feedback">{message}</p> : null}
        <p className="calendar-export-note">
          LINEミニアプリ内では外部ブラウザへ遷移する場合があります。複数予定の一括取込は、一般的にはアプリ直接起動よりも ics ファイル共有またはダウンロードの方が安定します。
        </p>
        <Link className="ghost link-chip" href="/">
          スケジュール管理へ戻る
        </Link>
      </div>
    </main>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getFilename(month: string, tag: string) {
  return `fc-kumano-schedule-${month || "export"}${tag ? `-${tag}` : ""}.ics`;
}

function formatMonthLabel(month: string) {
  if (!month) {
    return "未指定";
  }
  const [year = "", monthNumber = ""] = month.split("-");
  return `${year}年${Number(monthNumber)}月`;
}

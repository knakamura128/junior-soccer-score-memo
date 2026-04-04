"use client";

import Link from "next/link";
import { useMemo } from "react";

type CalendarExportClientProps = {
  month: string;
  tag: string;
};

export function CalendarExportClient({ month, tag }: CalendarExportClientProps) {
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
        <a className="primary calendar-export-action" href={apiUrl}>
          カレンダーに取り込む
        </a>
        <a className="ghost link-chip calendar-export-download" href={apiUrl} download={getFilename(month, tag)}>
          icsファイルをダウンロード
        </a>
        <p className="calendar-export-note">
          まずは端末の標準動作でカレンダーアプリまたはダウンロードへ進みます。自動で取り込めない場合は、下の ics ファイルを保存して Googleカレンダーまたは標準カレンダーへ取り込んでください。
        </p>
        <Link className="ghost link-chip" href="/">
          スケジュール管理へ戻る
        </Link>
      </div>
    </main>
  );
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

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
        <h1>カレンダー取り込み</h1>
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
        <a className="ghost link-chip calendar-export-download" href={apiUrl} download={getFilename(month, tag)}>
          icsファイルをダウンロード
        </a>
        <p className="calendar-export-note">
          iPhone や Android では、まず ics ファイルを保存してから標準カレンダーや Googleカレンダーへ取り込んでください。特に iPhone の Safari では、直接 Googleカレンダーに入るのではなくダウンロード動作になることがあります。
        </p>
        <div className="calendar-export-summary">
          <div>
            <dt>取り込み手順</dt>
            <dd>
              1. `icsファイルをダウンロード` を押します。
              <br />
              2. ダウンロードした `.ics` を端末のファイルから開きます。
              <br />
              3. 標準カレンダー、または Googleカレンダーで取り込みます。
            </dd>
          </div>
          <div>
            <dt>補足</dt>
            <dd>Googleカレンダーへ確実に入れる場合は、PC 版 Googleカレンダーで `.ics` を取り込む方法が最も安定します。</dd>
          </div>
        </div>
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

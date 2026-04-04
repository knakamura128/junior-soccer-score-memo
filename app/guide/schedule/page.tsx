import Link from "next/link";

type GuideSchedulePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const scheduleRows = [
  {
    date: "2026-03-20",
    tags: ["低学年", "2年"],
    time: "09:00 - 10:00",
    location: "西が丘FS/A",
    content: "練習",
    duty: "未定",
    attendance: { join: 10, absent: 0, undecided: 0 },
    updatedBy: "保護者A",
    updatedAt: "3/20 23:59"
  },
  {
    date: "2026-03-20",
    tags: ["中学年", "3年", "4年"],
    time: "08:00 - 10:00",
    location: "目白台FS東3",
    content: "練習",
    duty: "未定",
    attendance: { join: 11, absent: 0, undecided: 0 },
    updatedBy: "保護者A",
    updatedAt: "3/21 00:14"
  },
  {
    date: "2026-03-20",
    tags: ["高学年", "5年", "6年"],
    time: "08:00 - 14:00",
    location: "仲町地域センター",
    content: "6年生を送る会",
    duty: "保護者B",
    attendance: { join: 10, absent: 0, undecided: 0 },
    updatedBy: "保護者A",
    updatedAt: "3/21 00:14"
  },
  {
    date: "2026-03-21",
    tags: ["高学年", "5年", "6年"],
    time: "12:00 - 16:00",
    location: "四ツ木橋競技場",
    content: "TOHON CUP卒業大会 集合板五/板七 10:45",
    duty: "保護者B",
    attendance: { join: 9, absent: 1, undecided: 1 },
    updatedBy: "保護者A",
    updatedAt: "3/21 08:10"
  }
];

const attendanceRows = [
  { name: "10 選手A", status: "参加", note: "現地集合", updatedBy: "保護者A", updatedAt: "3/21 08:03" },
  { name: "11 選手B", status: "参加", note: "", updatedBy: "保護者B", updatedAt: "3/21 08:05" },
  { name: "12 選手C", status: "欠席", note: "学校行事", updatedBy: "保護者C", updatedAt: "3/21 08:11" },
  { name: "13 選手D", status: "未定", note: "午後から合流予定", updatedBy: "保護者D", updatedAt: "3/21 08:20" }
];

const dutyCandidates = [
  { name: "保護者A", status: "参加" },
  { name: "保護者B", status: "参加" },
  { name: "保護者C", status: "欠席" },
  { name: "保護者D", status: "未定" }
];

export default async function GuideSchedulePage({ searchParams }: GuideSchedulePageProps) {
  const params = searchParams ? await searchParams : {};
  const view = typeof params.view === "string" ? params.view : "top";
  const device = typeof params.device === "string" ? params.device : "mobile";
  const closeHref = `/guide/schedule?view=top&device=${device}`;
  const exitHref = "/guide";

  return (
    <div className={`app-shell schedule-shell guide-shell guide-device-${device}`}>
      {view === "top" ? <ScheduleTopScene exitHref={exitHref} /> : null}
      {view === "attendance-input" ? <AttendanceInputScene closeHref={closeHref} /> : null}
      {view === "attendance-list" ? <AttendanceListScene closeHref={closeHref} /> : null}
      {view === "bulk-attendance" ? <BulkAttendanceScene closeHref={closeHref} /> : null}
      {view === "carpool" ? <CarpoolScene closeHref={closeHref} /> : null}
      {view === "duty" ? <DutyScene closeHref={closeHref} /> : null}
      {view === "edit" ? <EditScene closeHref={closeHref} /> : null}
    </div>
  );
}

function ScheduleTopScene({ exitHref }: { exitHref: string }) {
  return (
    <section className="card schedule-card guide-scene-card guide-annotated">
      <div className="section-title schedule-title">
        <div>
          <h2>月間スケジュール</h2>
          <span>当番調整あり 2件 / 最新更新 2026/3/21</span>
        </div>
        <div className="action-row">
          <Link href={exitHref} className="ghost modal-close">
            閉じる
          </Link>
          <button className="ghost dark-ghost" type="button">
            出欠一括登録
          </button>
          <button className="primary" type="button">
            予定を追加
          </button>
        </div>
      </div>

      <div className="results-toolbar compact-toolbar schedule-toolbar">
        <div className="month-filter">
          <span className="month-filter-label">表示月</span>
          <div className="month-chip-row">
            <button className="tab month-chip" type="button">
              2月
            </button>
            <button className="tab month-chip is-active" type="button">
              3月
            </button>
            <button className="tab month-chip" type="button">
              4月
            </button>
          </div>
        </div>
        <div className="month-filter">
          <span className="month-filter-label">表示切替</span>
          <div className="month-chip-row">
            <button className="tab month-chip is-active" type="button">
              短縮
            </button>
            <button className="tab month-chip" type="button">
              通常
            </button>
          </div>
        </div>
        <label>
          学年
          <select defaultValue="すべて">
            <option>すべて</option>
            <option>キッズ</option>
            <option>低学年</option>
            <option>中学年</option>
            <option>高学年</option>
          </select>
        </label>
      </div>

      <div className="table-wrap schedule-table-wrap is-compact">
        <table className="results-table schedule-results-table is-compact">
          <thead>
            <tr>
              <th>日付</th>
              <th>学年</th>
              <th>時間</th>
              <th>場所</th>
              <th>内容</th>
              <th>当番</th>
              <th>出欠</th>
            </tr>
          </thead>
          <tbody>
            {scheduleRows.map((entry) => (
              <tr key={`${entry.date}-${entry.content}`}>
                <td>{renderScheduleDate(entry.date)}</td>
                <td>
                  <div className="badge-row">
                    {entry.tags.map((tag) => (
                      <span key={tag} className={`badge ${tagClassName(tag)}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td>{renderScheduleTime(entry.time)}</td>
                <td>{entry.location}</td>
                <td>{entry.content}</td>
                <td>{entry.duty}</td>
                <td>
                  <div className="badge-row">
                    <span className="badge result-win">参 {entry.attendance.join}</span>
                    <span className="badge result-loss">欠 {entry.attendance.absent}</span>
                    <span className="badge result-draw">未 {entry.attendance.undecided}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="schedule-footer-actions">
        <div className="footer-button-row">
          <label className="file-input schedule-import-input">
            予定表を取り込む
            <input type="file" />
          </label>
          <button className="ghost calendar-export" type="button">
            Googleカレンダー取込
          </button>
        </div>
        <p className="calendar-note">予定表取込では、日付 / 開始 / 終了 / 場所 / 内容 / タグが完全一致する予定は自動でスキップします。</p>
        <p className="calendar-note">Googleカレンダーへ取り込み後、このアプリとは同期されません。</p>
      </div>
      <GuideCallout className="callout-top-month" number="1" text="表示月を切り替えると、その月の予定だけを表示します。" />
      <GuideCallout className="callout-top-compact" number="2" text="短縮は月全体を見やすくする表示です。修正や操作は通常で確認します。" />
      <GuideCallout className="callout-top-import" number="3" text="予定表の取込と Googleカレンダー取込は下部にまとめています。完全一致の予定は取込時にスキップします。" />
      <GuideCallout className="callout-top-row" number="4" text="通常表示の操作では、出欠、一覧、配車、当番、修正、削除を使えます。" />
      <GuideCallout className="callout-top-calendar" number="5" text="下部の Googleカレンダー取込は、今見えている月と学年の内容だけを書き出します。" />
    </section>
  );
}

function AttendanceInputScene({ closeHref }: { closeHref: string }) {
  return (
    <div className="modal-backdrop guide-modal-backdrop">
      <div className="modal-card schedule-modal guide-annotated" role="dialog" aria-modal="true">
        <div className="section-title">
          <div>
            <h2>出欠を入力</h2>
            <span>2026/3/21 四ツ木橋競技場 / TOHON CUP卒業大会</span>
          </div>
          <Link href={closeHref} className="ghost modal-close">
            閉じる
          </Link>
        </div>
        <div className="schedule-modal-tabs tab-bar">
          <button className="tab is-active" type="button">
            出欠入力
          </button>
          <button className="tab" type="button">
            出欠一覧
          </button>
          <button className="tab" type="button">
            配車管理
          </button>
          <button className="tab" type="button">
            当番管理
          </button>
        </div>
        <div className="modal-section">
          <div className="attendance-choice-row">
            <button className="status-toggle is-active" type="button">
              参加
            </button>
            <button className="status-toggle" type="button">
              欠席
            </button>
            <button className="status-toggle" type="button">
              未定
            </button>
          </div>
          <label>
            備考
            <input defaultValue="現地集合です。" />
          </label>
          <button className="primary" type="button">
            出欠を保存
          </button>
        </div>
        <GuideCallout className="callout-attend-tabs" number="1" text="出欠入力、一覧、当番管理は同じポップアップ内で切り替えます。" />
        <GuideCallout className="callout-attend-status" number="2" text="参加、欠席、未定のどれかを選んで登録します。" />
        <GuideCallout className="callout-attend-note" number="3" text="備考には現地集合や遅刻予定などを残せます。" />
        <GuideCallout className="callout-attend-save" number="4" text="保存すると、その保護者の LINE 名で更新者が記録されます。" />
      </div>
    </div>
  );
}

function BulkAttendanceScene({ closeHref }: { closeHref: string }) {
  return (
    <div className="modal-backdrop guide-modal-backdrop">
      <div className="modal-card schedule-modal guide-annotated" role="dialog" aria-modal="true">
        <div className="section-title">
          <div>
            <h2>出欠一括登録</h2>
            <span>表示中の月と学年から、さらに日付と対象タグを絞って一括登録します。</span>
          </div>
          <Link href={closeHref} className="ghost modal-close">
            閉じる
          </Link>
        </div>
        <div className="modal-section">
          <div className="bulk-filter-grid">
            <div>
              <p className="bulk-filter-label">日付</p>
              <div className="bulk-checkbox-grid">
                <label className="filter-check is-active">
                  <input type="checkbox" defaultChecked />
                  <span>3/20(金)</span>
                </label>
                <label className="filter-check is-active">
                  <input type="checkbox" defaultChecked />
                  <span>3/21(土)</span>
                </label>
              </div>
              <p className="muted">未選択なら表示中の日付すべてが対象です。</p>
            </div>
            <div>
              <p className="bulk-filter-label">対象タグ</p>
              <div className="bulk-checkbox-grid">
                <label className="filter-check">
                  <input type="checkbox" />
                  <span>低学年</span>
                </label>
                <label className="filter-check">
                  <input type="checkbox" />
                  <span>中学年</span>
                </label>
                <label className="filter-check is-active">
                  <input type="checkbox" defaultChecked />
                  <span>高学年</span>
                </label>
                <label className="filter-check is-active">
                  <input type="checkbox" defaultChecked />
                  <span>6年</span>
                </label>
              </div>
              <p className="muted">未選択なら表示中のタグすべてが対象です。</p>
            </div>
          </div>
          <div className="attendance-choice-row">
            <button className="status-toggle is-active" type="button">
              参加
            </button>
            <button className="status-toggle" type="button">
              欠席
            </button>
            <button className="status-toggle" type="button">
              未定
            </button>
          </div>
          <label>
            備考
            <input defaultValue="現地集合予定です" />
          </label>
          <p className="muted">対象件数: 2件</p>
          <button className="primary" type="button">
            一括保存
          </button>
        </div>
        <GuideCallout className="callout-bulk-filter" number="1" text="表示中の月・学年から、さらに日付と対象タグを複数選択で絞り込みます。" />
        <GuideCallout className="callout-bulk-status" number="2" text="参加、欠席、未定のどれかを選ぶと、対象予定へまとめて同じ出欠を入れられます。" />
        <GuideCallout className="callout-bulk-count" number="3" text="対象件数を見ながら一括保存するので、意図しない予定に入れにくくしています。" />
      </div>
    </div>
  );
}

function CarpoolScene({ closeHref }: { closeHref: string }) {
  return (
    <div className="modal-backdrop guide-modal-backdrop">
      <div className="modal-card schedule-modal guide-annotated" role="dialog" aria-modal="true">
        <div className="section-title">
          <div>
            <h2>配車管理</h2>
            <span>2026/3/21 四ツ木橋競技場 / TOHON CUP卒業大会</span>
          </div>
          <Link href={closeHref} className="ghost modal-close">
            閉じる
          </Link>
        </div>
        <div className="schedule-modal-tabs tab-bar">
          <button className="tab" type="button">
            出欠入力
          </button>
          <button className="tab" type="button">
            出欠一覧
          </button>
          <button className="tab is-active" type="button">
            配車管理
          </button>
          <button className="tab" type="button">
            当番管理
          </button>
        </div>
        <div className="modal-section">
          <div className="attendance-choice-row">
            <button className="status-toggle is-active" type="button">
              配車希望
            </button>
            <button className="status-toggle" type="button">
              現地集合
            </button>
            <button className="status-toggle" type="button">
              自家用車同乗可
            </button>
          </div>
          <div className="summary-grid schedule-summary-grid">
            <div className="summary-card">
              <h3>配車希望</h3>
              <strong>2</strong>
            </div>
            <div className="summary-card">
              <h3>現地集合</h3>
              <strong>6</strong>
            </div>
            <div className="summary-card">
              <h3>自家用車同乗可</h3>
              <strong>1</strong>
            </div>
          </div>
          <button className="primary" type="button">
            配車を保存
          </button>
        </div>
        <GuideCallout className="callout-duty-tabs" number="1" text="配車管理では、配車希望、現地集合、自家用車同乗可の3択で入力します。" />
        <GuideCallout className="callout-duty-select" number="2" text="自分の選択を押して保存すると、一覧に反映されます。" />
      </div>
    </div>
  );
}

function AttendanceListScene({ closeHref }: { closeHref: string }) {
  return (
    <div className="modal-backdrop guide-modal-backdrop">
      <div className="modal-card schedule-modal guide-annotated" role="dialog" aria-modal="true">
        <div className="section-title">
          <div>
            <h2>出欠一覧</h2>
            <span>2026/3/21 四ツ木橋競技場 / TOHON CUP卒業大会</span>
          </div>
          <Link href={closeHref} className="ghost modal-close">
            閉じる
          </Link>
        </div>
        <div className="schedule-modal-tabs tab-bar">
          <button className="tab" type="button">
            出欠入力
          </button>
          <button className="tab is-active" type="button">
            出欠一覧
          </button>
          <button className="tab" type="button">
            当番管理
          </button>
        </div>
        <div className="summary-grid schedule-summary-grid">
          <div className="summary-card">
            <h3>参加</h3>
            <strong>2</strong>
          </div>
          <div className="summary-card">
            <h3>欠席</h3>
            <strong>1</strong>
          </div>
          <div className="summary-card">
            <h3>未定</h3>
            <strong>1</strong>
          </div>
        </div>
        <div className="badge-row guide-filter-row">
          <span className="badge">全員</span>
          <span className="badge result-win">参加</span>
          <span className="badge result-loss">欠席</span>
          <span className="badge result-draw">未定</span>
          <span className="badge tag-high">高学年</span>
        </div>
        <div className="modal-section">
          <table className="results-table modal-results-table">
            <thead>
              <tr>
                <th>選手</th>
                <th>出欠</th>
                <th>入力者</th>
                <th>更新日時</th>
                <th>備考</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>
                    <span className={`badge ${attendanceBadgeClass(row.status)}`}>{row.status}</span>
                  </td>
                  <td>{row.updatedBy}</td>
                  <td>{row.updatedAt}</td>
                  <td>{row.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <GuideCallout className="callout-list-summary" number="1" text="上段の集計で、参加、欠席、未定の人数をすぐ確認できます。" />
        <GuideCallout className="callout-list-filter" number="2" text="絞り込みチップで、全員や参加者だけに絞って確認します。" />
        <GuideCallout className="callout-list-table" number="3" text="一覧には選手名、出欠、入力者、更新日時、備考が並びます。" />
      </div>
    </div>
  );
}

function DutyScene({ closeHref }: { closeHref: string }) {
  return (
    <div className="modal-backdrop guide-modal-backdrop">
      <div className="modal-card schedule-modal guide-annotated" role="dialog" aria-modal="true">
        <div className="section-title">
          <div>
            <h2>当番管理</h2>
            <span>2026/3/21 四ツ木橋競技場 / TOHON CUP卒業大会</span>
          </div>
          <Link href={closeHref} className="ghost modal-close">
            閉じる
          </Link>
        </div>
        <div className="schedule-modal-tabs tab-bar">
          <button className="tab" type="button">
            出欠入力
          </button>
          <button className="tab" type="button">
            出欠一覧
          </button>
          <button className="tab is-active" type="button">
            当番管理
          </button>
        </div>
        <div className="modal-section">
          <label>
            当番担当者
            <select defaultValue="保護者A">
              <option value="">未定</option>
              {dutyCandidates.map((row) => (
                <option key={row.name} value={row.name}>
                  {row.name} ({row.status})
                </option>
              ))}
            </select>
          </label>
          <label>
            メモ
            <input defaultValue="10:15 集合、受付対応" />
          </label>
          <div className="muted duty-meta">決定者: 保護者A / 決定日時: 2026/3/21 08:22</div>
          <div className="summary-card">
            <h3>参加者候補</h3>
            <div className="record-table">
              {dutyCandidates.map((row) => (
                <div key={row.name} className="record-row">
                  <strong>{row.name}</strong>
                  <span>{row.status}</span>
                </div>
              ))}
            </div>
          </div>
          <button className="primary" type="button">
            当番を保存
          </button>
        </div>
        <GuideCallout className="callout-duty-select" number="1" text="当番担当者は参加可能な保護者から選びます。" />
        <GuideCallout className="callout-duty-note" number="2" text="集合時間や役割メモを残して、引き継ぎしやすくします。" />
        <GuideCallout className="callout-duty-meta" number="3" text="誰が決めたかは当番モーダル内だけで確認できます。" />
      </div>
    </div>
  );
}

function EditScene({ closeHref }: { closeHref: string }) {
  return (
    <div className="modal-backdrop guide-modal-backdrop">
      <div className="modal-card schedule-modal editor-modal guide-annotated" role="dialog" aria-modal="true">
        <div className="section-title">
          <div>
            <h2>予定を修正</h2>
            <span>修正者はLINEログイン名で記録されます。</span>
          </div>
          <Link href={closeHref} className="ghost modal-close">
            閉じる
          </Link>
        </div>
        <div className="form-grid schedule-form-grid">
          <label>
            日付
            <input type="date" defaultValue="2026-03-21" />
          </label>
          <label>
            タグ
            <div className="tag-selector">
              {["キッズ", "低学年", "中学年", "高学年", "1年", "2年", "3年", "4年", "5年", "6年"].map((tag) => (
                <label key={tag} className="tag-option">
                  <input type="checkbox" defaultChecked={["高学年", "5年", "6年"].includes(tag)} />
                  <span>{tag}</span>
                </label>
              ))}
            </div>
          </label>
          <label>
            開始
            <input defaultValue="12:00" />
          </label>
          <label>
            終了
            <input defaultValue="16:00" />
          </label>
          <label>
            場所
            <input defaultValue="四ツ木橋競技場" />
          </label>
          <label>
            内容
            <input defaultValue="TOHON CUP卒業大会 集合板五/板七 10:45" />
          </label>
          <label>
            登板メモ
            <input defaultValue="10:15 集合、受付対応" />
          </label>
          <label>
            備考
            <input defaultValue="ユニフォームは赤黒。水筒持参。" />
          </label>
        </div>
        <label className="checkbox-row">
          <input type="checkbox" defaultChecked />
          <span>試合として扱う</span>
        </label>
        <button className="primary" type="button">
          予定を更新
        </button>
        <GuideCallout className="callout-edit-date" number="1" text="日付、タグ、場所、内容が予定の基本情報です。" />
        <GuideCallout className="callout-edit-time" number="2" text="開始と終了は時間未定なら - でも保存できます。" />
        <GuideCallout className="callout-edit-match" number="3" text="試合として扱うをオンにすると、スコア管理への連携対象になります。" />
        <GuideCallout className="callout-edit-save" number="4" text="更新すると修正者の LINE 名が記録されます。" />
      </div>
    </div>
  );
}

function GuideCallout({ className, number, text }: { className: string; number: string; text: string }) {
  return (
    <div className={`guide-callout ${className}`}>
      <span className="guide-callout-badge">{number}</span>
      <p>{text}</p>
    </div>
  );
}

function renderScheduleDate(value: string) {
  const date = new Date(`${value}T00:00:00+09:00`);
  const label = `${date.getMonth() + 1}/${date.getDate()}`;
  const week = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return (
    <span className="schedule-date">
      <span className="schedule-date-main">{label}</span>
      <span className="schedule-date-week">({week})</span>
    </span>
  );
}

function renderScheduleTime(value: string) {
  const [start, end] = value.split(" - ");
  return (
    <span className="schedule-time">
      <span className="schedule-time-part">{start}</span>
      <span className="schedule-time-dash">-</span>
      <span className="schedule-time-part">{end}</span>
    </span>
  );
}

function tagClassName(tag: string) {
  if (tag === "低学年" || tag === "1年" || tag === "2年") return "tag-low";
  if (tag === "中学年" || tag === "3年" || tag === "4年") return "tag-mid";
  if (tag === "高学年" || tag === "5年" || tag === "6年") return "tag-high";
  return "";
}

function attendanceBadgeClass(status: string) {
  if (status === "参加") return "result-win";
  if (status === "欠席") return "result-loss";
  return "result-draw";
}

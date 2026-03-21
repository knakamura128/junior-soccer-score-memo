type GuideScorePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const resultRows = [
  {
    date: "2026-03-21",
    title: "TOHON CUP卒業大会 / 予選1",
    tags: ["高学年", "5年", "6年"],
    opponent: "FC西台",
    score: "2-1",
    outcome: "勝ち",
    scorers: "10 中村アオイ, 11 松本ユウト",
    audit: "中村一尋 / 中村一尋"
  },
  {
    date: "2026-03-14",
    title: "練習試合 / 第2試合",
    tags: ["中学年", "3年", "4年"],
    opponent: "高島平SC",
    score: "1-1(PK3-2)",
    outcome: "引き分け",
    scorers: "8 佐藤リク",
    audit: "松本由美 / 中村一尋"
  }
];

export default async function GuideScorePage({ searchParams }: GuideScorePageProps) {
  const params = searchParams ? await searchParams : {};
  const view = typeof params.view === "string" ? params.view : "scoring";

  return (
    <div className="app-shell guide-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Guide Capture</p>
          <div className="brand-lockup">
            <img src="/fc-kumano-logo.png" alt="FC KUMANO logo" className="brand-logo" />
            <div>
              <h1>FC KUMANO スコア管理</h1>
              <p className="hero-copy">使い方ガイド用の画面状態です。</p>
            </div>
          </div>
        </div>
        <aside className="auth-box">
          <div className="auth-row">
            <div className="guide-avatar" aria-hidden="true">
              N
            </div>
            <div>
              <strong>中村一尋</strong>
              <div className="auth-meta">保存・更新者として記録されます</div>
            </div>
          </div>
          <div className="schedule-hero-actions">
            <span className="ghost link-chip">LINEログイン中</span>
            <span className="ghost link-chip">スケジュール管理へ</span>
          </div>
        </aside>
      </header>

      {view === "scoring" ? <ScoreScoringScene /> : null}
      {view === "players" ? <ScorePlayersScene /> : null}
      {view === "results" ? <ScoreResultsScene compact={true} /> : null}
      {view === "results-normal" ? <ScoreResultsScene compact={false} /> : null}
      {view === "edit" ? <ScoreEditScene /> : null}
    </div>
  );
}

function ScoreScoringScene() {
  return (
    <>
      <nav className="tab-bar" aria-label="ページ切り替え">
        <button className="tab is-active" type="button">
          スコア付け
        </button>
        <button className="tab" type="button">
          試合結果一覧
        </button>
      </nav>
      <section className="tab-panel is-active">
        <div className="panel-grid">
          <section className="card">
            <div className="section-title">
              <h2>試合情報</h2>
              <span>基本設定</span>
            </div>
            <div className="form-grid">
              <label>
                大会名
                <input defaultValue="TOHON CUP卒業大会" />
              </label>
              <label>
                試合タイトル
                <input defaultValue="予選1" />
              </label>
              <label>
                相手チーム
                <input defaultValue="FC西台" />
              </label>
              <label>
                年代タグ
                <div className="tag-selector">
                  {["低学年", "中学年", "高学年", "1年", "2年", "3年", "4年", "5年", "6年"].map((tag) => (
                    <label key={tag} className="tag-option">
                      <input type="checkbox" defaultChecked={["高学年", "5年", "6年"].includes(tag)} />
                      <span>{tag}</span>
                    </label>
                  ))}
                </div>
              </label>
              <label>
                日付
                <input type="date" defaultValue="2026-03-21" />
              </label>
              <label>
                前後半
                <select defaultValue="halves">
                  <option value="halves">前後半あり</option>
                </select>
              </label>
              <label>
                現在の区分
                <select defaultValue="後半">
                  <option>前半</option>
                  <option>後半</option>
                </select>
              </label>
              <label>
                PK戦
                <select defaultValue="off">
                  <option value="off">なし</option>
                  <option value="on">あり</option>
                </select>
              </label>
            </div>
          </section>

          <section className="card score-card">
            <div className="section-title">
              <h2>スコア</h2>
              <span>後半</span>
            </div>
            <div className="scoreboard">
              <div className="team-panel">
                <p className="team-label">自チーム</p>
                <p className="score">2</p>
                <button className="score-btn home" type="button">
                  ゴールを追加
                </button>
              </div>
              <div className="score-separator">
                <p className="period-indicator">後半</p>
                <span>vs</span>
              </div>
              <div className="team-panel">
                <p className="team-label">相手チーム</p>
                <p className="score">1</p>
                <button className="score-btn away" type="button">
                  失点を追加
                </button>
              </div>
            </div>
            <label>
              得点選手
              <select defaultValue="10 中村アオイ">
                <option>未選択</option>
                <option>10 中村アオイ</option>
                <option>11 松本ユウト</option>
                <option>12 高橋ソウタ</option>
              </select>
            </label>
            <div className="timer-block">
              <div className="timer-display">18:42</div>
              <div className="timer-actions">
                <button type="button">スタート</button>
                <button type="button" className="ghost">
                  ストップ
                </button>
                <button type="button" className="ghost">
                  リセット
                </button>
              </div>
            </div>
            <div className="event-log-wrap">
              <div className="log-head">
                <h3>ゴールログ</h3>
                <button className="text-button" type="button">
                  この試合を初期化
                </button>
              </div>
              <ul className="event-log">
                <li className="event-item">
                  <div>
                    <strong>05:12 前半 自チーム得点</strong>
                  </div>
                  <select defaultValue="10 中村アオイ">
                    <option>10 中村アオイ</option>
                    <option>11 松本ユウト</option>
                  </select>
                  <button className="text-button danger" type="button">
                    得点を取り消す
                  </button>
                </li>
                <li className="event-item">
                  <div>
                    <strong>14:33 前半 相手チーム得点</strong>
                  </div>
                  <div className="muted">得点選手なし</div>
                  <button className="text-button danger" type="button">
                    得点を取り消す
                  </button>
                </li>
                <li className="event-item">
                  <div>
                    <strong>18:42 後半 自チーム得点</strong>
                  </div>
                  <select defaultValue="11 松本ユウト">
                    <option>10 中村アオイ</option>
                    <option>11 松本ユウト</option>
                  </select>
                  <button className="text-button danger" type="button">
                    得点を取り消す
                  </button>
                </li>
              </ul>
            </div>
            <div className="stack-actions">
              <button className="primary save-button" type="button">
                試合結果を保存
              </button>
            </div>
          </section>

          <section className="card">
            <div className="section-title">
              <h2>選手登録</h2>
              <span>DB保存</span>
            </div>
            <div className="player-form">
              <label>
                背番号
                <input defaultValue="10" />
              </label>
              <label>
                名前
                <input defaultValue="中村アオイ" />
              </label>
              <label>
                グループ
                <div className="tag-selector compact">
                  {["低学年", "中学年", "高学年", "1年", "2年", "3年", "4年", "5年", "6年"].map((tag) => (
                    <label key={tag} className="tag-option">
                      <input type="checkbox" defaultChecked={["高学年", "5年", "6年"].includes(tag)} />
                      <span>{tag}</span>
                    </label>
                  ))}
                </div>
              </label>
              <button className="primary" type="button">
                選手を追加
              </button>
              <button className="ghost dark-ghost" type="button">
                試合結果から登録
              </button>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}

function ScorePlayersScene() {
  return (
    <section className="card guide-scene-card">
      <div className="section-title">
        <h2>選手登録</h2>
        <span>登録済み選手</span>
      </div>
      <div className="player-form">
        <label>
          背番号
          <input defaultValue="9" />
        </label>
        <label>
          名前
          <input defaultValue="松本ユウト" />
        </label>
        <label>
          グループ
          <div className="tag-selector compact">
            {["低学年", "中学年", "高学年", "1年", "2年", "3年", "4年", "5年", "6年"].map((tag) => (
              <label key={tag} className="tag-option">
                <input type="checkbox" defaultChecked={["中学年", "3年", "4年"].includes(tag)} />
                <span>{tag}</span>
              </label>
            ))}
          </div>
        </label>
        <button className="primary" type="button">
          選手を追加
        </button>
        <button className="ghost dark-ghost" type="button">
          試合結果から登録
        </button>
      </div>
      <details className="expandable" open>
        <summary>登録選手一覧 6人</summary>
        <ul className="player-list">
          {[
            "10 中村アオイ / 高学年, 5年, 6年",
            "11 松本ユウト / 高学年, 5年, 6年",
            "8 佐藤リク / 中学年, 3年, 4年",
            "7 高橋ソウタ / 中学年, 3年",
            "6 田中ユウ / 低学年, 2年",
            "- 小川ハルト / 高学年, 6年"
          ].map((player) => (
            <li key={player} className="player-item">
              <div>
                <strong>{player.split(" / ")[0]}</strong>
                <p className="player-meta">タグ: {player.split(" / ")[1]}</p>
              </div>
              <button className="text-button danger" type="button">
                削除
              </button>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function ScoreResultsScene({ compact }: { compact: boolean }) {
  return (
    <>
      <nav className="tab-bar" aria-label="ページ切り替え">
        <button className="tab" type="button">
          スコア付け
        </button>
        <button className="tab is-active" type="button">
          試合結果一覧
        </button>
      </nav>
      <section className="card">
        <div className="section-title">
          <h2>試合結果一覧</h2>
          <span>短縮表示と通常表示を切替可能</span>
        </div>
        <div className="results-toolbar compact-toolbar score-results-toolbar">
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
              <button className={`tab month-chip ${compact ? "is-active" : ""}`} type="button">
                短縮
              </button>
              <button className={`tab month-chip ${compact ? "" : "is-active"}`} type="button">
                通常
              </button>
            </div>
          </div>
          <label>
            タグで絞り込み
            <select defaultValue="すべて">
              <option>すべて</option>
              <option>低学年</option>
              <option>中学年</option>
              <option>高学年</option>
            </select>
          </label>
          <label>
            並び順
            <select defaultValue="date-desc">
              <option value="date-desc">日付が新しい順</option>
            </select>
          </label>
          <button className="primary csv-export" type="button">
            CSVを書き出す
          </button>
          <label className="file-input csv-import">
            CSVを取り込む
            <input type="file" />
          </label>
        </div>
        <div className="summary-grid">
          <section className="summary-card">
            <h3>通算結果</h3>
            <div className="totals-row">
              <span className="total-pill win-pill">勝ち 8</span>
              <span className="total-pill draw-pill">引分 2</span>
              <span className="total-pill loss-pill">負け 3</span>
            </div>
          </section>
          <section className="summary-card">
            <h3>最多得点者ランキング</h3>
            <ol className="summary-list">
              <li>10 中村アオイ 9得点</li>
              <li>11 松本ユウト 7得点</li>
              <li>8 佐藤リク 4得点</li>
            </ol>
          </section>
          <section className="summary-card">
            <h3>対戦相手別勝敗表</h3>
            <details className="expandable" open>
              <summary>対戦相手 3件</summary>
              <div className="record-table">
                <div className="record-row">
                  <strong>FC西台</strong>
                  <span>2勝 0分 1敗</span>
                </div>
                <div className="record-row">
                  <strong>高島平SC</strong>
                  <span>1勝 1分 0敗</span>
                </div>
                <div className="record-row">
                  <strong>赤塚FC</strong>
                  <span>0勝 1分 1敗</span>
                </div>
              </div>
            </details>
          </section>
        </div>
        <div className={`table-wrap ${compact ? "is-compact" : ""}`}>
          <table className={`results-table score-results-table ${compact ? "is-compact" : ""}`}>
            <thead>
              <tr>
                <th>日時</th>
                <th>大会・試合名</th>
                <th>タグ</th>
                <th>対戦相手</th>
                <th>スコア</th>
                <th>勝敗</th>
                <th>得点者</th>
                {!compact ? <th>保存者 / 更新者</th> : null}
                {!compact ? <th>操作</th> : null}
              </tr>
            </thead>
            <tbody>
              {resultRows.map((row) => (
                <tr key={`${row.date}-${row.title}`}>
                  <td>{row.date}</td>
                  <td>{row.title}</td>
                  <td>
                    <div className="badge-row">
                      {row.tags.map((tag) => (
                        <span key={tag} className={`badge ${tagClassName(tag)}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{row.opponent}</td>
                  <td>{row.score}</td>
                  <td>
                    <span className={`badge ${outcomeClassName(row.outcome)}`}>{row.outcome}</span>
                  </td>
                  <td>{row.scorers}</td>
                  {!compact ? <td>{row.audit}</td> : null}
                  {!compact ? (
                    <td>
                      <div className="action-row">
                        <button className="text-button" type="button">
                          修正
                        </button>
                        <button className="text-button danger" type="button">
                          削除
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ScoreEditScene() {
  return (
    <>
      <nav className="tab-bar" aria-label="ページ切り替え">
        <button className="tab is-active" type="button">
          スコア付け
        </button>
        <button className="tab" type="button">
          試合結果一覧
        </button>
      </nav>
      <section className="tab-panel is-active">
        <div className="panel-grid">
          <section className="card score-card guide-scene-card">
            <div className="section-title">
              <h2>スコア</h2>
              <span>修正中</span>
            </div>
            <div className="scoreboard">
              <div className="team-panel">
                <p className="team-label">自チーム</p>
                <p className="score">1</p>
                <button className="score-btn home" type="button">
                  ゴールを追加
                </button>
              </div>
              <div className="score-separator">
                <p className="period-indicator">後半</p>
                <span>vs</span>
              </div>
              <div className="team-panel">
                <p className="team-label">相手チーム</p>
                <p className="score">1</p>
                <button className="score-btn away" type="button">
                  失点を追加
                </button>
              </div>
            </div>
            <div className="event-log-wrap">
              <div className="log-head">
                <h3>ゴールログ</h3>
                <button className="text-button" type="button">
                  この試合を初期化
                </button>
              </div>
              <ul className="event-log">
                <li className="event-item">
                  <div>
                    <strong>07:24 前半 自チーム得点</strong>
                  </div>
                  <select defaultValue="8 佐藤リク">
                    <option>8 佐藤リク</option>
                    <option>9 田中ユウ</option>
                  </select>
                  <button className="text-button danger" type="button">
                    得点を取り消す
                  </button>
                </li>
                <li className="event-item">
                  <div>
                    <strong>11:58 後半 相手チーム得点</strong>
                  </div>
                  <div className="muted">得点選手なし</div>
                  <button className="text-button danger" type="button">
                    得点を取り消す
                  </button>
                </li>
              </ul>
            </div>
            <div className="stack-actions">
              <button className="ghost dark-ghost" type="button">
                修正を取り消す
              </button>
              <button className="primary save-button" type="button">
                試合結果を更新
              </button>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}

function tagClassName(tag: string) {
  if (tag === "低学年" || tag === "1年" || tag === "2年") return "tag-low";
  if (tag === "中学年" || tag === "3年" || tag === "4年") return "tag-mid";
  if (tag === "高学年" || tag === "5年" || tag === "6年") return "tag-high";
  return "";
}

function outcomeClassName(outcome: string) {
  if (outcome === "勝ち") return "result-win";
  if (outcome === "負け") return "result-loss";
  return "result-draw";
}

import Link from "next/link";

export default function GuideIndexPage() {
  return (
    <div className="app-shell guide-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Help</p>
          <div className="brand-lockup">
            <img src="/fc-kumano-logo.png" alt="FC KUMANO logo" className="brand-logo" />
            <div>
              <h1>FC KUMANO ガイド</h1>
              <p className="hero-copy">スケジュール管理とスコア管理の使い方を確認できます。</p>
            </div>
          </div>
        </div>
      </header>

      <div className="summary-grid guide-index-grid">
        <section className="card">
          <div className="section-title">
            <h2>スケジュール管理</h2>
            <span>予定、出欠、配車、当番、修正</span>
          </div>
          <p className="muted">月間予定、CSV取込、出欠入力と一括登録、配車管理、当番決定、予定修正の流れを確認できます。</p>
          <div className="schedule-hero-actions">
            <Link href="/guide/schedule?view=top" className="primary">
              使い方を見る
            </Link>
            <Link href="/guide/schedule?view=attendance-list" className="ghost link-chip">
              出欠一覧例
            </Link>
            <Link href="/guide/schedule?view=bulk-attendance" className="ghost link-chip">
              一括登録例
            </Link>
          </div>
        </section>

        <section className="card">
          <div className="section-title">
            <h2>スコア管理</h2>
            <span>スコア付け、選手登録、試合結果</span>
          </div>
          <p className="muted">試合中の入力、得点ログ修正、選手登録、結果一覧、CSV入出力の流れを確認できます。</p>
          <div className="schedule-hero-actions">
            <Link href="/guide/score?view=scoring" className="primary">
              使い方を見る
            </Link>
            <Link href="/guide/score?view=results-normal" className="ghost link-chip">
              結果一覧例
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

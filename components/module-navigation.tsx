import Link from "next/link";

type ModuleRoute = "schedule-parent" | "schedule-coach" | "score-scoring" | "score-results";

type ModuleNavigationProps = {
  current: ModuleRoute;
};

const moduleGroups: Array<{
  id: "schedule" | "score";
  title: string;
  description: string;
  items: Array<{
    id: ModuleRoute;
    href: string;
    label: string;
    meta: string;
  }>;
}> = [
  {
    id: "schedule",
    title: "スケジュール管理",
    description: "予定と出欠の確認",
    items: [
      { id: "schedule-parent", href: "/", label: "保護者出席表", meta: "保護者の参加・欠席" },
      { id: "schedule-coach", href: "/coaches", label: "コーチ出席表", meta: "コーチの参加状況" }
    ]
  },
  {
    id: "score",
    title: "スコア管理",
    description: "試合入力と結果確認",
    items: [
      { id: "score-scoring", href: "/score", label: "スコア付け", meta: "試合中の記録" },
      { id: "score-results", href: "/score/results", label: "試合結果一覧", meta: "保存済みの結果" }
    ]
  }
];

export function ModuleNavigation({ current }: ModuleNavigationProps) {
  return (
    <nav className="module-navigation" aria-label="主要機能ナビゲーション">
      {moduleGroups.map((group) => {
        const isGroupActive = group.items.some((item) => item.id === current);

        return (
          <section className={`module-nav-group module-nav-group-${group.id} ${isGroupActive ? "is-active" : ""}`} key={group.id}>
            <div className="module-nav-heading">
              <p>{group.title}</p>
              <span>{group.description}</span>
            </div>
            <div className="module-nav-links">
              {group.items.map((item) => {
                const isActive = item.id === current;

                return (
                  <Link className={`module-nav-link ${isActive ? "is-active" : ""}`} href={item.href} aria-current={isActive ? "page" : undefined} key={item.id}>
                    <span className="module-nav-link-label">{item.label}</span>
                    <span className="module-nav-link-meta">{item.meta}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </nav>
  );
}

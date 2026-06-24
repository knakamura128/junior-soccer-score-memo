import Link from "next/link";

type ModuleRoute = "schedule-parent" | "schedule-coach" | "score-scoring" | "score-results";

type ModuleNavigationProps = {
  current: ModuleRoute;
};

const moduleGroups: Array<{
  id: "schedule" | "score";
  title: string;
  items: Array<{
    id: ModuleRoute;
    href: string;
    label: string;
  }>;
}> = [
  {
    id: "schedule",
    title: "スケジュール管理",
    items: [
      { id: "schedule-parent", href: "/", label: "保護者出席表" },
      { id: "schedule-coach", href: "/coaches", label: "コーチ出席表" }
    ]
  },
  {
    id: "score",
    title: "スコア管理",
    items: [
      { id: "score-scoring", href: "/score", label: "スコア付け" },
      { id: "score-results", href: "/score/results", label: "試合結果一覧" }
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
            </div>
            <div className="module-nav-links">
              {group.items.map((item) => {
                const isActive = item.id === current;

                return (
                  <Link className={`module-nav-link ${isActive ? "is-active" : ""}`} href={item.href} aria-current={isActive ? "page" : undefined} key={item.id}>
                    <span className="module-nav-link-label">{item.label}</span>
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

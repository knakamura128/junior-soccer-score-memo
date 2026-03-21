import { prisma } from "@/lib/prisma";
import { Dashboard } from "@/components/dashboard";
import { createEmptyMatch } from "@/lib/score-draft";
import { type MatchPayload } from "@/lib/match-format";
import { ensureAnnualPlayerPromotion } from "@/lib/player-promotion";

export const dynamic = "force-dynamic";

type ScorePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function getInitialData() {
  await ensureAnnualPlayerPromotion();
  const [players, matches] = await Promise.all([
    prisma.player.findMany({ orderBy: [{ createdAt: "asc" }] }),
    prisma.match.findMany({
      include: {
        goals: { orderBy: { createdAt: "asc" } },
        createdBy: true,
        updatedBy: true
      },
      orderBy: [{ matchDate: "desc" }, { createdAt: "desc" }]
    })
  ]);

  return {
    players,
    matches: matches.map((match) => ({
      ...match,
      matchDate: match.matchDate.toISOString().slice(0, 10),
      createdAt: match.createdAt.toISOString(),
      updatedAt: match.updatedAt.toISOString()
    }))
  };
}

function buildPrefill(params: Record<string, string | string[] | undefined>): MatchPayload | undefined {
  const match = createEmptyMatch();
  const date = typeof params.date === "string" ? params.date : undefined;
  const title = typeof params.title === "string" ? params.title : undefined;
  const tournament = typeof params.tournament === "string" ? params.tournament : undefined;
  const opponent = typeof params.opponent === "string" ? params.opponent : undefined;
  const tags = typeof params.tags === "string" ? params.tags.split(",").filter(Boolean) : [];

  if (!date && !title && !tournament && !opponent && tags.length === 0) {
    return undefined;
  }

  return {
    ...match,
    matchDate: date || match.matchDate,
    title: title || match.title,
    tournament: tournament || match.tournament,
    opponent: opponent || match.opponent,
    tags
  };
}

export default async function ScorePage({ searchParams }: ScorePageProps) {
  const initialData = await getInitialData();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const prefillMatch = buildPrefill(resolvedSearchParams);

  return <Dashboard initialData={initialData} initialMatch={prefillMatch} />;
}

import { prisma } from "@/lib/prisma";
import { Dashboard } from "@/components/dashboard";

export const dynamic = "force-dynamic";

async function getInitialData() {
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

export default async function Page() {
  const initialData = await getInitialData();
  return <Dashboard initialData={initialData} />;
}

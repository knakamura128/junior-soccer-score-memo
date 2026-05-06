import { Dashboard } from "@/components/dashboard";
import { buildPrefill, getScoreInitialData } from "@/app/score/data";

export const dynamic = "force-dynamic";

type ScorePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ScorePage({ searchParams }: ScorePageProps) {
  const initialData = await getScoreInitialData();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const prefillMatch = buildPrefill(resolvedSearchParams);

  return <Dashboard initialData={initialData} initialMatch={prefillMatch} initialView="scoring" />;
}

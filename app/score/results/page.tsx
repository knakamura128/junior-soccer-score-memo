import { Dashboard } from "@/components/dashboard";
import { getScoreInitialData } from "@/app/score/data";

export const dynamic = "force-dynamic";

export default async function ScoreResultsPage() {
  const initialData = await getScoreInitialData();

  return <Dashboard initialData={initialData} initialView="results" />;
}

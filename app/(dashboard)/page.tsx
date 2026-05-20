import { getPrisma } from "../lib/db";
import { phases as fallbackPhases } from "../data";
import type { PhaseData } from "../lib/types";
import { DashboardClient } from "../components/DashboardClient";

async function getPhases(): Promise<PhaseData[]> {
  try {
    const dbPhases = await getPrisma().phase.findMany({
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
    if (dbPhases.length > 0) return dbPhases as PhaseData[];
  } catch {
    // DB not available — fall back to static data
  }
  return fallbackPhases;
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const phases = await getPhases();
  return <DashboardClient phases={phases} />;
}

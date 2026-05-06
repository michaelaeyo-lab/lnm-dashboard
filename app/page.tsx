import { getPrisma } from "./lib/db";
import { phases as fallbackPhases } from "./data";
import { DashboardShell } from "./components/DashboardShell";
import type { PhaseData } from "./lib/types";

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

export default async function Home() {
  const phases = await getPhases();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 sticky top-0 bg-zinc-950/90 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">LNM Platform</h1>
          <p className="text-sm text-zinc-500">Multi-Agent SEO Ecosystem</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <DashboardShell initialPhases={phases} />

        <footer className="mt-12 pb-8 text-center text-xs text-zinc-600">
          Late Night Millionaires — Michael + Sardar
        </footer>
      </div>
    </div>
  );
}

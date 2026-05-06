"use client";

import type { PhaseData } from "../lib/types";

interface Props {
  phases: PhaseData[];
}

export function OverallProgress({ phases }: Props) {
  const totalTasks = phases.reduce((sum, p) => sum + p.tasks.length, 0);
  const doneTasks = phases.reduce((sum, p) => sum + p.tasks.filter((t) => t.status === "done").length, 0);
  const inProgressTasks = phases.reduce((sum, p) => sum + p.tasks.filter((t) => t.status === "in-progress").length, 0);
  const blockedTasks = phases.reduce((sum, p) => sum + p.tasks.filter((t) => t.status === "blocked").length, 0);
  const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <>
      {/* Stats bar */}
      <div className="flex items-center gap-6 text-sm mb-8">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-zinc-400">{doneTasks} done</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-zinc-400">{inProgressTasks} active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500/70" />
          <span className="text-zinc-400">{blockedTasks} blocked</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">{totalTasks} total</span>
        </div>
      </div>

      {/* Progress card */}
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Overall Progress</h2>
          <span className="text-3xl font-bold text-emerald-400">{overallPct}%</span>
        </div>
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden flex">
          {doneTasks > 0 && (
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${(doneTasks / totalTasks) * 100}%` }}
            />
          )}
          {inProgressTasks > 0 && (
            <div
              className="bg-amber-500 h-full transition-all"
              style={{ width: `${(inProgressTasks / totalTasks) * 100}%` }}
            />
          )}
        </div>
        <div className="mt-3 text-sm text-zinc-500">
          {doneTasks} of {totalTasks} tasks completed
        </div>
      </div>
    </>
  );
}

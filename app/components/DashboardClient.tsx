"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Download,
  Layers,
  Plus,
  Search,
  Sparkles,
  Zap,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { StatusBadge } from "./ui/status-badge";
import { ScoreRing } from "./ui/score-ring";
import type { PhaseData } from "../lib/types";

interface Props {
  phases: PhaseData[];
}

function Bar({ value, tone, height = 6 }: { value: number; tone?: string; height?: number }) {
  const color = tone
    ? `var(--${tone})`
    : value >= 80
    ? "var(--mint)"
    : value >= 40
    ? "var(--amber)"
    : "var(--text-4)";
  return (
    <div className="flex-1 rounded-full" style={{ height, background: "var(--surface)" }}>
      <div
        className="rounded-full transition-all"
        style={{ width: `${Math.min(value, 100)}%`, height, background: color }}
      />
    </div>
  );
}

export function DashboardClient({ phases }: Props) {
  const router = useRouter();

  const stats = useMemo(() => {
    const totalTasks = phases.reduce((s, p) => s + p.tasks.length, 0);
    const done = phases.reduce(
      (s, p) => s + p.tasks.filter((t) => t.status === "done").length,
      0
    );
    const inProg = phases.reduce(
      (s, p) => s + p.tasks.filter((t) => t.status === "in-progress").length,
      0
    );
    const blocked = phases.reduce(
      (s, p) => s + p.tasks.filter((t) => t.status === "blocked").length,
      0
    );
    const pct = totalTasks > 0 ? Math.round((done / totalTasks) * 100) : 0;
    return { totalTasks, done, inProg, blocked, pct };
  }, [phases]);

  const pipelineStages = ["Discovery", "Briefing", "Writing", "Publishing"];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="h1">Dashboard</h1>
          <p className="text-sm muted mt-1">Project overview and pipeline status</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" leading={<Download size={12} />}>
            Export
          </Button>
          <Button
            variant="primary"
            size="sm"
            leading={<Sparkles size={12} />}
            onClick={() => router.push("/briefs")}
          >
            New brief
          </Button>
        </div>
      </div>

      {/* Pipeline ribbon */}
      <div className="card card-pad mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h3">Pipeline</div>
          <div className="flex gap-3 text-xs muted">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-[6px] h-[6px] rounded-full" style={{ background: "var(--mint)" }} />
              {stats.done} done
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-[6px] h-[6px] rounded-full" style={{ background: "var(--amber)" }} />
              {stats.inProg} active
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-[6px] h-[6px] rounded-full" style={{ background: "var(--coral)" }} />
              {stats.blocked} blocked
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pipelineStages.map((step, i) => {
            const p = phases[i];
            if (!p) return null;
            const sDone = p.tasks.filter((t) => t.status === "done").length;
            const sTotal = p.tasks.length;
            const sPct = sTotal > 0 ? Math.round((sDone / sTotal) * 100) : 0;
            return (
              <div key={step} className="flex items-center gap-2 flex-1">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">{step}</div>
                    <div className="font-mono text-xs muted tabular-nums">
                      {sDone}/{sTotal}
                    </div>
                  </div>
                  <Bar value={sPct} tone={sPct === 100 ? "mint" : sPct > 0 ? "amber" : undefined} />
                </div>
                {i < pipelineStages.length - 1 && (
                  <ChevronRight size={14} style={{ color: "var(--text-4)", flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-5">
          <ScoreRing score={stats.pct} size={56} />
          <div>
            <div className="text-sm font-medium">Overall progress · {stats.pct}%</div>
            <div className="text-xs muted">
              {stats.done} of {stats.totalTasks} tasks complete
            </div>
          </div>
          <div style={{ marginLeft: "auto" }} className="flex items-center gap-2">
            {stats.blocked > 0 && <Badge tone="coral">{stats.blocked} blocked</Badge>}
          </div>
        </div>
      </div>

      {/* Phase columns */}
      <div
        className="grid mb-6"
        style={{ gridTemplateColumns: `repeat(${Math.min(phases.length, 4)}, minmax(0,1fr))`, gap: 12 }}
      >
        {phases.map((p) => {
          const pDone = p.tasks.filter((t) => t.status === "done").length;
          const pPct = p.tasks.length > 0 ? Math.round((pDone / p.tasks.length) * 100) : 0;
          return (
            <div key={p.id} className="card" style={{ overflow: "hidden" }}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="h3">{p.title}</div>
                <div className="text-xs muted mt-1">{p.description}</div>
                <div className="flex items-center gap-2 mt-2 text-xs font-mono muted">
                  {pDone}/{p.tasks.length} tasks
                  <Bar value={pPct} height={3} />
                </div>
              </div>
              <div className="px-3 py-2">
                {p.tasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 py-1.5 text-sm"
                  >
                    <span
                      className="inline-block w-[6px] h-[6px] rounded-full flex-shrink-0"
                      style={{
                        background:
                          t.status === "done"
                            ? "var(--mint)"
                            : t.status === "in-progress"
                            ? "var(--amber)"
                            : t.status === "blocked"
                            ? "var(--coral)"
                            : "var(--text-4)",
                      }}
                    />
                    <span
                      className="flex-1 truncate"
                      style={{
                        textDecoration: t.status === "done" ? "line-through" : "none",
                        color: t.status === "done" ? "var(--text-3)" : "var(--text-1)",
                      }}
                    >
                      {t.title}
                    </span>
                    {t.status === "in-progress" && <Zap size={11} style={{ color: "var(--amber)" }} />}
                    {t.status === "blocked" && <AlertCircle size={11} style={{ color: "var(--coral)" }} />}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom rail */}
      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div className="card card-pad">
          <div className="flex items-center justify-between mb-4">
            <div className="h3">Quick actions</div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => router.push("/briefs")}
              leading={<Layers size={13} />}
              trailing={<ArrowRight size={11} />}
            >
              View all briefs
            </Button>
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => router.push("/knowledge")}
              leading={<Search size={13} />}
              trailing={<ArrowRight size={11} />}
            >
              Browse knowledge base
            </Button>
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => router.push("/write")}
              leading={<Sparkles size={13} />}
              trailing={<ArrowRight size={11} />}
            >
              Go to writer
            </Button>
          </div>
        </div>
        <div className="card card-pad">
          <div className="h3 mb-4">Knowledge base</div>
          <div className="flex items-baseline gap-2 mb-3">
            <div className="font-mono tabular-nums" style={{ fontSize: 28, fontWeight: 600 }}>
              14,130
            </div>
            <div className="text-xs muted">chunks indexed</div>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="muted">17 agent pools</span>
              <span className="font-mono">active</span>
            </div>
            <div className="flex justify-between">
              <span className="muted">19 categories</span>
              <span className="font-mono">indexed</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            style={{ width: "100%", justifyContent: "center", marginTop: 14 }}
            leading={<Search size={11} />}
            onClick={() => router.push("/knowledge")}
          >
            Browse knowledge
          </Button>
        </div>
      </div>
    </div>
  );
}

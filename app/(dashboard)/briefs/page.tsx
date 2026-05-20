"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Sparkles } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { StatusBadge } from "../../components/ui/status-badge";
import { ScoreRing } from "../../components/ui/score-ring";
import { Empty } from "../../components/ui/empty";
import { BriefGenerator } from "../../components/BriefGenerator";

interface BriefListItem {
  id: string;
  topic: string;
  pageType: string;
  niche: string;
  location: string | null;
  status: string;
  version: number;
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
  qualityScore?: number;
  totalVolume?: number;
}

type FilterTab = "all" | "draft" | "reviewing" | "approved";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "reviewing", label: "Review" },
  { id: "approved", label: "Approved" },
];

function QualityBar({ score }: { score: number }) {
  const tone = score >= 80 ? "var(--mint)" : score >= 60 ? "var(--amber)" : "var(--coral)";
  return (
    <div className="flex items-center gap-2" style={{ minWidth: 100 }}>
      <div className="flex-1 h-[5px] rounded-full" style={{ background: "var(--surface)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, background: tone }}
        />
      </div>
      <span className="font-mono text-[12px] tabular-nums font-medium" style={{ color: tone, minWidth: 24, textAlign: "right" }}>
        {score}
      </span>
    </div>
  );
}

export default function BriefsPage() {
  const router = useRouter();
  const [briefs, setBriefs] = useState<BriefListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const loadBriefs = useCallback(async () => {
    try {
      const res = await fetch("/api/briefs");
      if (res.ok) {
        const data = await res.json();
        setBriefs(data.briefs || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBriefs();
  }, [loadBriefs]);

  const filtered = useMemo(() => {
    let list = briefs;
    if (filter !== "all") {
      list = list.filter((b) => b.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.topic.toLowerCase().includes(q) ||
          b.niche.toLowerCase().includes(q) ||
          b.pageType.toLowerCase().includes(q)
      );
    }
    return list;
  }, [briefs, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: briefs.length };
    for (const b of briefs) {
      c[b.status] = (c[b.status] || 0) + 1;
    }
    return c;
  }, [briefs]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this brief?")) return;
    await fetch(`/api/briefs/${id}`, { method: "DELETE" });
    setBriefs((prev) => prev.filter((b) => b.id !== id));
  }

  if (showNew) {
    return (
      <div>
        <div className="page-head">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>
              Briefs
            </Button>
            <div>
              <h1 className="h1">New brief</h1>
              <p className="text-sm muted mt-1">Generate from a topic, build manually, or paste an outline.</p>
            </div>
          </div>
        </div>
        <BriefGenerator />
      </div>
    );
  }

  return (
    <div>
      {/* Page head */}
      <div className="page-head">
        <div>
          <h1 className="h1">Content Briefs</h1>
          <p className="text-sm muted mt-1">
            AI-generated briefs with heading hierarchy, keyword mapping, and semantic rules
          </p>
        </div>
        <Button variant="primary" size="default" onClick={() => setShowNew(true)} leading={<Sparkles size={13} />}>
          New Brief
        </Button>
      </div>

      {/* Filter tabs + search */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className="px-3 py-1.5 rounded-[var(--radius)] text-[12px] font-medium transition-colors cursor-pointer"
              style={{
                background: filter === tab.id ? "var(--accent-soft)" : "transparent",
                color: filter === tab.id ? "var(--accent)" : "var(--text-2)",
              }}
            >
              {tab.label}
              {counts[tab.id] !== undefined && (
                <span className="ml-1.5 font-mono text-[11px] opacity-70">{counts[tab.id]}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-[320px]">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search briefs..."
              className="input input-sm pl-8"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm muted pulse">Loading briefs...</div>
        </div>
      ) : filtered.length === 0 ? (
        <Empty
          icon="file"
          title={search || filter !== "all" ? "No matching briefs" : "No briefs yet"}
          sub={search || filter !== "all" ? "Try adjusting your filters" : "Generate your first content brief to get started."}
        >
          {!search && filter === "all" && (
            <Button variant="primary" size="sm" onClick={() => setShowNew(true)} leading={<Plus size={12} />}>
              Create Brief
            </Button>
          )}
        </Empty>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {/* Header row */}
          <div
            className="grid items-center gap-3 px-4 py-2"
            style={{
              gridTemplateColumns: "1fr 100px 90px 110px 80px 80px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span className="eyebrow">Topic</span>
            <span className="eyebrow">Niche</span>
            <span className="eyebrow">Type</span>
            <span className="eyebrow">Quality</span>
            <span className="eyebrow">Status</span>
            <span className="eyebrow text-right">Updated</span>
          </div>

          {/* Rows */}
          {filtered.map((b) => (
            <div
              key={b.id}
              onClick={() => router.push(`/briefs/${b.id}`)}
              className="grid items-center gap-3 px-4 py-3 transition-colors cursor-pointer"
              style={{
                gridTemplateColumns: "1fr 100px 90px 110px 80px 80px",
                borderBottom: "1px solid var(--border)",
                background: "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div className="min-w-0">
                <div className="text-sm truncate" style={{ color: "var(--text-1)" }}>
                  {b.topic}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[10px]" style={{ color: "var(--text-3)" }}>
                    v{b.version}
                  </span>
                  {b.sessionId && (
                    <Badge tone="cyan" mono={false}>
                      writer
                    </Badge>
                  )}
                </div>
              </div>
              <span className="text-[12px] truncate" style={{ color: "var(--text-2)" }}>
                {b.niche}
              </span>
              <Badge tone="default" mono={false}>
                {b.pageType}
              </Badge>
              {b.qualityScore ? (
                <QualityBar score={b.qualityScore} />
              ) : (
                <span className="text-[11px] muted">--</span>
              )}
              <StatusBadge status={b.status} />
              <span className="text-[11px] text-right" style={{ color: "var(--text-3)" }}>
                {new Date(b.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

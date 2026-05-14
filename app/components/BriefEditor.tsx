"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  BriefData,
  EnhancedBrief,
  EnhancedHeading,
  EntityMapping,
  ConnectionEntry,
} from "../lib/types";

// --- Sub-components ---

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-zinc-700 text-zinc-300",
    reviewing: "bg-yellow-900/50 text-yellow-300 border border-yellow-800",
    approved: "bg-green-900/50 text-green-300 border border-green-800",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${colors[status] || colors.draft}`}>
      {status}
    </span>
  );
}

function VectorChips({ vectors }: { vectors: string[] }) {
  if (vectors.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-medium text-zinc-400 mb-2">Contextual Vectors</h3>
      <div className="flex flex-wrap gap-1.5">
        {vectors.map((v, i) => (
          <span key={i} className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

function HeadingRow({
  heading,
  index,
  expanded,
  onToggle,
  onEdit,
}: {
  heading: EnhancedHeading;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (field: string, value: string) => void;
}) {
  const indent = (heading.level - 1) * 20;

  return (
    <div className="border-b border-zinc-800/50 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-zinc-800/30 transition-colors"
        style={{ paddingLeft: `${12 + indent}px` }}
      >
        <span className="text-xs text-zinc-600 w-6 flex-shrink-0 pt-0.5">H{heading.level}</span>
        <span className="text-sm text-zinc-200 flex-1">{heading.text}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {heading.ruleCodes.slice(0, 3).map((code) => (
            <span key={code} className="px-1.5 py-0.5 bg-blue-900/30 text-blue-300 rounded text-[10px]">
              {code}
            </span>
          ))}
          {heading.ruleCodes.length > 3 && (
            <span className="text-[10px] text-zinc-500">+{heading.ruleCodes.length - 3}</span>
          )}
          {heading.targetQueries.length > 0 && (
            <span className="text-[10px] text-zinc-500">
              {heading.targetQueries.reduce((s, q) => s + q.volume, 0).toLocaleString()}/mo
            </span>
          )}
          <svg
            className={`w-4 h-4 text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-3 space-y-3" style={{ paddingLeft: `${24 + indent}px` }}>
          {/* Structure Instructions */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Structure Instructions
            </label>
            <textarea
              value={heading.structureInstructions}
              onChange={(e) => onEdit("structureInstructions", e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded text-xs text-zinc-300 focus:outline-none focus:border-blue-500 resize-y"
            />
          </div>

          {/* Intent */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Intent
            </label>
            <input
              type="text"
              value={heading.intent}
              onChange={(e) => onEdit("intent", e.target.value)}
              className="w-full px-2 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded text-xs text-zinc-300 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Rule Codes */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Rule Codes
            </label>
            <div className="flex flex-wrap gap-1">
              {heading.ruleCodes.map((code) => (
                <span key={code} className="px-1.5 py-0.5 bg-blue-900/30 text-blue-300 rounded text-[10px]">
                  {code}
                </span>
              ))}
              {heading.ruleCodes.length === 0 && (
                <span className="text-xs text-zinc-600">No rules assigned</span>
              )}
            </div>
          </div>

          {/* Target Queries */}
          {heading.targetQueries.length > 0 && (
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                Target Queries
              </label>
              <div className="space-y-1">
                {heading.targetQueries.map((q, qi) => (
                  <div key={qi} className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-300 flex-1">{q.query}</span>
                    <span className="text-zinc-500">{q.volume.toLocaleString()}/mo</span>
                    <span className="text-zinc-600">{q.intent}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SERP Features */}
          {heading.serpFeatures.length > 0 && (
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                SERP Features
              </label>
              <div className="flex gap-1.5">
                {heading.serpFeatures.map((f) => (
                  <span key={f} className="px-1.5 py-0.5 bg-green-900/30 text-green-300 rounded text-[10px]">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Word Count */}
          {heading.wordCountTarget && (
            <div className="text-xs text-zinc-500">
              Target: ~{heading.wordCountTarget} words
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EntityList({ entities }: { entities: EntityMapping[] }) {
  if (entities.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-medium text-zinc-400 mb-2">Entity Map</h3>
      <div className="grid grid-cols-2 gap-1">
        {entities.map((e, i) => (
          <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 bg-zinc-800/30 rounded">
            <span className="text-zinc-300">{e.entity}</span>
            <span className="text-zinc-600">{e.type}</span>
            <span
              className={`ml-auto text-[10px] ${
                e.relevance === "primary"
                  ? "text-blue-400"
                  : e.relevance === "secondary"
                    ? "text-zinc-400"
                    : "text-zinc-600"
              }`}
            >
              {e.relevance}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectionList({ connections }: { connections: ConnectionEntry[] }) {
  if (connections.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-medium text-zinc-400 mb-2">Internal Links</h3>
      <div className="space-y-1.5">
        {connections.map((c, i) => (
          <div key={i} className="flex items-start gap-2 text-xs px-2 py-1.5 bg-zinc-800/30 rounded">
            <span className="text-zinc-500 flex-shrink-0">{c.fromHeading} →</span>
            <div className="flex-1">
              <span className="text-blue-400">{c.anchorText}</span>
              <span className="text-zinc-600"> → {c.toPage}</span>
              <p className="text-zinc-600 mt-0.5">{c.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompetitorList({ competitors }: { competitors: { url: string; title: string; headings: string[]; wordCount?: number; serpPosition?: number }[] }) {
  if (competitors.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-medium text-zinc-400 mb-2">Competitors</h3>
      <div className="space-y-1.5">
        {competitors.map((c, i) => (
          <div key={i} className="text-xs px-2 py-1.5 bg-zinc-800/30 rounded">
            <div className="flex items-center gap-2">
              {c.serpPosition && (
                <span className="text-zinc-500">#{c.serpPosition}</span>
              )}
              <span className="text-zinc-300 truncate">{c.title || c.url}</span>
              {c.wordCount && (
                <span className="text-zinc-600 ml-auto">{c.wordCount.toLocaleString()} words</span>
              )}
            </div>
            {c.headings.length > 0 && (
              <p className="text-zinc-600 mt-1 truncate">
                Headings: {c.headings.slice(0, 5).join(" | ")}
                {c.headings.length > 5 && ` +${c.headings.length - 5}`}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function KnowledgeGaps({ gaps }: { gaps: string[] }) {
  if (gaps.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-medium text-zinc-400 mb-2">Knowledge Gaps</h3>
      <div className="flex flex-wrap gap-1.5">
        {gaps.map((g, i) => (
          <span key={i} className="px-2 py-1 bg-orange-900/20 text-orange-300 border border-orange-800/30 rounded text-xs">
            {g}
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Main Component ---

export function BriefEditor({ brief: initialBrief }: { brief: BriefData }) {
  const router = useRouter();
  const [brief, setBrief] = useState(initialBrief);
  const [data, setData] = useState<EnhancedBrief>(initialBrief.data);
  const [expandedHeading, setExpandedHeading] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"headings" | "entities" | "connections" | "competitors">("headings");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [startingWrite, setStartingWrite] = useState(false);

  const editHeading = useCallback(
    (index: number, field: string, value: string) => {
      setData((prev) => ({
        ...prev,
        headings: prev.headings.map((h, i) =>
          i === index ? { ...h, [field]: value } : h
        ),
      }));
      setDirty(true);
    },
    []
  );

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/briefs/${brief.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBrief(updated);
        setDirty(false);
      }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  async function handleStatusChange(status: string) {
    setSaving(true);
    try {
      // Save data too if dirty
      const body: Record<string, unknown> = { status };
      if (dirty) body.data = data;

      const res = await fetch(`/api/briefs/${brief.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setBrief(updated);
        setDirty(false);
      }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  async function handleStartWriting() {
    setStartingWrite(true);
    try {
      const res = await fetch(`/api/briefs/${brief.id}/start-writing`, {
        method: "POST",
      });
      if (res.ok) {
        const { sessionId } = await res.json();
        router.push("/write");
        // The content writer page will show the new session
        return;
      }
      const err = await res.json().catch(() => ({}));
      if (err.sessionId) {
        // Session already exists
        router.push("/write");
        return;
      }
      alert(err.error || "Failed to create writing session");
    } catch {
      alert("Network error");
    } finally {
      setStartingWrite(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this brief? This cannot be undone.")) return;
    await fetch(`/api/briefs/${brief.id}`, { method: "DELETE" });
    router.push("/briefs");
  }

  const tabs = [
    { id: "headings" as const, label: "Headings", count: data.headings.length },
    { id: "entities" as const, label: "Entities", count: data.entityMap.length },
    { id: "connections" as const, label: "Links", count: data.connectionMap.length },
    { id: "competitors" as const, label: "Competitors", count: data.competitors.length },
  ];

  const totalVolume = data.headings.reduce(
    (sum, h) => sum + h.targetQueries.reduce((s, q) => s + q.volume, 0),
    0
  );

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => router.push("/briefs")}
              className="text-zinc-400 hover:text-zinc-200 text-sm"
            >
              ← Briefs
            </button>
            <StatusBadge status={brief.status} />
            <span className="text-xs text-zinc-600">v{brief.version}</span>
          </div>
          <h1 className="text-xl font-bold text-zinc-100">{brief.topic}</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {brief.niche} / {brief.pageType}
            {brief.location && ` / ${brief.location}`}
            {brief.clientName && ` — ${brief.clientName}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
          {brief.status === "reviewing" && (
            <>
              <button
                onClick={() => handleStatusChange("draft")}
                disabled={saving}
                className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs rounded-lg transition-colors"
              >
                Back to Draft
              </button>
              <button
                onClick={() => handleStatusChange("approved")}
                disabled={saving}
                className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs rounded-lg transition-colors"
              >
                Approve Brief
              </button>
            </>
          )}
          {brief.status === "approved" && !brief.sessionId && (
            <button
              onClick={handleStartWriting}
              disabled={startingWrite}
              className="px-4 py-1.5 bg-green-700 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
            >
              {startingWrite ? "Creating..." : "Start Writing →"}
            </button>
          )}
          {brief.sessionId && (
            <button
              onClick={() => router.push("/write")}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
            >
              Go to Writer →
            </button>
          )}
          <button
            onClick={handleDelete}
            className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="px-3 py-2 bg-zinc-800/50 rounded-lg">
          <div className="text-lg font-bold text-zinc-100">{data.headings.length}</div>
          <div className="text-xs text-zinc-500">Headings</div>
        </div>
        <div className="px-3 py-2 bg-zinc-800/50 rounded-lg">
          <div className="text-lg font-bold text-zinc-100">{data.entityMap.length}</div>
          <div className="text-xs text-zinc-500">Entities</div>
        </div>
        <div className="px-3 py-2 bg-zinc-800/50 rounded-lg">
          <div className="text-lg font-bold text-zinc-100">{data.connectionMap.length}</div>
          <div className="text-xs text-zinc-500">Internal Links</div>
        </div>
        <div className="px-3 py-2 bg-zinc-800/50 rounded-lg">
          <div className="text-lg font-bold text-zinc-100">{totalVolume.toLocaleString()}</div>
          <div className="text-xs text-zinc-500">Total Volume</div>
        </div>
      </div>

      {/* Contextual Vectors */}
      <div className="mb-6">
        <VectorChips vectors={data.contextualVectors} />
      </div>

      {/* Knowledge Gaps */}
      <div className="mb-6">
        <KnowledgeGaps gaps={data.knowledgeGaps} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm transition-colors border-b-2 ${
              activeTab === tab.id
                ? "text-zinc-100 border-blue-500"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-xs text-zinc-600">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-zinc-900/30 rounded-lg border border-zinc-800/50">
        {activeTab === "headings" && (
          <div>
            {data.headings.map((h, i) => (
              <HeadingRow
                key={i}
                heading={h}
                index={i}
                expanded={expandedHeading === i}
                onToggle={() => setExpandedHeading(expandedHeading === i ? null : i)}
                onEdit={(field, value) => editHeading(i, field, value)}
              />
            ))}
            {data.headings.length === 0 && (
              <div className="p-6 text-center text-zinc-600 text-sm">
                No headings generated yet
              </div>
            )}
          </div>
        )}

        {activeTab === "entities" && (
          <div className="p-4">
            <EntityList entities={data.entityMap} />
          </div>
        )}

        {activeTab === "connections" && (
          <div className="p-4">
            <ConnectionList connections={data.connectionMap} />
          </div>
        )}

        {activeTab === "competitors" && (
          <div className="p-4">
            <CompetitorList competitors={data.competitors} />
          </div>
        )}
      </div>
    </div>
  );
}

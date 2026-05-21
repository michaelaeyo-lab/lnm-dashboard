"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Trash2,
  PenLine,
  FileText,
  BarChart3,
  Tags,
  Link2,
  Users,
  Shield,
  Map,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Download,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Chip } from "./ui/chip";
import { StatusBadge } from "./ui/status-badge";
import { ScoreRing } from "./ui/score-ring";
import { Empty } from "./ui/empty";
import { cn } from "../lib/utils";
import { briefToCsvString } from "../lib/csv-validation";
import type {
  BriefData,
  EnhancedBrief,
  EnhancedHeading,
  EntityMapping,
  ConnectionEntry,
  DeepCompetitorAnalysisResult,
  QueryPreAnalysis,
  SerpAnalysis,
  TopicalMapEntry,
  HeadingValidation,
  BriefQualityReport,
} from "../lib/types";

type TabId = "outline" | "analysis" | "entities" | "topics" | "links" | "competitors" | "validation";

const TAB_CONFIG: { id: TabId; label: string; icon: typeof FileText; conditionalKey?: keyof EnhancedBrief }[] = [
  { id: "outline", label: "Outline", icon: FileText },
  { id: "analysis", label: "Analysis", icon: BarChart3 },
  { id: "entities", label: "Entities", icon: Tags },
  { id: "topics", label: "Topics", icon: Map, conditionalKey: "topicalMap" },
  { id: "links", label: "Links", icon: Link2 },
  { id: "competitors", label: "Competitors", icon: Users },
  { id: "validation", label: "Validation", icon: Shield },
];

// ── Helpers ──

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}

function scoreTone(s: number) {
  if (s >= 80) return "mint" as const;
  if (s >= 60) return "amber" as const;
  return "coral" as const;
}

// ── Stat Cell ──

function StatCell({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2.5 min-w-0">
      <span className="eyebrow">{label}</span>
      <span className="text-base font-semibold tabular-nums" style={{ color: "var(--text-1)" }}>
        {value}
      </span>
      {sub && <span className="text-[10px]" style={{ color: "var(--text-3)" }}>{sub}</span>}
    </div>
  );
}

// ── Heading Row (Outline) ──

function HeadingRow({
  heading,
  selected,
  onSelect,
}: {
  heading: EnhancedHeading;
  selected: boolean;
  onSelect: () => void;
}) {
  const indent = (heading.level - 1) * 16;
  const totalVolume = heading.targetQueries.reduce((s, q) => s + q.volume, 0);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer",
        selected ? "bg-[var(--accent-faint)]" : "hover:bg-[var(--surface)]"
      )}
      style={{
        paddingLeft: `${12 + indent}px`,
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span
        className="font-mono text-[10px] font-semibold w-5 flex-shrink-0 text-center rounded py-0.5"
        style={{
          background: heading.level === 1 ? "var(--accent-soft)" : "var(--surface)",
          color: heading.level === 1 ? "var(--accent)" : "var(--text-3)",
        }}
      >
        H{heading.level}
      </span>
      <span className="text-[13px] flex-1 min-w-0 truncate" style={{ color: "var(--text-1)" }}>
        {heading.text}
      </span>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {heading.contentDesignPattern && (
          <Badge tone="violet" mono>
            {heading.contentDesignPattern}
          </Badge>
        )}
        {heading.snippetTarget && (
          <Badge tone="mint" mono>
            FS
          </Badge>
        )}
        {totalVolume > 0 && (
          <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--text-3)" }}>
            {formatVolume(totalVolume)}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Inspector Panel ──

function Inspector({
  heading,
  onEdit,
}: {
  heading: EnhancedHeading;
  onEdit: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-4 p-4 slidein">
      {/* Pattern badge */}
      <div>
        <span className="eyebrow">Structure Pattern</span>
        <div className="mt-1.5">
          <Badge tone="accent" mono={false}>
            {heading.contentDesignPattern || "paragraph"}
          </Badge>
        </div>
      </div>

      {/* Structure instructions */}
      <div>
        <span className="eyebrow">Structure Instructions</span>
        <textarea
          value={heading.structureInstructions}
          onChange={(e) => onEdit("structureInstructions", e.target.value)}
          rows={4}
          className="textarea mt-1.5"
          style={{ fontSize: 12 }}
        />
      </div>

      {/* Intent */}
      <div>
        <span className="eyebrow">Intent</span>
        <input
          type="text"
          value={heading.intent}
          onChange={(e) => onEdit("intent", e.target.value)}
          className="input input-sm mt-1.5"
        />
      </div>

      {/* Rule codes */}
      {heading.ruleCodes.length > 0 && (
        <div>
          <span className="eyebrow">Rule Codes</span>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {heading.ruleCodes.map((code) => (
              <Badge key={code} tone="cyan" mono>
                {code}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* SERP features */}
      {heading.serpFeatures.length > 0 && (
        <div>
          <span className="eyebrow">SERP Features</span>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {heading.serpFeatures.map((f) => (
              <Chip key={f} tone="mint">
                {f}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Target queries */}
      {heading.targetQueries.length > 0 && (
        <div>
          <span className="eyebrow">Target Queries</span>
          <div className="space-y-1 mt-1.5">
            {heading.targetQueries.map((q, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px]">
                <span className="flex-1 min-w-0 truncate" style={{ color: "var(--text-1)" }}>
                  {q.query}
                </span>
                <span className="font-mono tabular-nums" style={{ color: "var(--text-3)" }}>
                  {q.volume.toLocaleString()}
                </span>
                <Badge tone="default" mono>
                  {q.intent}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Word count target */}
      {heading.wordCountTarget && (
        <div className="flex items-center gap-2">
          <span className="eyebrow">Word Target</span>
          <span className="font-mono text-[12px] tabular-nums" style={{ color: "var(--text-2)" }}>
            ~{heading.wordCountTarget}
          </span>
        </div>
      )}

      {/* Feature targets */}
      <div className="flex items-center gap-2">
        {heading.snippetTarget && <Chip tone="mint">Snippet Target</Chip>}
        {heading.paaTarget && <Chip tone="amber">PAA Target</Chip>}
      </div>
    </div>
  );
}

// ── Tab Content Components ──

function AnalysisTab({ queryPreAnalysis, serpAnalysis }: { queryPreAnalysis?: QueryPreAnalysis; serpAnalysis?: SerpAnalysis }) {
  if (!queryPreAnalysis && !serpAnalysis) {
    return <Empty icon="alert" title="No analysis data" sub="Generated with an older pipeline version" />;
  }

  return (
    <div className="p-4 space-y-5">
      {queryPreAnalysis && (
        <>
          <div>
            <span className="eyebrow">Query Analysis</span>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
              {[
                { label: "Search Intent", value: queryPreAnalysis.searchIntent },
                { label: "Query Type", value: queryPreAnalysis.queryType },
                { label: "Business Model", value: queryPreAnalysis.businessModel },
                { label: "Depth Required", value: queryPreAnalysis.intentSatisfactionThreshold.depth },
                { label: "Freshness", value: queryPreAnalysis.freshnessRequirement },
                {
                  label: "Completeness",
                  value: queryPreAnalysis.queryCompleteness.isComplete ? "Complete" : "Incomplete",
                },
              ].map((item) => (
                <div key={item.label} className="card card-pad">
                  <span className="text-[10px]" style={{ color: "var(--text-3)" }}>{item.label}</span>
                  <span className="block text-[12px] font-medium mt-0.5" style={{ color: "var(--text-1)" }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <span className="eyebrow">Audience Segments</span>
            <div className="flex gap-2 mt-1.5">
              <Chip tone="accent">{queryPreAnalysis.audienceSegments.primary}</Chip>
              {queryPreAnalysis.audienceSegments.secondary && (
                <Chip>{queryPreAnalysis.audienceSegments.secondary}</Chip>
              )}
              {queryPreAnalysis.audienceSegments.tertiary && (
                <Chip>{queryPreAnalysis.audienceSegments.tertiary}</Chip>
              )}
            </div>
          </div>
        </>
      )}

      {serpAnalysis && (
        <>
          {serpAnalysis.consensusCoverage.length > 0 && (
            <div>
              <span className="eyebrow">SERP Consensus (must cover)</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {serpAnalysis.consensusCoverage.map((t, i) => <Chip key={i}>{t}</Chip>)}
              </div>
            </div>
          )}
          {serpAnalysis.serpGaps.length > 0 && (
            <div>
              <span className="eyebrow" style={{ color: "var(--mint)" }}>SERP Gaps (opportunities)</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {serpAnalysis.serpGaps.map((g, i) => <Chip key={i} tone="mint">{g}</Chip>)}
              </div>
            </div>
          )}
          {serpAnalysis.compressionPatterns.length > 0 && (
            <div>
              <span className="eyebrow" style={{ color: "var(--coral)" }}>Compression Patterns (avoid)</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {serpAnalysis.compressionPatterns.map((p, i) => <Chip key={i} tone="coral">{p}</Chip>)}
              </div>
            </div>
          )}
          {serpAnalysis.featuredSnippetOpportunities.length > 0 && (
            <div>
              <span className="eyebrow">Featured Snippet Opportunities</span>
              <div className="space-y-1.5 mt-1.5">
                {serpAnalysis.featuredSnippetOpportunities.map((fs, i) => (
                  <div key={i} className="card card-pad text-[12px]">
                    <span style={{ color: "var(--text-1)" }}>{fs.query}</span>
                    <span className="ml-2" style={{ color: "var(--text-3)" }}>({fs.currentFormat})</span>
                    <p className="mt-0.5" style={{ color: "var(--text-2)" }}>{fs.strategy}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <span className="eyebrow">SERP Features Present</span>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {Object.entries(serpAnalysis.serpFeaturePresence).map(([key, val]) => (
                <Chip key={key} tone={val ? "mint" : "default"}>
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </Chip>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EntitiesTab({ entities }: { entities: EntityMapping[] }) {
  if (entities.length === 0) return <Empty icon="alert" title="No entities" sub="No entity mappings generated" />;
  return (
    <div className="p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
        {entities.map((e, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px] card card-pad">
            <span className="flex-1 min-w-0 truncate" style={{ color: "var(--text-1)" }}>{e.entity}</span>
            <Badge tone="default" mono>{e.type}</Badge>
            <Badge tone={e.relevance === "primary" ? "accent" : e.relevance === "secondary" ? "cyan" : "default"} mono>
              {e.relevance}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopicsTab({ topicalMap }: { topicalMap?: TopicalMapEntry[] }) {
  if (!topicalMap || topicalMap.length === 0) return <Empty icon="alert" title="No topical map" />;
  const groups = { root: "accent", supporting: "mint", adjacent: "amber", downstream: "violet" } as const;
  return (
    <div className="p-4 space-y-4">
      {(Object.keys(groups) as (keyof typeof groups)[]).map((rel) => {
        const items = topicalMap.filter((t) => t.relationship === rel);
        if (items.length === 0) return null;
        return (
          <div key={rel}>
            <span className="eyebrow capitalize">{rel} Topics</span>
            <div className="space-y-1 mt-1.5">
              {items.map((t, i) => (
                <div key={i} className="card card-pad flex items-center gap-2 text-[12px]">
                  <Chip tone={groups[rel]}>{t.topic}</Chip>
                  {t.suggestedPageType && <span style={{ color: "var(--text-3)" }}>({t.suggestedPageType})</span>}
                  {t.clusterLabel && <Badge tone="default" mono>{t.clusterLabel}</Badge>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LinksTab({ connections }: { connections: ConnectionEntry[] }) {
  if (connections.length === 0) return <Empty icon="alert" title="No internal links" />;
  return (
    <div className="p-4 space-y-1.5">
      {connections.map((c, i) => (
        <div key={i} className="card card-pad text-[12px]">
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--text-3)" }}>{c.fromHeading}</span>
            <ArrowLeft size={10} className="rotate-180" style={{ color: "var(--text-3)" }} />
            <span style={{ color: "var(--accent)" }}>{c.anchorText}</span>
            <ArrowLeft size={10} className="rotate-180" style={{ color: "var(--text-3)" }} />
            <span className="flex items-center gap-1" style={{ color: "var(--cyan)" }}>
              {c.toPage} <ExternalLink size={10} />
            </span>
          </div>
          <p className="mt-1" style={{ color: "var(--text-3)" }}>{c.reason}</p>
        </div>
      ))}
    </div>
  );
}

function CompetitorsTab({
  competitors,
  deepAnalysis,
}: {
  competitors: { url: string; title: string; headings: string[]; wordCount?: number; serpPosition?: number }[];
  deepAnalysis?: DeepCompetitorAnalysisResult;
}) {
  if (competitors.length === 0) return <Empty icon="alert" title="No competitors" />;
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1.5">
        {competitors.map((c, i) => {
          const deep = deepAnalysis?.competitors?.find((d) => d.url === c.url);
          return (
            <div key={i} className="card card-pad text-[12px]">
              <div className="flex items-center gap-2">
                {c.serpPosition && (
                  <Badge tone="accent" mono>#{c.serpPosition}</Badge>
                )}
                <span className="flex-1 min-w-0 truncate" style={{ color: "var(--text-1)" }}>
                  {c.title || c.url}
                </span>
                {c.wordCount && (
                  <span className="font-mono tabular-nums" style={{ color: "var(--text-3)" }}>
                    {c.wordCount.toLocaleString()} words
                  </span>
                )}
              </div>
              {deep && (
                <div className="mt-2 pt-2 space-y-1" style={{ borderTop: "1px solid var(--border)" }}>
                  {deep.strengths.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span style={{ color: "var(--text-3)" }}>Strengths:</span>
                      {deep.strengths.map((s, si) => <Chip key={si} tone="mint">{s}</Chip>)}
                    </div>
                  )}
                  {deep.weaknesses.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span style={{ color: "var(--text-3)" }}>Weaknesses:</span>
                      {deep.weaknesses.map((w, wi) => <Chip key={wi} tone="coral">{w}</Chip>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {deepAnalysis?.gapKeywords && deepAnalysis.gapKeywords.length > 0 && (
        <div>
          <span className="eyebrow">Gap Keywords</span>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {deepAnalysis.gapKeywords.map((k, i) => <Chip key={i} tone="cyan">{k}</Chip>)}
          </div>
        </div>
      )}
    </div>
  );
}

function ValidationTab({ headingValidation, qualityReport }: { headingValidation?: HeadingValidation; qualityReport?: BriefQualityReport }) {
  if (!headingValidation && !qualityReport) {
    return <Empty icon="alert" title="No validation data" />;
  }

  return (
    <div className="p-4 space-y-5">
      {qualityReport && (
        <div>
          <span className="eyebrow">Quality Breakdown</span>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mt-2">
            {Object.entries(qualityReport.breakdown).map(([key, val]) => (
              <div key={key} className="card card-pad text-center">
                <div className="font-mono text-lg font-bold tabular-nums" style={{ color: `var(--${scoreTone(val)})` }}>
                  {val}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {headingValidation && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="eyebrow">Heading Validation</span>
            <Badge tone={headingValidation.score >= 8 ? "mint" : "amber"} mono>
              {headingValidation.score}/10
            </Badge>
          </div>
          {headingValidation.issues.length > 0 ? (
            <div className="space-y-1.5">
              {headingValidation.issues.map((issue, i) => (
                <div key={i} className="card card-pad text-[12px]">
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={issue.severity === "high" ? "coral" : issue.severity === "medium" ? "amber" : "default"}
                      mono
                    >
                      {issue.severity}
                    </Badge>
                    <span style={{ color: "var(--text-2)" }}>{issue.issueType}</span>
                    <span className="ml-auto truncate max-w-[200px]" style={{ color: "var(--text-3)" }}>
                      {issue.headingText}
                    </span>
                  </div>
                  <p className="mt-1" style={{ color: "var(--text-3)" }}>{issue.description}</p>
                  {issue.suggestedFix && (
                    <p className="mt-0.5" style={{ color: "var(--mint)" }}>{issue.suggestedFix}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px]" style={{ color: "var(--mint)" }}>All headings passed validation</p>
          )}
        </div>
      )}

      {qualityReport?.recommendations && qualityReport.recommendations.length > 0 && (
        <div>
          <span className="eyebrow">Recommendations</span>
          <div className="space-y-1 mt-1.5">
            {qualityReport.recommendations.map((r, i) => (
              <p key={i} className="text-[12px] card card-pad" style={{ color: "var(--text-2)" }}>{r}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──

export function BriefEditor({ brief: initialBrief }: { brief: BriefData }) {
  const router = useRouter();
  const [brief, setBrief] = useState(initialBrief);
  const [data, setData] = useState<EnhancedBrief>(initialBrief.data);
  const [selectedHeading, setSelectedHeading] = useState<number | null>(data.headings.length > 0 ? 0 : null);
  const [activeTab, setActiveTab] = useState<TabId>("outline");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [startingWrite, setStartingWrite] = useState(false);

  const editHeading = useCallback((index: number, field: string, value: string) => {
    setData((prev) => ({
      ...prev,
      headings: prev.headings.map((h, i) => (i === index ? { ...h, [field]: value } : h)),
    }));
    setDirty(true);
  }, []);

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
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status: string) {
    setSaving(true);
    try {
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
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }

  async function handleStartWriting() {
    setStartingWrite(true);
    try {
      const res = await fetch(`/api/briefs/${brief.id}/start-writing`, { method: "POST" });
      if (res.ok) {
        router.push("/write");
        return;
      }
      const err = await res.json().catch(() => ({}));
      if (err.sessionId) {
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

  function handleDownloadCsv() {
    const csvString = briefToCsvString(data);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brief.topic.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-")}-brief.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalVolume = data.headings.reduce((sum, h) => sum + h.targetQueries.reduce((s, q) => s + q.volume, 0), 0);
  const overallScore = data.qualityReport?.overallScore ?? 0;

  const visibleTabs = TAB_CONFIG.filter((tab) => {
    if (!tab.conditionalKey) return true;
    const val = data[tab.conditionalKey];
    return val && (Array.isArray(val) ? val.length > 0 : true);
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" onClick={() => router.push("/briefs")} leading={<ArrowLeft size={13} />}>
              Briefs
            </Button>
            <StatusBadge status={brief.status} />
            {overallScore > 0 && <Badge tone={scoreTone(overallScore)} mono>{overallScore}/100</Badge>}
            <span className="font-mono text-[10px]" style={{ color: "var(--text-3)" }}>v{brief.version}</span>
          </div>
          <h1 className="h1">{brief.topic}</h1>
          {data.titleTag?.titleTag && (
            <p className="text-sm mt-1" style={{ color: "var(--accent)" }}>{data.titleTag.titleTag}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Badge tone="default" mono={false}>{brief.niche}</Badge>
            <Badge tone="default" mono={false}>{brief.pageType}</Badge>
            {brief.location && <Badge tone="default" mono={false}>{brief.location}</Badge>}
            {brief.clientName && <span className="text-[12px]" style={{ color: "var(--text-3)" }}>{brief.clientName}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {dirty && (
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving} leading={<Save size={12} />}>
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
          {brief.status === "reviewing" && (
            <>
              <Button variant="default" size="sm" onClick={() => handleStatusChange("draft")} disabled={saving}>
                Back to Draft
              </Button>
              <Button variant="success" size="sm" onClick={() => handleStatusChange("approved")} disabled={saving}>
                Approve
              </Button>
            </>
          )}
          {brief.status === "approved" && !brief.sessionId && (
            <Button variant="success" size="default" onClick={handleStartWriting} disabled={startingWrite} leading={<PenLine size={13} />}>
              {startingWrite ? "Creating..." : "Start Writing"}
            </Button>
          )}
          {brief.sessionId && (
            <Button variant="primary" size="sm" onClick={() => router.push("/write")} trailing={<ChevronRight size={12} />}>
              Go to Writer
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleDownloadCsv} title="Download CSV">
            <Download size={14} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete} title="Delete brief">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="card flex items-stretch mb-4" style={{ overflow: "hidden" }}>
        <div className="flex items-center gap-3 flex-1 flex-wrap" style={{ borderRight: "1px solid var(--border)" }}>
          <StatCell label="Headings" value={data.headings.length} />
          <StatCell label="Entities" value={data.entityMap.length} />
          <StatCell label="Links" value={data.connectionMap.length} />
          <StatCell label="Volume" value={formatVolume(totalVolume)} sub="/mo total" />
          <StatCell label="Competitors" value={data.competitors.length} />
          {data.knowledgeGaps.length > 0 && <StatCell label="Gaps" value={data.knowledgeGaps.length} />}
        </div>
        {overallScore > 0 && (
          <div className="flex items-center px-4">
            <ScoreRing score={overallScore} size={62} />
          </div>
        )}
      </div>

      {/* Vectors + Gaps */}
      {(data.contextualVectors.length > 0 || data.knowledgeGaps.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          {data.contextualVectors.length > 0 && (
            <div className="card card-pad">
              <span className="eyebrow">Contextual Vectors</span>
              <div className="flex flex-wrap gap-1 mt-2">
                {data.contextualVectors.map((v, i) => <Chip key={i}>{v}</Chip>)}
              </div>
            </div>
          )}
          {data.knowledgeGaps.length > 0 && (
            <div className="card card-pad">
              <span className="eyebrow" style={{ color: "var(--amber)" }}>Knowledge Gaps</span>
              <div className="flex flex-wrap gap-1 mt-2">
                {data.knowledgeGaps.map((g, i) => <Chip key={i} tone="amber">{g}</Chip>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1" style={{ borderBottom: "1px solid var(--border)" }}>
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-colors whitespace-nowrap cursor-pointer"
              style={{
                color: activeTab === tab.id ? "var(--accent)" : "var(--text-2)",
                borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "outline" && (
        <div className="grid gap-0" style={{ gridTemplateColumns: "1fr 380px" }}>
          {/* Heading list */}
          <div className="card" style={{ overflow: "hidden", borderRight: "none", borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>
            {data.headings.length > 0 ? (
              data.headings.map((h, i) => (
                <HeadingRow key={i} heading={h} selected={selectedHeading === i} onSelect={() => setSelectedHeading(i)} />
              ))
            ) : (
              <Empty icon="file" title="No headings" sub="Generate a brief to create headings" />
            )}
          </div>

          {/* Inspector */}
          <div
            className="card sticky top-0 self-start overflow-y-auto"
            style={{
              maxHeight: "calc(100vh - 200px)",
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
            }}
          >
            {selectedHeading !== null && data.headings[selectedHeading] ? (
              <Inspector
                heading={data.headings[selectedHeading]}
                onEdit={(field, value) => editHeading(selectedHeading, field, value)}
              />
            ) : (
              <div className="flex items-center justify-center h-full py-20">
                <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
                  Select a heading to inspect
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "analysis" && <AnalysisTab queryPreAnalysis={data.queryPreAnalysis} serpAnalysis={data.serpAnalysis} />}
      {activeTab === "entities" && <EntitiesTab entities={data.entityMap} />}
      {activeTab === "topics" && <TopicsTab topicalMap={data.topicalMap} />}
      {activeTab === "links" && <LinksTab connections={data.connectionMap} />}
      {activeTab === "competitors" && <CompetitorsTab competitors={data.competitors} deepAnalysis={data.deepCompetitorAnalysis} />}
      {activeTab === "validation" && <ValidationTab headingValidation={data.headingValidation} qualityReport={data.qualityReport} />}
    </div>
  );
}

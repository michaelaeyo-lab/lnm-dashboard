"use client";

import { useMemo, useState, useCallback } from "react";
import {
  ChevronDown,
  Star,
  Eye,
  Target,
  Map as MapIcon,
  Code2,
  Layers,
  Search,
  FileText,
  List,
  Table as TableIcon,
  Image as ImageIcon,
  Flag,
  ShieldCheck,
  Sparkles,
  Check,
  Copy,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Chip } from "@/app/components/ui/chip";
import { Empty } from "@/app/components/ui/empty";
import { cn } from "@/app/lib/utils";
import type { EnhancedHeading } from "@/app/lib/types";

// ── Types ──

type HeadingLevel = 1 | 2 | 3 | 4;

// ── Theme maps ──

const LEVEL_THEME: Record<
  HeadingLevel,
  { color: string; soft: string; border: string; label: string; tone: "amber" | "cyan" | "violet" | "mint" }
> = {
  1: { color: "var(--amber)",  soft: "var(--amber-soft)",  border: "oklch(0.80 0.14 75 / 0.32)",  label: "Title",        tone: "amber"  },
  2: { color: "var(--cyan)",   soft: "var(--cyan-soft)",   border: "oklch(0.78 0.12 220 / 0.32)", label: "Section",      tone: "cyan"   },
  3: { color: "var(--violet)", soft: "var(--violet-soft)", border: "oklch(0.72 0.17 300 / 0.32)", label: "Sub-section",  tone: "violet" },
  4: { color: "var(--mint)",   soft: "var(--mint-soft)",   border: "oklch(0.78 0.13 165 / 0.32)", label: "Sub-question", tone: "mint"   },
};

type RationaleKey = "levelJustification" | "patternRationale" | "readerIntent" | "evidenceBasis" | "hierarchyRole";

const RATIONALE_META: Record<
  RationaleKey,
  { label: string; icon: LucideIcon; tone: "level" | "violet" | "mint" | "amber" | "cyan"; title: (h: EnhancedHeading) => string }
> = {
  levelJustification: { label: "Level",     icon: Layers,  tone: "level",  title: (h) => `Why H${h.level}?` },
  patternRationale:   { label: "Pattern",   icon: Code2,   tone: "violet", title: (h) => `Why ${h.structurePattern || "paragraph"}?` },
  readerIntent:       { label: "Reader",    icon: Eye,     tone: "mint",   title: () => "Reader Journey" },
  evidenceBasis:      { label: "Evidence",  icon: Target,  tone: "amber",  title: () => "Evidence" },
  hierarchyRole:      { label: "Hierarchy", icon: MapIcon, tone: "cyan",   title: () => "Hierarchy Role" },
};

const TONE_STYLES: Record<"violet" | "mint" | "amber" | "cyan", { color: string; soft: string; border: string }> = {
  violet: { color: "var(--violet)", soft: "oklch(0.72 0.17 300 / 0.10)", border: "oklch(0.72 0.17 300 / 0.28)" },
  mint:   { color: "var(--mint)",   soft: "oklch(0.78 0.13 165 / 0.10)", border: "oklch(0.78 0.13 165 / 0.28)" },
  amber:  { color: "var(--amber)",  soft: "oklch(0.80 0.14 75 / 0.10)",  border: "oklch(0.80 0.14 75 / 0.28)"  },
  cyan:   { color: "var(--cyan)",   soft: "oklch(0.78 0.12 220 / 0.10)", border: "oklch(0.78 0.12 220 / 0.28)" },
};

const PATTERN_TONE: Record<string, "default" | "accent" | "mint" | "amber" | "coral" | "cyan" | "violet"> = {
  paragraph: "default", list: "amber", "list-definition": "amber",
  table: "cyan", "table-format": "cyan", comparison: "violet", visual: "mint",
  "purpose-summary": "accent", "entity-template": "violet",
  "direct-answer": "mint", "explicit-definition": "cyan",
  "reasoning-based": "amber", "exact-answer": "mint", "suggestive-answer": "amber",
};

const PATTERN_ICON: Record<string, LucideIcon> = {
  paragraph: FileText, list: List, "list-definition": List,
  table: TableIcon, "table-format": TableIcon, comparison: Layers, visual: ImageIcon,
  "purpose-summary": Star, "entity-template": ShieldCheck,
  "direct-answer": Flag, "explicit-definition": Flag,
  "reasoning-based": Sparkles, "exact-answer": Check, "suggestive-answer": Sparkles,
};

const RULE_NAMES: Record<string, string> = {
  FS: "Featured Snippet target", PAA: "People Also Ask target",
  NER: "Named-Entity Recognition", "TF-IDF": "Term-frequency / inverse-document-frequency",
  "CO-OCC": "Co-occurrence binding", PERSPECTIVE: "Perspective coverage",
};

// ── Indent guide computation ──

function computeGuides(items: EnhancedHeading[]): number[][] {
  const result: number[][] = items.map(() => []);
  for (let i = 0; i < items.length; i++) {
    const cur = items[i];
    for (let lvl = 2; lvl < cur.level; lvl++) {
      let hasFuture = false;
      for (let j = i + 1; j < items.length; j++) {
        if (items[j].level <= lvl) {
          if (items[j].level === lvl) hasFuture = true;
          break;
        }
      }
      if (hasFuture) result[i].push(lvl);
    }
  }
  return result;
}

// ── Sub-components ──

function LevelChip({ level }: { level: HeadingLevel }) {
  const t = LEVEL_THEME[level];
  return (
    <span
      className="inline-flex h-[22px] min-w-[28px] items-center justify-center rounded-md border px-2 font-[var(--font-mono)] text-[10.5px] font-semibold tracking-wide"
      style={{ background: t.soft, color: t.color, borderColor: t.border }}
    >
      H{level}
    </span>
  );
}

function RationaleBubble({ rkey, item, body }: { rkey: RationaleKey; item: EnhancedHeading; body: string }) {
  const meta = RATIONALE_META[rkey];
  const Icon = meta.icon;
  const styles = meta.tone === "level"
    ? { color: LEVEL_THEME[item.level as HeadingLevel].color, soft: LEVEL_THEME[item.level as HeadingLevel].soft, border: LEVEL_THEME[item.level as HeadingLevel].border }
    : TONE_STYLES[meta.tone];

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border p-3.5"
      style={{ background: styles.soft, borderColor: styles.border }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md border"
          style={{ background: styles.soft, color: styles.color, borderColor: styles.border }}
        >
          <Icon className="h-3 w-3" />
        </span>
        <span
          className="rounded-sm border px-1.5 py-0.5 font-[var(--font-mono)] text-[9.5px] font-medium uppercase tracking-widest"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: styles.color }}
        >
          {meta.label}
        </span>
        <span className="text-[12.5px] font-semibold tracking-tight" style={{ color: "var(--text-1)" }}>
          {meta.title(item)}
        </span>
      </div>
      <p className="text-[13px] leading-[1.55]" style={{ color: "var(--text-2)" }}>{body}</p>
    </div>
  );
}

function SectionLabel({ children, trailing }: { children: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-[var(--font-mono)] text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
      <span className="h-1 w-1 rounded-full" style={{ background: "var(--text-4)" }} />
      {children}
      <span className="ml-1 h-px flex-1" style={{ background: "var(--border)" }} />
      {trailing}
    </div>
  );
}

function SeoMetaBlock({ item }: { item: EnhancedHeading }) {
  const queries = item.targetQueries || [];
  const serp = item.serpFeatures || [];
  const rules = item.ruleCodes || [];

  return (
    <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
      <div className="card card-pad">
        <div className="eyebrow mb-2">Target queries &middot; {queries.length}</div>
        <div className="flex flex-col gap-1">
          {queries.map((q, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 text-[12px]" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="flex-1 min-w-0 truncate" style={{ color: "var(--text-1)" }}>{q.query}</span>
              <Badge tone="default" mono={false}>{q.intent}</Badge>
              <span className="font-[var(--font-mono)] text-[11px] tabular-nums" style={{ color: "var(--text-3)" }}>
                {q.volume.toLocaleString()}/mo
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card card-pad">
        <div className="eyebrow mb-2">SERP features &middot; {serp.length}</div>
        <div className="flex flex-wrap gap-1.5">
          {serp.map((f) => (
            <Chip key={f} tone="mint">{f}</Chip>
          ))}
        </div>
      </div>

      <div className="card card-pad">
        <div className="eyebrow mb-2">Rule codes &middot; {rules.length}</div>
        <div className="flex flex-wrap gap-1.5">
          {rules.map((c) => (
            <Badge key={c} tone="cyan" mono title={RULE_NAMES[c] ?? c}>{c}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Heading Row ──

function HierarchyRow({
  item,
  expanded,
  onToggle,
  guides,
}: {
  item: EnhancedHeading;
  expanded: boolean;
  onToggle: () => void;
  guides: number[];
}) {
  const indent = (item.level - 1) * 28;
  const primaryQ = (item.targetQueries || [])[0];
  const levelTheme = LEVEL_THEME[item.level as HeadingLevel];
  const patternTone = PATTERN_TONE[item.structurePattern || "paragraph"] || "default";
  const PatternIcon = PATTERN_ICON[item.structurePattern || "paragraph"] || FileText;

  const [copied, setCopied] = useState(false);
  const onCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(item.structureInstructions);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [item.structureInstructions]);

  const totalVolume = (item.targetQueries || []).reduce((s, q) => s + q.volume, 0);

  return (
    <div
      className="relative"
      style={{ borderBottom: "1px solid var(--border)", background: expanded ? "var(--bg)" : undefined }}
      data-level={item.level}
    >
      {/* Indent guide lines */}
      {guides.map((lvl) => (
        <span
          key={lvl}
          className="absolute top-0 bottom-0 w-px"
          style={{ left: (lvl - 1) * 28 + 18, background: "var(--border)" }}
        />
      ))}

      {/* Branch tee */}
      {item.level > 1 && (
        <>
          <span className="absolute h-px w-3.5" style={{ left: indent - 10, top: 22, background: levelTheme.color }} />
          <span className="absolute w-px" style={{ left: indent - 10, top: 6, height: 16, background: "var(--border)" }} />
        </>
      )}

      {/* Clickable header */}
      <button
        onClick={onToggle}
        className="relative z-10 grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 py-3 pr-3.5 text-left transition-colors cursor-pointer"
        style={{
          paddingLeft: indent + 6,
          ...(expanded ? { background: "var(--accent-faint)" } : {}),
        }}
        onMouseEnter={(e) => { if (!expanded) e.currentTarget.style.background = "var(--surface)"; }}
        onMouseLeave={(e) => { if (!expanded) e.currentTarget.style.background = ""; }}
      >
        <LevelChip level={item.level as HeadingLevel} />

        <span
          className="min-w-0 truncate tracking-tight"
          style={{
            color: "var(--text-1)",
            fontSize: item.level === 1 ? 16.5 : item.level === 2 ? 14.5 : 13.5,
            fontWeight: item.level <= 2 ? 600 : 500,
          }}
        >
          {item.text}
        </span>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Badge tone={patternTone} mono={false}>
            <PatternIcon size={10} />
            {item.structurePattern || "paragraph"}
          </Badge>

          {item.snippetTarget && (
            <Badge tone="accent">
              <Star size={10} /> FS
            </Badge>
          )}
          {item.paaTarget && (
            <Badge tone="amber">PAA</Badge>
          )}

          {primaryQ && (
            <span
              className="hidden max-w-[200px] items-center gap-1.5 rounded border px-2 py-0.5 md:inline-flex"
              style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
              title={`${primaryQ.query} - ${primaryQ.intent}`}
            >
              <span className="truncate text-[11.5px]" style={{ color: "var(--text-2)" }}>{primaryQ.query}</span>
              <span className="flex-shrink-0 font-[var(--font-mono)] text-[10.5px]" style={{ color: "var(--text-3)" }}>
                {primaryQ.volume.toLocaleString()}/mo
              </span>
            </span>
          )}

          <span
            className="hidden rounded border px-2 py-0.5 font-[var(--font-mono)] text-[11.5px] tabular-nums sm:inline-flex"
            style={{ borderColor: "var(--border)", background: "var(--bg-elev)", color: "var(--text-3)" }}
          >
            {item.wordCountTarget ?? "—"}<span className="ml-0.5 opacity-60">w</span>
          </span>

          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded && "rotate-180")}
            style={{ color: "var(--text-3)" }}
          />
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="flex flex-col gap-4 pb-5 pr-3.5" style={{ paddingLeft: indent + 6 }}>
          {/* Intent bar */}
          <div
            className="flex items-start gap-3 rounded-lg border p-3 px-3.5"
            style={{ background: "var(--accent-faint)", borderColor: "oklch(0.68 0.17 290 / 0.25)" }}
          >
            <Eye className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--accent)" }} />
            <div>
              <div className="eyebrow mb-0.5" style={{ color: "var(--accent)" }}>Intent</div>
              <div className="text-[13.5px] leading-relaxed" style={{ color: "var(--text-1)" }}>{item.intent}</div>
            </div>
          </div>

          {/* Rationale grid */}
          {item.contextualRationale && (
            <>
              <SectionLabel>Why this heading exists</SectionLabel>
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {(Object.keys(RATIONALE_META) as RationaleKey[]).map((key) => (
                  <RationaleBubble
                    key={key}
                    rkey={key}
                    item={item}
                    body={item.contextualRationale![key]}
                  />
                ))}
              </div>
            </>
          )}

          {!item.contextualRationale && (
            <>
              <SectionLabel>Why this heading exists</SectionLabel>
              <div className="rounded-lg border p-4 text-center text-[12px]" style={{ borderColor: "var(--border)", color: "var(--text-3)" }}>
                Rationale not generated for this brief. Regenerate to produce contextual rationale.
              </div>
            </>
          )}

          {/* Structure instructions */}
          <SectionLabel
            trailing={
              <Button variant="ghost" size="sm" onClick={onCopy} className="h-[22px] gap-1 px-2 font-[var(--font-mono)] text-[10px] uppercase tracking-wider">
                {copied ? <><Check className="h-2.5 w-2.5" /> Copied</> : <><Copy className="h-2.5 w-2.5" /> Copy</>}
              </Button>
            }
          >
            Structure instructions
          </SectionLabel>
          <pre
            className="m-0 max-h-[360px] overflow-auto rounded-md border border-l-[3px] p-3.5 font-[var(--font-mono)] text-[12.5px] leading-relaxed whitespace-pre-wrap"
            style={{ borderColor: "var(--border)", borderLeftColor: "var(--text-4)", background: "var(--bg-elev)", color: "var(--text-1)" }}
          >
            {item.structureInstructions}
          </pre>

          {/* SEO metadata */}
          <SectionLabel>SEO metadata</SectionLabel>
          <SeoMetaBlock item={item} />
        </div>
      )}
    </div>
  );
}

// ── Main panel ──

export interface ContextualHierarchyPanelProps {
  items: EnhancedHeading[];
  defaultExpanded?: number[];
}

export function ContextualHierarchyPanel({
  items,
  defaultExpanded = [],
}: ContextualHierarchyPanelProps) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set(defaultExpanded));
  const [levelFilter, setLevelFilter] = useState<"all" | "1" | "2" | "3" | "4">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (levelFilter !== "all" && it.level !== Number(levelFilter)) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (
          !it.text.toLowerCase().includes(q) &&
          !(it.structurePattern || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [items, levelFilter, query]);

  const guides = useMemo(() => computeGuides(filtered), [filtered]);

  const toggle = useCallback((i: number) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(new Set(filtered.map((_, i) => i)));
  }, [filtered]);

  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  const counts = useMemo(() => {
    const c: Record<HeadingLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    items.forEach((i) => { c[i.level]++; });
    return c;
  }, [items]);

  if (items.length === 0) {
    return <Empty icon="file" title="No headings" sub="Generate a brief to see the contextual hierarchy" />;
  }

  return (
    <div className="flex flex-col gap-3.5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex items-center gap-2">
          <h2 className="h2">Contextual hierarchy</h2>
          <Badge tone="default">{items.length} headings</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Level filter */}
          <div className="inline-flex gap-0.5 rounded-lg border p-[3px]" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
            {(["all", "1", "2", "3", "4"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLevelFilter(l)}
                className="inline-flex h-[26px] items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors cursor-pointer"
                style={{
                  color: levelFilter === l ? "var(--text-1)" : "var(--text-3)",
                  background: levelFilter === l ? "var(--surface)" : "transparent",
                  boxShadow: levelFilter === l ? "0 1px 2px oklch(0 0 0 / 0.2)" : "none",
                }}
              >
                {l === "all" ? "All" : `H${l}`}
                <span
                  className="rounded border px-1 font-[var(--font-mono)] text-[10px]"
                  style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text-3)" }}
                >
                  {l === "all" ? items.length : counts[Number(l) as HeadingLevel]}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div
            className="flex h-[30px] w-[180px] items-center gap-1.5 rounded-md border px-2.5"
            style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
          >
            <Search className="h-3 w-3" style={{ color: "var(--text-3)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter..."
              className="h-auto flex-1 border-0 bg-transparent p-0 text-[12.5px] outline-none"
              style={{ color: "var(--text-1)" }}
            />
          </div>

          <Button variant="ghost" size="sm" onClick={expandAll} leading={<ChevronDown size={11} />}>
            Expand all
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            Collapse
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap items-center gap-3.5 rounded-lg border px-3.5 py-2"
        style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
      >
        <span className="eyebrow">Legend</span>
        {([1, 2, 3, 4] as HeadingLevel[]).map((lvl) => (
          <span key={lvl} className="inline-flex items-center gap-1.5">
            <LevelChip level={lvl} />
            <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{LEVEL_THEME[lvl].label}</span>
          </span>
        ))}
        <span className="flex-1" />
        <span className="font-[var(--font-mono)] text-[11px]" style={{ color: "var(--text-3)" }}>
          {filtered.length} of {items.length} visible &middot; {expanded.size} expanded
        </span>
      </div>

      {/* Rows */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm" style={{ color: "var(--text-3)" }}>
            No matching headings. Adjust your filters or search query.
          </div>
        ) : (
          filtered.map((it, i) => (
            <HierarchyRow
              key={`${it.level}-${it.text}-${i}`}
              item={it}
              expanded={expanded.has(i)}
              onToggle={() => toggle(i)}
              guides={guides[i] ?? []}
            />
          ))
        )}
      </div>
    </div>
  );
}

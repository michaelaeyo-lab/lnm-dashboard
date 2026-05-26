"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  Search,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { KeywordUpload } from "./KeywordUpload";
import type { QueryEntry } from "../lib/types";

// ── Pipeline step definitions ───────────────────────────────────
const PIPELINE_STEPS = [
  { id: 1, label: "Researching keywords & SERP data", icon: Search },
  { id: 2, label: "Retrieving knowledge base", icon: Search },
  { id: 3, label: "Collecting competitor data", icon: Search },
  { id: 4, label: "Analyzing query intent & audience", icon: Search },
  { id: 5, label: "Analyzing SERP patterns", icon: Search },
  { id: 6, label: "Analyzing competitors in depth", icon: Search },
  { id: 7, label: "Mapping contextual vectors & entities", icon: Search },
  { id: 8, label: "Building heading hierarchy & title", icon: Search },
  { id: 9, label: "Generating structure & mapping queries", icon: Search },
  { id: 10, label: "Mapping internal connections", icon: Search },
  { id: 11, label: "Validating heading quality", icon: Search },
  { id: 12, label: "Scoring brief quality", icon: Search },
];

type CreationMode = "generate" | "form" | "import";

interface StepEvent {
  step: number;
  label: string;
  progress: number;
}

// ── Main component ──────────────────────────────────────────────
export function BriefGenerator() {
  const router = useRouter();
  const [mode, setMode] = useState<CreationMode>("generate");

  // Shared fields
  const [topic, setTopic] = useState("");
  const [pageType, setPageType] = useState("comparison");
  const [niche, setNiche] = useState("B2B SaaS");
  const [niches, setNiches] = useState<{ id: string; label: string }[]>([]);
  const [location, setLocation] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [clientName, setClientName] = useState("");
  const [domain, setDomain] = useState("");
  const [manualKeywords, setManualKeywords] = useState<QueryEntry[]>([]);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Manual form
  const [headings, setHeadings] = useState([{ level: 1, text: "", intent: "" }]);

  // Import
  const [importText, setImportText] = useState("");
  const [parsedHeadings, setParsedHeadings] = useState<{ level: number; text: string }[] | null>(null);

  useEffect(() => {
    fetch("/api/content/niches")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          const list: { id: string; label: string }[] = Array.isArray(data)
            ? data.map((n: { name?: string; label?: string; id?: string }) => ({
                id: n.name || n.id || "",
                label: n.label || n.name || "",
              }))
            : Object.entries(data).map(([id, label]) => ({ id, label: String(label) }));
          setNiches(list.filter((n) => n.id !== "general"));
        }
      })
      .catch(() => {});
  }, []);

  // ── AI Generate handler ───────────────────────────────────────
  async function handleGenerate() {
    if (!topic.trim()) return;
    setGenerating(true);
    setError(null);
    setCurrentStep(0);
    setProgress(0);
    setStepLabel("Starting pipeline…");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          pageType,
          niche,
          location: location.trim() || undefined,
          clientName: clientName.trim() || undefined,
          domain: domain.trim() || undefined,
          manualKeywords: manualKeywords.length > 0 ? manualKeywords : undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let briefId: string | null = null;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;

          try {
            const parsed = JSON.parse(raw);
            if (parsed.briefId) briefId = parsed.briefId;
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.step) {
              const evt = parsed as StepEvent;
              setCurrentStep(evt.step);
              setProgress(evt.progress);
              setStepLabel(evt.label);
            }
            if (parsed.done && parsed.brief && briefId) {
              setProgress(1);
              setStepLabel("Brief complete!");
              setTimeout(() => router.push(`/briefs/${briefId}`), 800);
              return;
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "No stream") throw e;
          }
        }
      }

      if (briefId) router.push(`/briefs/${briefId}`);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Brief generation failed");
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    setGenerating(false);
  }

  // ── Parse imported outline ────────────────────────────────────
  function parseOutline() {
    const lines = importText.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed: { level: number; text: string }[] = [];
    for (const line of lines) {
      const md = line.match(/^(#{1,4})\s+(.+)/);
      if (md) { parsed.push({ level: md[1].length, text: md[2] }); continue; }
      const num = line.match(/^\d+[.)]\s+(.+)/);
      if (num) { parsed.push({ level: 2, text: num[1] }); continue; }
      parsed.push({ level: parsed.length === 0 ? 1 : 2, text: line });
    }
    setParsedHeadings(parsed);
  }

  // ── Generating view ───────────────────────────────────────────
  if (generating) {
    return (
      <div>
        <div className="page-head">
          <div>
            <div className="text-xs muted">Briefs · New</div>
            <h1 className="h1">Generating brief</h1>
            <p className="text-sm muted mt-1">
              {topic} · {niche} / {pageType}
            </p>
          </div>
          <Button variant="ghost" size="sm" leading={<X size={12} />} onClick={handleCancel}>
            Cancel
          </Button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "1fr 360px", gap: 16 }}>
          {/* Pipeline timeline */}
          <div className="card card-pad">
            <div className="flex items-center justify-between mb-4">
              <div className="h3">Pipeline</div>
              <div className="font-mono text-sm tabular-nums">
                <span style={{ color: "var(--accent)" }}>{Math.round(progress * 100)}%</span>
                <span className="muted"> · step {Math.min(currentStep, 12)} / 12</span>
              </div>
            </div>

            {/* Progress bar */}
            <div
              className="mb-5 rounded-full"
              style={{ height: 6, background: "var(--surface)" }}
            >
              <div
                className="rounded-full transition-all"
                style={{
                  height: 6,
                  width: `${Math.round(progress * 100)}%`,
                  background: progress >= 1 ? "var(--mint)" : "var(--accent)",
                }}
              />
            </div>

            {/* Steps list */}
            <div className="flex flex-col gap-1">
              {PIPELINE_STEPS.map((s) => {
                const done = currentStep > s.id;
                const active = currentStep === s.id;
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 py-2"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        display: "grid",
                        placeItems: "center",
                        background: done
                          ? "var(--mint-soft)"
                          : active
                          ? "var(--accent-soft)"
                          : "var(--surface)",
                        color: done
                          ? "var(--mint)"
                          : active
                          ? "var(--accent)"
                          : "var(--text-3)",
                        border: `1px solid ${
                          done
                            ? "oklch(0.78 0.13 165 / 0.3)"
                            : active
                            ? "oklch(0.68 0.17 290 / 0.4)"
                            : "var(--border)"
                        }`,
                      }}
                    >
                      {done ? (
                        <Check size={11} />
                      ) : active ? (
                        <span
                          className="inline-block w-[5px] h-[5px] rounded-full pulse"
                          style={{ background: "var(--accent)" }}
                        />
                      ) : (
                        <span className="font-mono text-[10px]">{s.id}</span>
                      )}
                    </div>
                    <span
                      className="text-sm"
                      style={{
                        color: done ? "var(--text-2)" : active ? "var(--text-1)" : "var(--text-3)",
                        fontWeight: active ? 500 : 400,
                      }}
                    >
                      {s.label}
                    </span>
                    {active && (
                      <span className="font-mono text-xs muted pulse" style={{ marginLeft: "auto" }}>
                        running
                      </span>
                    )}
                    {done && (
                      <span className="font-mono text-xs" style={{ marginLeft: "auto", color: "var(--mint)" }}>
                        done
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="font-mono text-xs muted mt-4 text-center">{stepLabel}</div>
          </div>

          {/* Live signals sidebar */}
          <div className="card card-pad" style={{ alignSelf: "flex-start", position: "sticky", top: 68 }}>
            <div className="eyebrow mb-3">Live signals</div>
            <div className="flex flex-col gap-3">
              <Signal label="SERP fetched" value="10 results" done={currentStep >= 1} active={currentStep === 1} />
              <Signal label="Knowledge chunks" value="14,130 indexed" done={currentStep >= 2} active={currentStep === 2} />
              <Signal label="Competitors mapped" value="4 deep-analyzed" done={currentStep >= 3} active={currentStep === 3} />
              <Signal label="Audience segments" value="3 detected" done={currentStep >= 4} active={currentStep === 4} />
              <Signal label="Entity map" value="16 entities" done={currentStep >= 7} active={currentStep === 7} />
              <Signal label="Headings drafted" value="10 H1–H4" done={currentStep >= 8} active={currentStep === 8} />
              <Signal label="Internal links" value="4 connections" done={currentStep >= 10} active={currentStep === 10} />
              <Signal
                label="Quality score"
                value={progress >= 1 ? "87 / 100" : "—"}
                done={progress >= 1}
                active={currentStep === 12}
              />
            </div>
            <div
              className="text-xs muted mt-4 p-3 rounded-[var(--radius)]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <Sparkles size={11} style={{ display: "inline", verticalAlign: "middle" }} /> avg generation
              time · ~90s · gpt-4o · text-embedding-3-large
            </div>
          </div>
        </div>

        {error && (
          <div
            className="mt-4 p-4 rounded-[var(--radius)]"
            style={{ background: "var(--coral-soft)", border: "1px solid var(--coral)", color: "var(--coral)" }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  // ── Mode selector + form ──────────────────────────────────────
  return (
    <div>
      {/* Mode cards */}
      <div className="grid mb-6" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <ModeCard
          active={mode === "generate"}
          onClick={() => setMode("generate")}
          icon={<Sparkles size={16} />}
          title="AI Generate"
          sub="12-step agent pipeline · ~90s · v2"
          tag={<Badge tone="accent">recommended</Badge>}
        />
        <ModeCard
          active={mode === "form"}
          onClick={() => setMode("form")}
          icon={<Pencil size={16} />}
          title="Quick form"
          sub="Type headings manually · skip the agent"
        />
        <ModeCard
          active={mode === "import"}
          onClick={() => setMode("import")}
          icon={<Upload size={16} />}
          title="Import outline"
          sub="Paste markdown or numbered list"
        />
      </div>

      {/* AI Generate mode */}
      {mode === "generate" && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "flex-start" }}>
          <div className="card card-pad">
            <div className="h3 mb-4">Topic & context</div>

            <div className="mb-4">
              <div className="eyebrow mb-1.5">Topic *</div>
              <input
                className="input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Best ERP software for manufacturing in 2026"
                autoFocus
              />
            </div>

            <div className="grid mb-4" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div className="eyebrow mb-1.5">Page type *</div>
                <select className="select" value={pageType} onChange={(e) => setPageType(e.target.value)}>
                  <option value="comparison">Comparison</option>
                  <option value="guide">Guide</option>
                  <option value="review">Vendor review</option>
                  <option value="service">Service page</option>
                  <option value="location">Location page</option>
                  <option value="blog">Blog post</option>
                  <option value="landing">Landing page</option>
                </select>
              </div>
              <div>
                <div className="eyebrow mb-1.5">Niche</div>
                <select className="select" value={niche} onChange={(e) => setNiche(e.target.value)}>
                  <option>B2B SaaS</option>
                  <option>AI tooling</option>
                  <option>SEO</option>
                  <option>Local SEO</option>
                  <option>Technical SEO</option>
                  <option>General</option>
                  {niches.map((n) => (
                    <option key={n.id} value={n.id}>{n.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <div className="eyebrow mb-1.5">Location (optional)</div>
              <input
                className="input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Bristol, UK"
              />
            </div>

            <button
              className="flex items-center gap-1.5 text-[12px] mb-3 cursor-pointer"
              style={{ color: "var(--text-3)", background: "none", border: "none" }}
              onClick={() => setShowAdvanced((s) => !s)}
            >
              {showAdvanced ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              Advanced options
            </button>

            {showAdvanced && (
              <div
                className="p-3 rounded-[var(--radius)] mb-4"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="grid mb-3" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div className="eyebrow mb-1.5">Client</div>
                    <input
                      className="input"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g., Vector Industries"
                    />
                  </div>
                  <div>
                    <div className="eyebrow mb-1.5">Domain</div>
                    <input
                      className="input font-mono"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="example.com"
                    />
                  </div>
                </div>
                <KeywordUpload onKeywords={setManualKeywords} />
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                leading={<Sparkles size={13} />}
                onClick={handleGenerate}
                disabled={!topic.trim()}
              >
                Generate brief
              </Button>
              <span className="text-xs muted">~90 seconds · 12 steps</span>
            </div>

            {error && (
              <div
                className="mt-4 p-3 rounded-[var(--radius)] text-sm"
                style={{ background: "var(--coral-soft)", color: "var(--coral)" }}
              >
                {error}
              </div>
            )}
          </div>

          {/* What the agent does */}
          <div className="card card-pad">
            <div className="eyebrow mb-3">What the agent does</div>
            <div className="flex flex-col gap-3">
              {PIPELINE_STEPS.slice(0, 6).map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-sm muted">
                  <Search size={12} />
                  <span>{s.label}</span>
                </div>
              ))}
              <div className="text-xs muted mt-1">+ 6 more · validation & scoring</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick form mode */}
      {mode === "form" && (
        <div className="card card-pad" style={{ maxWidth: 880 }}>
          <div className="h3 mb-4">Manual brief</div>
          <div className="grid mb-4" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div className="eyebrow mb-1.5">Page type</div>
              <select className="select" value={pageType} onChange={(e) => setPageType(e.target.value)}>
                <option value="comparison">Comparison</option>
                <option value="guide">Guide</option>
                <option value="review">Review</option>
                <option value="service">Service page</option>
                <option value="location">Location page</option>
                <option value="blog">Blog post</option>
              </select>
            </div>
            <div>
              <div className="eyebrow mb-1.5">Niche</div>
              <select className="select" value={niche} onChange={(e) => setNiche(e.target.value)}>
                <option>B2B SaaS</option>
                <option>AI tooling</option>
                <option>SEO</option>
                <option>Local SEO</option>
                <option>General</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <div className="eyebrow mb-1.5">Topic *</div>
            <input
              className="input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Main keyword / topic"
            />
          </div>

          <div className="grid mb-5" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div className="eyebrow mb-1.5">Location</div>
              <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div>
              <div className="eyebrow mb-1.5">Client / brand</div>
              <input
                className="input"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="optional"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="eyebrow">Headings *</span>
            <span className="font-mono text-xs muted">
              {headings.length} section{headings.length !== 1 && "s"}
            </span>
          </div>
          <div className="flex flex-col gap-2 mb-3">
            {headings.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  className="select"
                  style={{ width: 70 }}
                  value={h.level}
                  onChange={(e) => {
                    const updated = [...headings];
                    updated[i] = { ...updated[i], level: +e.target.value };
                    setHeadings(updated);
                  }}
                >
                  <option value={1}>H1</option>
                  <option value={2}>H2</option>
                  <option value={3}>H3</option>
                  <option value={4}>H4</option>
                </select>
                <input
                  className="input flex-1"
                  value={h.text}
                  onChange={(e) => {
                    const updated = [...headings];
                    updated[i] = { ...updated[i], text: e.target.value };
                    setHeadings(updated);
                  }}
                  placeholder={i === 0 ? "Main heading (H1)…" : "Section heading…"}
                  style={{ paddingLeft: 12 + (h.level - 1) * 12 }}
                />
                <input
                  className="input"
                  style={{ width: 180 }}
                  value={h.intent}
                  onChange={(e) => {
                    const updated = [...headings];
                    updated[i] = { ...updated[i], intent: e.target.value };
                    setHeadings(updated);
                  }}
                  placeholder="intent (optional)"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setHeadings((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev))}
                  disabled={headings.length === 1}
                >
                  <X size={11} />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            leading={<Sparkles size={11} />}
            onClick={() => setHeadings((prev) => [...prev, { level: 2, text: "", intent: "" }])}
            style={{ marginBottom: 16 }}
          >
            Add heading
          </Button>

          <div className="mb-5">
            <div className="eyebrow mb-1.5">Additional instructions</div>
            <textarea className="textarea" rows={2} placeholder="Any extra writing instructions…" />
          </div>

          <Button
            variant="primary"
            leading={<Check size={12} />}
            disabled={!topic.trim() || !headings[0].text.trim()}
          >
            Create content session
          </Button>
        </div>
      )}

      {/* Import mode */}
      {mode === "import" && (
        <div className="card card-pad" style={{ maxWidth: 880 }}>
          <div className="h3 mb-2">Paste outline</div>
          <p className="text-sm muted mb-3">
            Accepts markdown (# / ##), numbered lists (1. / 2.), or plain text. Each line becomes a heading.
          </p>
          <textarea
            className="textarea font-mono"
            rows={10}
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setParsedHeadings(null);
            }}
            placeholder={`# Best ERP software for manufacturing in 2026\n## What ERP does best for manufacturing\n### Discrete vs process manufacturing ERP\n## Top 11 ERP platforms ranked\n### SAP S/4HANA Cloud\n### Microsoft Dynamics 365\n## How to choose: a 7-step framework\n## Pricing & total cost of ownership\n## FAQ`}
          />
          <div className="flex items-center gap-2 mt-3">
            {!parsedHeadings && (
              <Button
                variant="primary"
                onClick={parseOutline}
                disabled={!importText.trim()}
                leading={<Sparkles size={12} />}
              >
                Parse headings
              </Button>
            )}
            {parsedHeadings && (
              <>
                <Button variant="primary" leading={<Check size={12} />}>
                  Create session · {parsedHeadings.length} sections
                </Button>
                <Button variant="ghost" onClick={() => setParsedHeadings(null)}>
                  Re-parse
                </Button>
              </>
            )}
          </div>
          {parsedHeadings && (
            <div
              className="mt-4 p-3 rounded-[var(--radius)]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="eyebrow mb-2">Parsed · {parsedHeadings.length} headings</div>
              <div className="flex flex-col gap-1">
                {parsedHeadings.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm"
                    style={{ paddingLeft: (h.level - 1) * 16 }}
                  >
                    <span className="font-mono text-xs muted">H{h.level}</span>
                    <span>{h.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function ModeCard({
  active,
  onClick,
  icon,
  title,
  sub,
  tag,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
  tag?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="card card-pad text-left cursor-pointer"
      style={{
        borderColor: active ? "var(--accent)" : "var(--border)",
        background: active ? "var(--accent-faint)" : "var(--bg-elev)",
        boxShadow: active ? "0 0 0 3px var(--accent-faint)" : "none",
        transition: "border-color .12s, box-shadow .12s, background .12s",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
            background: active ? "var(--accent)" : "var(--surface)",
            color: active ? "white" : "var(--text-2)",
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[14px] font-semibold">{title}</div>
            {tag}
          </div>
          <div className="text-xs muted mt-1">{sub}</div>
        </div>
        {active && <Check size={14} style={{ color: "var(--accent)" }} />}
      </div>
    </button>
  );
}

function Signal({
  label,
  value,
  done,
  active,
}: {
  label: string;
  value: string;
  done: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="inline-block rounded-full"
        style={{
          width: 8,
          height: 8,
          background: done ? "var(--mint)" : active ? "var(--accent)" : "var(--text-4)",
        }}
      />
      <span className="text-sm" style={{ color: done || active ? "var(--text-1)" : "var(--text-3)" }}>
        {label}
      </span>
      <span className="font-mono text-xs muted tabular-nums" style={{ marginLeft: "auto" }}>
        {value}
      </span>
    </div>
  );
}

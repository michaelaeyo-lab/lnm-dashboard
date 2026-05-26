"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Download,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Zap,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { StatusBadge } from "./ui/status-badge";
import { Empty } from "./ui/empty";
import type {
  ContentSessionData,
  ContentSectionData,
  ContentBrief,
  EnhancedHeading,
} from "../lib/types";

// ── Pattern badge tone map ──────────────────────────────────────
const PATTERN_TONE: Record<string, "default" | "cyan" | "amber" | "violet" | "mint"> = {
  paragraph: "default",
  table: "cyan",
  list: "amber",
  comparison: "violet",
  visual: "mint",
  "purpose-summary": "accent" as never,
  "explicit-definition": "default",
  "list-definition": "amber",
  "direct-answer": "cyan",
  "exact-answer": "cyan",
  "reasoning-based": "violet",
  "suggestive-answer": "mint",
  "table-format": "cyan",
};

// ── Writer states ───────────────────────────────────────────────
type WriterState = "idle" | "streaming" | "paused" | "error" | "refining" | "done";

interface SessionListItem {
  id: string;
  title: string;
  niche: string;
  pageType: string;
  status: string;
  updatedAt: string;
  sections: { id: string; status: string; headingLevel: number; headingText: string }[];
}

// ── Main component ──────────────────────────────────────────────
export function ContentWriter() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [activeSession, setActiveSession] = useState<ContentSessionData | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [writerState, setWriterState] = useState<WriterState>("idle");
  const [feedback, setFeedback] = useState("");
  const [streamContent, setStreamContent] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/content/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function loadSession(id: string) {
    try {
      const res = await fetch(`/api/content/sessions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data);
        setSelectedIdx(0);
        setWriterState("idle");
        setShowNew(false);
      }
    } catch {
      /* ignore */
    }
  }

  async function createSession(brief: ContentBrief) {
    try {
      const res = await fetch("/api/content/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      if (res.ok) {
        const session = await res.json();
        setActiveSession(session);
        setSelectedIdx(0);
        setShowNew(false);
        loadSessions();
      }
    } catch {
      /* ignore */
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/content/sessions/${id}`, { method: "DELETE" });
    if (activeSession?.id === id) setActiveSession(null);
    loadSessions();
  }

  function handleExport() {
    if (!activeSession) return;
    window.open(`/api/content/export/${activeSession.id}`, "_blank");
  }

  // ── Generate section content via SSE ──────────────────────────
  async function generateSection() {
    if (!activeSession) return;
    const section = activeSession.sections[selectedIdx];
    if (!section) return;

    setWriterState("streaming");
    setStreamContent("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/content/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          sectionId: section.id,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        setWriterState("error");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setWriterState("error");
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const raw = line.slice(6).trim();
            if (!raw || raw === "[DONE]") continue;
            try {
              const parsed = JSON.parse(raw);
              if (parsed.token) {
                accumulated += parsed.token;
                setStreamContent(accumulated);
              }
              if (parsed.done) {
                setWriterState("done");
              }
            } catch {
              /* skip incomplete chunk */
            }
          }
        }
      }

      if (writerState !== "done") {
        setWriterState("done");
      }

      // Update section in local state
      setActiveSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map((s) =>
            s.id === section.id ? { ...s, content: accumulated, status: "drafted" } : s
          ),
        };
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setWriterState("paused");
      } else {
        setWriterState("error");
      }
    }
  }

  function pauseGeneration() {
    abortRef.current?.abort();
    setWriterState("paused");
  }

  function resumeGeneration() {
    generateSection();
  }

  function acceptAndNext() {
    setWriterState("idle");
    setStreamContent("");
    if (activeSession && selectedIdx < activeSession.sections.length - 1) {
      setSelectedIdx(selectedIdx + 1);
    }
  }

  // ── Session list ──────────────────────────────────────────────
  if (!activeSession && !showNew) {
    return (
      <div>
        <div className="page-head">
          <div>
            <h1 className="h1">Content Writer</h1>
            <p className="text-sm muted mt-1">
              Section-by-section AI generation with rule compliance and streaming
            </p>
          </div>
          <Button
            variant="primary"
            size="default"
            onClick={() => setShowNew(true)}
            leading={<Sparkles size={13} />}
          >
            New Content
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm muted pulse">Loading sessions...</div>
          </div>
        ) : sessions.length === 0 ? (
          <Empty
            icon="file"
            title="No content sessions yet"
            sub="Create your first piece of content to get started."
          >
            <Button variant="primary" size="sm" onClick={() => setShowNew(true)} leading={<Sparkles size={12} />}>
              New Content
            </Button>
          </Empty>
        ) : (
          <div className="card" style={{ overflow: "hidden" }}>
            <div
              className="grid items-center gap-3 px-4 py-2"
              style={{
                gridTemplateColumns: "1fr 120px 100px 80px 80px 60px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span className="eyebrow">Title</span>
              <span className="eyebrow">Niche</span>
              <span className="eyebrow">Type</span>
              <span className="eyebrow">Progress</span>
              <span className="eyebrow">Status</span>
              <span className="eyebrow text-right" />
            </div>
            {sessions.map((s) => {
              const drafted = s.sections.filter((sec) => sec.status !== "pending").length;
              return (
                <div
                  key={s.id}
                  onClick={() => loadSession(s.id)}
                  className="grid items-center gap-3 px-4 py-3 transition-colors cursor-pointer"
                  style={{
                    gridTemplateColumns: "1fr 120px 100px 80px 80px 60px",
                    borderBottom: "1px solid var(--border)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div className="text-sm truncate" style={{ color: "var(--text-1)" }}>
                    {s.title}
                  </div>
                  <span className="text-[12px] truncate" style={{ color: "var(--text-2)" }}>
                    {s.niche}
                  </span>
                  <Badge tone="default" mono={false}>
                    {s.pageType}
                  </Badge>
                  <span className="font-mono text-[11px]" style={{ color: "var(--text-2)" }}>
                    {drafted}/{s.sections.length}
                  </span>
                  <StatusBadge status={s.status} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this session?")) handleDelete(s.id);
                    }}
                    className="text-[11px] cursor-pointer"
                    style={{ color: "var(--text-3)" }}
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── New session ──
  if (showNew && !activeSession) {
    return <NewSessionView onBack={() => setShowNew(false)} onSubmit={createSession} />;
  }

  // ── Active writing session — 3-pane layout ────────────────────
  if (!activeSession) return null;

  const currentSection = activeSession.sections[selectedIdx];
  const sectionContent = streamContent || currentSection?.content || "";
  const draftedCount = activeSession.sections.filter(
    (s) => s.status !== "pending"
  ).length;
  const wordCount = sectionContent.split(/\s+/).filter(Boolean).length;

  return (
    <div>
      {/* Page header */}
      <div className="page-head">
        <div>
          <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text-3)" }}>
            <button
              onClick={() => setActiveSession(null)}
              className="cursor-pointer"
              style={{ color: "var(--text-3)" }}
            >
              Writer
            </button>
            <ChevronRight size={10} />
            <span style={{ color: "var(--text-2)" }}>{activeSession.title}</span>
          </div>
          <h1 className="h1" style={{ fontSize: 22 }}>
            {activeSession.title}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge tone="cyan">session</Badge>
            <span className="text-xs muted">
              {activeSession.sections.length} sections · {draftedCount} drafted
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" leading={<Download size={12} />} onClick={handleExport}>
            Export Markdown
          </Button>
          <Button size="sm" leading={<Check size={12} />}>
            Mark complete
          </Button>
        </div>
      </div>

      {/* 3-pane: outline | editor | meta */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "280px minmax(0,1fr) 280px",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        {/* ── Outline pane ────────────────────────────────────── */}
        <div className="card" style={{ overflow: "hidden", position: "sticky", top: 68 }}>
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="h3">Outline</div>
            <Badge>{activeSession.sections.length}</Badge>
          </div>
          {activeSession.sections.map((sec, i) => {
            const isDrafted = sec.status !== "pending" && i !== selectedIdx;
            const isGenerating = i === selectedIdx && writerState === "streaming";
            const isErrored = i === selectedIdx && writerState === "error";
            const isActive = i === selectedIdx;

            return (
              <button
                key={sec.id}
                onClick={() => {
                  setSelectedIdx(i);
                  setStreamContent("");
                  if (i !== selectedIdx) setWriterState("idle");
                }}
                className="w-full text-left"
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  padding: "8px 12px",
                  paddingLeft: 12 + (sec.headingLevel - 1) * 12,
                  background: isActive ? "var(--surface)" : "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  borderLeft: isActive
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                }}
              >
                <span
                  className="font-mono text-[11px]"
                  style={{ color: "var(--text-3)", minWidth: 18 }}
                >
                  H{sec.headingLevel}
                </span>
                <span
                  className="text-sm flex-1"
                  style={{
                    color: isDrafted ? "var(--text-2)" : "var(--text-1)",
                    textDecoration: isDrafted ? "line-through" : "none",
                  }}
                >
                  {sec.headingText}
                </span>
                {isDrafted && (
                  <Check size={11} style={{ color: "var(--mint)", flexShrink: 0 }} />
                )}
                {isGenerating && (
                  <span
                    className="inline-block w-[6px] h-[6px] rounded-full pulse flex-shrink-0"
                    style={{ background: "var(--accent)", marginTop: 4 }}
                  />
                )}
                {isErrored && (
                  <AlertCircle size={11} style={{ color: "var(--coral)", flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Editor pane ─────────────────────────────────────── */}
        <div className="card card-pad">
          {/* Section meta bar */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="font-mono text-[11px] muted">
              H{currentSection?.headingLevel} · section {selectedIdx + 1}/
              {activeSession.sections.length}
            </span>
            {(() => {
              const meta = currentSection?.metadata as Record<string, unknown> | null;
              const pattern = meta?.contentDesignPattern;
              if (!pattern) return null;
              return (
                <Badge tone={PATTERN_TONE[String(pattern)] || "default"} mono={false}>
                  {String(pattern)}
                </Badge>
              );
            })()}
            <Badge tone="default">~{currentSection?.metadata && (currentSection.metadata as Record<string, unknown>).wordCountTarget ? String((currentSection.metadata as Record<string, unknown>).wordCountTarget) : "200"}w target</Badge>
            {writerState === "streaming" && (
              <Badge tone="cyan">
                <span
                  className="inline-block w-[5px] h-[5px] rounded-full pulse"
                  style={{ background: "var(--cyan)" }}
                />{" "}
                streaming
              </Badge>
            )}
            {writerState === "paused" && (
              <Badge tone="amber">
                <Pause size={10} /> paused
              </Badge>
            )}
            {writerState === "error" && (
              <Badge tone="coral">
                <AlertCircle size={10} /> failed
              </Badge>
            )}
            {writerState === "done" && (
              <Badge tone="mint">
                <Check size={10} /> accepted
              </Badge>
            )}
            {writerState === "refining" && (
              <Badge tone="violet">
                <Sparkles size={10} /> refining
              </Badge>
            )}
            <span style={{ flex: 1 }} />
            <Button
              variant="ghost"
              size="sm"
              leading={<RefreshCw size={11} />}
              onClick={generateSection}
            >
              {writerState === "idle" ? "Generate" : "Regenerate"}
            </Button>
          </div>

          {/* Error banner */}
          {writerState === "error" && (
            <div
              className="p-3 rounded-[var(--radius)] mb-4 flex items-start gap-3"
              style={{
                background: "var(--coral-soft)",
                border: "1px solid oklch(0.70 0.18 25 / 0.4)",
              }}
            >
              <AlertCircle size={14} style={{ color: "var(--coral)", flexShrink: 0, marginTop: 2 }} />
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: "var(--coral)" }}>
                  Generation failed
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-2)" }}>
                  The output was preserved as a partial draft. Retry or refine.
                </div>
              </div>
              <Button size="sm" leading={<RefreshCw size={11} />} onClick={generateSection}>
                Retry
              </Button>
            </div>
          )}

          {/* Heading title */}
          <h2 className="h2 mb-3" style={{ fontSize: 20 }}>
            {currentSection?.headingText}
          </h2>

          {/* Content body */}
          <div style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--text-2)" }}>
            {sectionContent ? (
              <div style={{ whiteSpace: "pre-wrap" }}>
                {sectionContent}
                {writerState === "streaming" && (
                  <span
                    className="inline-block"
                    style={{
                      width: 6,
                      height: 14,
                      background: "var(--accent)",
                      verticalAlign: "text-bottom",
                      animation: "pulse-soft 1s infinite",
                      marginLeft: 2,
                    }}
                  />
                )}
              </div>
            ) : writerState === "idle" ? (
              <div className="text-center py-12">
                <p className="text-sm muted mb-3">
                  Click &ldquo;Generate&rdquo; to start writing this section
                </p>
                <Button variant="primary" onClick={generateSection} leading={<Sparkles size={12} />}>
                  Generate section
                </Button>
              </div>
            ) : null}
            {writerState === "paused" && (
              <div className="text-xs muted mt-2">… paused · resume to continue</div>
            )}
          </div>

          {/* Refine input */}
          {writerState === "refining" && (
            <div
              className="p-3 rounded-[var(--radius)] mt-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="eyebrow">Refine prompt</span>
                <Badge tone="violet">this section only</Badge>
              </div>
              <textarea
                className="textarea"
                rows={2}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Describe what to change..."
                autoFocus
              />
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="primary"
                  size="sm"
                  leading={<Sparkles size={11} />}
                  onClick={() => {
                    setWriterState("streaming");
                    setFeedback("");
                  }}
                  disabled={!feedback.trim()}
                >
                  Apply refinement
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setWriterState("paused")}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Footer toolbar */}
          <div
            className="flex items-center gap-2 mt-4 pt-3 flex-wrap"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <Badge mono={false} tone="cyan">
              <Zap size={11} /> gpt-4o
            </Badge>
            <span className="font-mono text-[11px] muted tabular-nums">{wordCount} words</span>
            <span style={{ flex: 1 }} />
            {writerState === "streaming" && (
              <Button variant="ghost" size="sm" leading={<Pause size={11} />} onClick={pauseGeneration}>
                Pause
              </Button>
            )}
            {writerState === "paused" && (
              <Button variant="ghost" size="sm" leading={<Play size={11} />} onClick={resumeGeneration}>
                Resume
              </Button>
            )}
            {writerState !== "refining" && writerState !== "idle" && (
              <Button
                variant="ghost"
                size="sm"
                leading={<Pencil size={11} />}
                onClick={() => setWriterState("refining")}
              >
                Refine
              </Button>
            )}
            {(writerState === "done" || sectionContent) && writerState !== "streaming" && (
              <Button size="sm" trailing={<ArrowRight size={11} />} onClick={acceptAndNext}>
                Accept & next
              </Button>
            )}
          </div>
        </div>

        {/* ── Meta pane ───────────────────────────────────────── */}
        <div className="flex flex-col gap-3" style={{ position: "sticky", top: 68 }}>
          {/* Target queries */}
          <div className="card card-pad">
            <div className="eyebrow mb-2">Target queries</div>
            {currentSection?.metadata &&
            Array.isArray((currentSection.metadata as Record<string, unknown>).targetQueries) ? (
              <div className="flex flex-col gap-2">
                {((currentSection.metadata as Record<string, unknown>).targetQueries as Array<{ query: string; volume: number }>).map(
                  (q, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 truncate">{q.query}</span>
                      <span className="font-mono muted tabular-nums">
                        {q.volume?.toLocaleString()}
                      </span>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="text-xs muted">No queries mapped</div>
            )}
          </div>

          {/* Rule codes */}
          <div className="card card-pad">
            <div className="eyebrow mb-2">Rule codes</div>
            {currentSection?.metadata &&
            Array.isArray((currentSection.metadata as Record<string, unknown>).ruleCodes) ? (
              <div className="flex gap-1.5 flex-wrap">
                {((currentSection.metadata as Record<string, unknown>).ruleCodes as string[]).map((c) => (
                  <Badge key={c} tone="cyan">
                    {c}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-xs muted">No rules assigned</div>
            )}
          </div>

          {/* Structure instructions */}
          <div className="card card-pad">
            <div className="eyebrow mb-2">Structure instructions</div>
            <div className="text-xs" style={{ color: "var(--text-2)", lineHeight: 1.55 }}>
              {(currentSection?.metadata as Record<string, unknown>)?.structureInstructions
                ? String((currentSection.metadata as Record<string, unknown>).structureInstructions)
                : "No structure instructions"}
            </div>
          </div>

          {/* Section navigation */}
          <div className="card card-pad">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                leading={<ArrowLeft size={11} />}
                disabled={selectedIdx === 0}
                onClick={() => {
                  setSelectedIdx(selectedIdx - 1);
                  setStreamContent("");
                  setWriterState("idle");
                }}
              >
                Prev
              </Button>
              <span className="font-mono text-[11px] muted">
                {selectedIdx + 1} / {activeSession.sections.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                trailing={<ArrowRight size={11} />}
                disabled={selectedIdx === activeSession.sections.length - 1}
                onClick={() => {
                  setSelectedIdx(selectedIdx + 1);
                  setStreamContent("");
                  setWriterState("idle");
                }}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── New session sub-view ────────────────────────────────────────
function NewSessionView({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: (brief: ContentBrief) => void;
}) {
  const [inputMode, setInputMode] = useState<"form" | "import">("form");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(brief: ContentBrief) {
    setCreating(true);
    setError(null);
    try {
      await onSubmit(brief);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setCreating(false);
    }
  }

  // Inline quick form state
  const [formTopic, setFormTopic] = useState("");
  const [formKeyword, setFormKeyword] = useState("");
  const [importText, setImportText] = useState("");

  function handleQuickForm() {
    if (!formTopic.trim()) return;
    const brief: ContentBrief = {
      pageType: "blog",
      niche: formKeyword.trim() || formTopic.trim(),
      topic: formTopic.trim(),
      headings: [{ text: formTopic.trim(), level: 1, intent: "informational" }],
      source: "form",
    };
    handleSubmit(brief);
  }

  function handleImport() {
    if (!importText.trim()) return;
    const lines = importText.split("\n").map((l) => l.trim()).filter(Boolean);
    const headings: ContentBrief["headings"] = lines.map((line) => {
      const match = line.match(/^(#{1,6})\s+(.+)/);
      if (match) return { text: match[2], level: Math.min(match[1].length, 4) as 1|2|3|4, intent: "informational" };
      return { text: line.replace(/^\d+\.\s*/, ""), level: 2 as const, intent: "informational" };
    });
    const brief: ContentBrief = {
      pageType: "blog",
      niche: headings[0]?.text || "",
      topic: headings[0]?.text || "Imported content",
      headings,
      source: "import",
    };
    handleSubmit(brief);
  }

  return (
    <div>
      <div className="page-head">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            Writer
          </Button>
          <div>
            <h1 className="h1">New Content</h1>
            <p className="text-sm muted mt-1">
              Create a content session from a quick form or import an outline.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => setInputMode("form")}
          className="px-3 py-1.5 rounded-[var(--radius)] text-[12px] font-medium transition-colors cursor-pointer"
          style={{
            background: inputMode === "form" ? "var(--accent-soft)" : "transparent",
            color: inputMode === "form" ? "var(--accent)" : "var(--text-2)",
          }}
        >
          Quick Form
        </button>
        <button
          onClick={() => setInputMode("import")}
          className="px-3 py-1.5 rounded-[var(--radius)] text-[12px] font-medium transition-colors cursor-pointer"
          style={{
            background: inputMode === "import" ? "var(--accent-soft)" : "transparent",
            color: inputMode === "import" ? "var(--accent)" : "var(--text-2)",
          }}
        >
          Import Brief
        </button>
      </div>

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-[var(--radius)] text-sm"
          style={{
            background: "var(--coral-soft)",
            border: "1px solid var(--coral)",
            color: "var(--coral)",
          }}
        >
          {error}
        </div>
      )}

      {inputMode === "form" ? (
        <div className="card card-pad space-y-4" style={{ maxWidth: 480 }}>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-2)" }}>Topic</label>
            <input
              value={formTopic}
              onChange={(e) => setFormTopic(e.target.value)}
              placeholder="e.g. Moving company in Bristol"
              className="w-full px-3 py-2 rounded-[var(--radius)] text-sm"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-1)", outline: "none" }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-2)" }}>Target keyword (optional)</label>
            <input
              value={formKeyword}
              onChange={(e) => setFormKeyword(e.target.value)}
              placeholder="e.g. moving company bristol"
              className="w-full px-3 py-2 rounded-[var(--radius)] text-sm"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-1)", outline: "none" }}
            />
          </div>
          <Button onClick={handleQuickForm} disabled={!formTopic.trim() || creating}>
            {creating ? "Creating..." : "Create session"}
          </Button>
        </div>
      ) : (
        <div className="card card-pad space-y-4" style={{ maxWidth: 580 }}>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-2)" }}>
              Paste outline (markdown headings or numbered list)
            </label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"# Main Topic\n## First Section\n## Second Section\n### Subsection"}
              rows={8}
              className="w-full px-3 py-2 rounded-[var(--radius)] text-sm font-mono resize-y"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-1)", outline: "none" }}
            />
          </div>
          <Button onClick={handleImport} disabled={!importText.trim() || creating}>
            {creating ? "Creating..." : "Import & create session"}
          </Button>
        </div>
      )}
    </div>
  );
}

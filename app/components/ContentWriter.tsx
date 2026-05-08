"use client";

import { useState, useEffect, useCallback } from "react";
import { HeadingList } from "./HeadingList";
import { SectionEditor } from "./SectionEditor";
import { BriefForm } from "./BriefForm";
import { BriefImport } from "./BriefImport";
import type { ContentBrief, ContentSessionData, ContentSectionData } from "../lib/types";

type InputMode = "form" | "import";

interface SessionListItem {
  id: string;
  title: string;
  niche: string;
  pageType: string;
  status: string;
  updatedAt: string;
  sections: { id: string; status: string; headingLevel: number; headingText: string }[];
}

export function ContentWriter() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [activeSession, setActiveSession] = useState<ContentSessionData | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>("form");
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/content/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  async function loadSession(id: string) {
    try {
      const res = await fetch(`/api/content/sessions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data);
        setActiveIndex(0);
        setShowNew(false);
      }
    } catch { /* ignore */ }
  }

  async function createSession(brief: ContentBrief) {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/content/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      if (res.ok) {
        const session = await res.json();
        setActiveSession(session);
        setActiveIndex(0);
        setShowNew(false);
        loadSessions();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Failed to create session (${res.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — could not reach server");
    }
    finally { setCreating(false); }
  }

  function handleContentUpdate(sectionId: string, content: string, status: string) {
    if (!activeSession) return;
    setActiveSession({
      ...activeSession,
      sections: activeSession.sections.map((s) =>
        s.id === sectionId ? { ...s, content, status } : s
      ),
    });
  }

  async function handleExport() {
    if (!activeSession) return;
    window.open(`/api/content/export/${activeSession.id}`, "_blank");
  }

  async function handleDelete(id: string) {
    await fetch(`/api/content/sessions/${id}`, { method: "DELETE" });
    if (activeSession?.id === id) setActiveSession(null);
    loadSessions();
  }

  // Session list view
  if (!activeSession && !showNew) {
    const completedCount = (s: SessionListItem) => s.sections.filter((sec) => sec.status !== "pending").length;

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-zinc-100">Content Writer</h1>
          <button
            onClick={() => setShowNew(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            + New Content
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center text-zinc-500 mt-20">
            <p className="text-lg mb-2">No content sessions yet</p>
            <p className="text-sm">Create your first piece of content to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-4 py-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <button onClick={() => loadSession(s.id)} className="flex-1 text-left">
                  <div className="text-sm text-zinc-100">{s.title}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {s.niche} / {s.pageType} — {completedCount(s)}/{s.sections.length} sections — {s.status}
                  </div>
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-xs text-zinc-500 hover:text-red-400 ml-4"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // New session creation view
  if (showNew && !activeSession) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setShowNew(false)} className="text-zinc-400 hover:text-zinc-200 text-sm">
            Back
          </button>
          <h1 className="text-xl font-bold text-zinc-100">New Content</h1>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setInputMode("form")}
            className={`px-3 py-1 rounded text-sm ${inputMode === "form" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
          >
            Quick Form
          </button>
          <button
            onClick={() => setInputMode("import")}
            className={`px-3 py-1 rounded text-sm ${inputMode === "import" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
          >
            Import Brief
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        {inputMode === "form" ? (
          <BriefForm onSubmit={createSession} loading={creating} />
        ) : (
          <BriefImport onSubmit={createSession} loading={creating} />
        )}
      </div>
    );
  }

  // Active session — content writing view
  if (!activeSession) return null;

  const currentSection = activeSession.sections[activeIndex];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveSession(null)} className="text-zinc-400 hover:text-zinc-200 text-sm">
            Back
          </button>
          <h1 className="text-lg font-bold text-zinc-100 truncate">{activeSession.title}</h1>
          <span className="text-xs text-zinc-500">{activeSession.niche} / {activeSession.pageType}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs rounded transition-colors"
          >
            Export MD
          </button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left: heading list */}
        <div className="w-64 flex-shrink-0 overflow-y-auto bg-zinc-900/50 rounded-lg p-2">
          <HeadingList
            sections={activeSession.sections}
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
          />
        </div>

        {/* Right: section editor */}
        <div className="flex-1 overflow-hidden">
          {currentSection && (
            <SectionEditor
              key={currentSection.id}
              section={currentSection}
              sessionId={activeSession.id}
              onContentUpdate={handleContentUpdate}
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-3 pt-3 border-t border-zinc-800">
        <button
          onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
          disabled={activeIndex === 0}
          className="px-3 py-1 text-sm text-zinc-400 hover:text-zinc-200 disabled:text-zinc-600"
        >
          Previous
        </button>
        <span className="text-xs text-zinc-500">
          {activeIndex + 1} / {activeSession.sections.length}
        </span>
        <button
          onClick={() => setActiveIndex(Math.min(activeSession.sections.length - 1, activeIndex + 1))}
          disabled={activeIndex === activeSession.sections.length - 1}
          className="px-3 py-1 text-sm text-zinc-400 hover:text-zinc-200 disabled:text-zinc-600"
        >
          Next Section
        </button>
      </div>
    </div>
  );
}

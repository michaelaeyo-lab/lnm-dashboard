"use client";

import { useState } from "react";
import type { ContentSectionData } from "../lib/types";

export function SectionEditor({
  section,
  sessionId,
  onContentUpdate,
}: {
  section: ContentSectionData;
  sessionId: string;
  onContentUpdate: (sectionId: string, content: string, status: string) => void;
}) {
  const [streaming, setStreaming] = useState(false);
  const [displayContent, setDisplayContent] = useState(section.content || "");
  const [feedback, setFeedback] = useState("");
  const [showRefine, setShowRefine] = useState(false);

  // Sync when section changes
  if (!streaming && section.content !== null && section.content !== displayContent) {
    setDisplayContent(section.content);
  }

  async function handleStream(url: string, body: object) {
    setStreaming(true);
    setDisplayContent("");

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setDisplayContent(`Error: ${err.error || "Request failed"}`);
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) { setStreaming(false); return; }

      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              accumulated += parsed.content;
              setDisplayContent(accumulated);
            }
            if (parsed.done && parsed.fullContent) {
              onContentUpdate(section.id, parsed.fullContent, url.includes("refine") ? "refined" : "completed");
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setDisplayContent("Error: Network request failed");
    } finally {
      setStreaming(false);
    }
  }

  function handleGenerate() {
    handleStream("/api/content/generate", { sessionId, sectionId: section.id });
  }

  function handleRefine() {
    if (!feedback.trim()) return;
    handleStream("/api/content/refine", { sessionId, sectionId: section.id, feedback: feedback.trim() });
    setFeedback("");
    setShowRefine(false);
  }

  const prefix = "#".repeat(section.headingLevel);
  const hasContent = section.status !== "pending" && displayContent;

  return (
    <div className="flex flex-col h-full">
      {/* Heading */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-100">
          {prefix} {section.headingText}
        </h2>
        {section.intent && (
          <p className="text-xs text-zinc-500 mt-1">Intent: {section.intent}</p>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto mb-4 bg-zinc-800/50 rounded-lg p-4">
        {streaming && !displayContent && (
          <span className="text-zinc-500 animate-pulse">Generating...</span>
        )}
        {displayContent ? (
          <div className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
            {displayContent}
          </div>
        ) : !streaming ? (
          <div className="text-center text-zinc-500 mt-12">
            <p>No content yet. Click Generate to start.</p>
          </div>
        ) : null}
      </div>

      {/* Refinement input */}
      {showRefine && (
        <div className="mb-3">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Describe what to change (e.g., 'Add more statistics', 'Remove fluff', 'Add local entities for Miami')..."
            rows={3}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {!hasContent ? (
          <button
            onClick={handleGenerate}
            disabled={streaming}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white text-sm rounded-lg transition-colors"
          >
            {streaming ? "Generating..." : "Generate"}
          </button>
        ) : (
          <>
            <button
              onClick={handleGenerate}
              disabled={streaming}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 text-zinc-200 text-sm rounded-lg transition-colors"
            >
              {streaming ? "Generating..." : "Regenerate"}
            </button>
            <button
              onClick={() => setShowRefine(!showRefine)}
              disabled={streaming}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-700 text-white text-sm rounded-lg transition-colors"
            >
              Refine
            </button>
            {showRefine && feedback.trim() && (
              <button
                onClick={handleRefine}
                disabled={streaming}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
              >
                Apply Refinement
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

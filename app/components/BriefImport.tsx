"use client";

import { useState } from "react";
import type { ContentBrief, BriefHeading } from "../lib/types";

/**
 * Parse pasted text/markdown into headings.
 * Supports: markdown headings (# / ## / ###), numbered lists, plain text with line breaks.
 */
function parseBriefText(text: string): BriefHeading[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const headings: BriefHeading[] = [];

  for (const line of lines) {
    // Markdown headings: # H1, ## H2, ### H3, #### H4
    const mdMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (mdMatch) {
      headings.push({
        level: mdMatch[1].length as 1 | 2 | 3 | 4,
        text: mdMatch[2].trim(),
      });
      continue;
    }

    // Numbered: 1. Heading, 2. Heading
    const numMatch = line.match(/^\d+[.)]\s+(.+)/);
    if (numMatch) {
      headings.push({ level: 2, text: numMatch[1].trim() });
      continue;
    }

    // Tabbed or indented lines become H3
    if (line.startsWith("\t") || line.startsWith("  ")) {
      headings.push({ level: 3, text: line.trim() });
      continue;
    }

    // Plain line — treat first as H1, rest as H2
    headings.push({
      level: headings.length === 0 ? 1 : 2,
      text: line,
    });
  }

  return headings;
}

export function BriefImport({
  onSubmit,
  loading,
}: {
  onSubmit: (brief: ContentBrief) => void;
  loading: boolean;
}) {
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<BriefHeading[] | null>(null);
  const [niche, setNiche] = useState("general");
  const [pageType, setPageType] = useState("service");
  const [topic, setTopic] = useState("");
  const [location, setLocation] = useState("");

  function handleParse() {
    const headings = parseBriefText(rawText);
    setParsed(headings);
    // Auto-fill topic from first heading if empty
    if (!topic && headings.length > 0) {
      setTopic(headings[0].text);
    }
  }

  function handleSubmit() {
    if (!parsed || parsed.length === 0 || !topic.trim()) return;
    const brief: ContentBrief = {
      pageType: pageType as ContentBrief["pageType"],
      niche,
      topic: topic.trim(),
      headings: parsed,
      source: "import",
    };
    if (location.trim()) brief.location = location.trim();
    onSubmit(brief);
  }

  const inputCls = "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500";

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <label className="block text-xs text-zinc-400 mb-1">
          Paste your heading outline (one heading per line)
        </label>
        <p className="text-xs text-zinc-600 mb-2">
          Accepts: markdown headings (# / ##), numbered lists (1. / 2.), or plain text lines.
          Each line becomes a section to generate content for.
        </p>
        <textarea
          value={rawText}
          onChange={(e) => { setRawText(e.target.value); setParsed(null); }}
          placeholder={"# 15 Proven Tips for Managing Moving Anxiety and Stress\n## Why Moving Causes So Much Stress\n## Planning and Organization Strategies\n## Decluttering Before the Move\n## Maintaining a Healthy Lifestyle During Relocation\n## The Role of Social Support\n## Relaxation Techniques That Work\n## When to Seek Professional Help"}
          rows={8}
          className={`${inputCls} resize-y font-mono`}
        />
      </div>

      {!parsed && rawText.trim() && (
        <div>
          {/* Warning if text looks like a paragraph instead of headings */}
          {rawText.trim().split("\n").filter(Boolean).length <= 2 && rawText.trim().length > 200 && (
            <p className="text-xs text-yellow-400 mb-2">
              This looks like body text, not a heading outline. Import Brief expects one heading per line
              (e.g., &quot;## Why Moving Causes Stress&quot;). Use Quick Form if you want to type headings manually.
            </p>
          )}
          <button
            onClick={handleParse}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-lg transition-colors"
          >
            Parse Headings
          </button>
        </div>
      )}

      {parsed && (
        <>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            {parsed.some((h) => h.text.length > 100) && (
              <p className="text-xs text-yellow-400 mb-2">
                Some headings look very long — you may have pasted body text instead of a heading outline.
                Go back and paste one heading per line (e.g., &quot;## Section Title&quot;).
              </p>
            )}
            <p className="text-xs text-zinc-400 mb-2">Parsed {parsed.length} heading{parsed.length !== 1 ? "s" : ""}:</p>
            <div className="space-y-1">
              {parsed.map((h, i) => (
                <div key={i} className="text-sm text-zinc-300" style={{ paddingLeft: `${(h.level - 1) * 16}px` }}>
                  <span className="text-zinc-500 text-xs mr-2">H{h.level}</span>
                  {h.text}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Page Type</label>
              <select value={pageType} onChange={(e) => setPageType(e.target.value)} className={inputCls}>
                <option value="service">Service Page</option>
                <option value="location">Location Page</option>
                <option value="blog">Blog Post</option>
                <option value="landing">Landing Page</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Niche</label>
              <select value={niche} onChange={(e) => setNiche(e.target.value)} className={inputCls}>
                <option value="general">General</option>
                <option value="legal">Legal Services</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Topic *</label>
              <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Location (optional)</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !topic.trim() || parsed.length === 0}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white text-sm rounded-lg transition-colors"
          >
            {loading ? "Creating..." : "Create Content Session"}
          </button>
        </>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { QueryEntry } from "../lib/types";

/**
 * Parse CSV text into QueryEntry[].
 * Accepts: "keyword,volume,intent" per line (header row optional).
 * Also handles tab-separated and semicolon-separated.
 */
function parseCSV(text: string): QueryEntry[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  // Detect separator
  const sep = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";

  // Skip header if first line looks non-numeric
  const firstCells = lines[0].split(sep).map((c) => c.trim());
  const hasHeader =
    firstCells.length >= 2 &&
    isNaN(Number(firstCells[1])) &&
    /keyword|query|term/i.test(firstCells[0]);

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const entries: QueryEntry[] = [];

  for (const line of dataLines) {
    const cells = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cells.length < 1 || !cells[0]) continue;

    entries.push({
      query: cells[0],
      volume: cells.length > 1 ? Math.max(0, parseInt(cells[1], 10) || 0) : 0,
      intent: cells.length > 2 && cells[2] ? cells[2].toLowerCase() : "informational",
    });
  }

  return entries;
}

export function KeywordUpload({
  onKeywords,
}: {
  onKeywords: (keywords: QueryEntry[]) => void;
}) {
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<QueryEntry[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleParse(text: string) {
    const entries = parseCSV(text);
    setParsed(entries);
    if (entries.length > 0) onKeywords(entries);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setRawText(text);
      handleParse(text);
    };
    reader.readAsText(file);
  }

  function handleClear() {
    setRawText("");
    setParsed(null);
    setFileName(null);
    onKeywords([]);
  }

  const inputCls =
    "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="block text-xs text-zinc-400">Manual Keywords (CSV)</label>
        {parsed && parsed.length > 0 && (
          <button onClick={handleClear} className="text-xs text-zinc-500 hover:text-red-400">
            Clear
          </button>
        )}
      </div>

      {/* File upload */}
      <div className="flex gap-2 items-center">
        <label className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs rounded-lg cursor-pointer transition-colors">
          Upload CSV
          <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
        </label>
        {fileName && <span className="text-xs text-zinc-500">{fileName}</span>}
        <span className="text-xs text-zinc-600">or paste below</span>
      </div>

      {/* Text input */}
      <textarea
        value={rawText}
        onChange={(e) => {
          setRawText(e.target.value);
          setParsed(null);
        }}
        placeholder={"keyword, volume, intent\nmoving company bristol, 2400, commercial\nhow to move house, 1900, informational"}
        rows={4}
        className={`${inputCls} resize-y font-mono text-xs`}
      />

      {!parsed && rawText.trim() && (
        <button
          onClick={() => handleParse(rawText)}
          className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs rounded-lg transition-colors"
        >
          Parse Keywords
        </button>
      )}

      {parsed && parsed.length > 0 && (
        <div className="bg-zinc-800/50 rounded-lg p-3 max-h-40 overflow-y-auto">
          <p className="text-xs text-zinc-400 mb-2">
            {parsed.length} keyword{parsed.length !== 1 ? "s" : ""} loaded
          </p>
          <div className="space-y-1">
            {parsed.slice(0, 20).map((k, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-zinc-300 flex-1 truncate">{k.query}</span>
                <span className="text-zinc-500 w-16 text-right">{k.volume.toLocaleString()}/mo</span>
                <span className="text-zinc-600 w-20">{k.intent}</span>
              </div>
            ))}
            {parsed.length > 20 && (
              <p className="text-xs text-zinc-600 mt-1">...and {parsed.length - 20} more</p>
            )}
          </div>
        </div>
      )}

      {parsed && parsed.length === 0 && rawText.trim() && (
        <p className="text-xs text-yellow-400">
          No keywords found. Format: one keyword per line — &quot;keyword, volume, intent&quot;
        </p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

interface ChunkResult {
  id: string;
  category: string;
  title: string;
  content: string;
  sourceType: string | null;
  contentType: string | null;
  tokenCount: number | null;
  combinedScore: number;
}

const AGENT_POOLS = [
  { value: "", label: "All Categories" },
  { value: "01-semantic-seo", label: "Semantic SEO" },
  { value: "02-topical-authority", label: "Topical Authority" },
  { value: "03-content-strategy", label: "Content Strategy" },
  { value: "04-technical-seo", label: "Technical SEO" },
  { value: "05-on-page-seo", label: "On-Page SEO" },
  { value: "06-page-speed-and-performance", label: "Page Speed" },
  { value: "07-local-seo", label: "Local SEO" },
  { value: "08-off-page-and-link-building", label: "Off-Page & Links" },
  { value: "09-algorithm-updates-and-ranking", label: "Algorithm Updates" },
  { value: "10-user-experience", label: "User Experience" },
  { value: "11-ai-and-automation", label: "AI & Automation" },
  { value: "12-marketing-and-growth", label: "Marketing & Growth" },
  { value: "13-case-studies", label: "Case Studies" },
  { value: "14-gpt-prompts-and-tools", label: "GPT Prompts & Tools" },
  { value: "15-schema-and-structured-data", label: "Schema & Structured Data" },
  { value: "16-web-security", label: "Web Security" },
  { value: "17-strategy-blueprints", label: "Strategy Blueprints" },
];

export function KnowledgeBrowser() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [topK, setTopK] = useState(10);
  const [results, setResults] = useState<ChunkResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const params = new URLSearchParams({ q: query, topK: String(topK) });
      if (category) params.set("categories", category);

      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the knowledge base..."
            className="flex-1 px-3 py-2 rounded"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-1)",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2 rounded transition-colors disabled:opacity-50"
            style={{
              background: loading || !query.trim() ? "var(--surface)" : "var(--accent)",
              color: loading || !query.trim() ? "var(--text-3)" : "white",
            }}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        <div className="flex gap-3 items-center">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-1.5 rounded text-sm"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-2)",
            }}
          >
            {AGENT_POOLS.map((pool) => (
              <option key={pool.value} value={pool.value}>
                {pool.label}
              </option>
            ))}
          </select>

          <label className="text-sm flex items-center gap-1" style={{ color: "var(--text-3)" }}>
            Top
            <input
              type="number"
              min={1}
              max={50}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-14 px-2 py-1 rounded text-sm"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-2)",
              }}
            />
          </label>
        </div>
      </form>

      {searched && (
        <div className="text-sm" style={{ color: "var(--text-3)" }}>
          {results.length} result{results.length !== 1 ? "s" : ""}
        </div>
      )}

      <div className="space-y-4">
        {results.map((chunk) => (
          <div
            key={chunk.id}
            className="rounded-lg p-4 space-y-2"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-sm" style={{ color: "var(--text-1)" }}>
                {chunk.title}
              </h3>
              <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-3)" }}>
                {(chunk.combinedScore * 100).toFixed(1)}%
              </span>
            </div>

            <p className="text-sm line-clamp-4 whitespace-pre-wrap" style={{ color: "var(--text-2)" }}>
              {chunk.content.slice(0, 500)}
              {chunk.content.length > 500 ? "..." : ""}
            </p>

            <div className="flex gap-2 flex-wrap">
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: "var(--bg-elev)", color: "var(--text-2)" }}
              >
                {chunk.category}
              </span>
              {chunk.sourceType && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ background: "var(--bg-elev)", color: "var(--text-2)" }}
                >
                  {chunk.sourceType}
                </span>
              )}
              {chunk.contentType && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ background: "var(--bg-elev)", color: "var(--text-2)" }}
                >
                  {chunk.contentType}
                </span>
              )}
              {chunk.tokenCount && (
                <span className="text-xs" style={{ color: "var(--text-3)" }}>
                  {chunk.tokenCount} tokens
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

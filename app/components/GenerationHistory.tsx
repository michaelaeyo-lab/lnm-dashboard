"use client";

import { useState, useEffect, useCallback } from "react";
import type { GenerationData } from "../lib/types";

const AGENT_TYPES = [
  { value: "", label: "All Types" },
  { value: "all", label: "All Knowledge" },
  { value: "content", label: "Content" },
  { value: "technical", label: "Technical" },
  { value: "local-seo", label: "Local SEO" },
  { value: "on-page", label: "On-Page" },
  { value: "off-page", label: "Off-Page" },
  { value: "strategy", label: "Strategy" },
];

export function GenerationHistory() {
  const [generations, setGenerations] = useState<GenerationData[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [agentType, setAgentType] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (agentType) params.set("agentType", agentType);

      const res = await fetch(`/api/generations?${params}`);
      const data = await res.json();
      setGenerations(data.generations || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      setGenerations([]);
    } finally {
      setLoading(false);
    }
  }, [page, agentType]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={agentType}
          onChange={(e) => {
            setAgentType(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 text-sm"
        >
          {AGENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-zinc-500">{total} generations</span>
      </div>

      {loading ? (
        <div className="text-zinc-500 text-sm animate-pulse">Loading...</div>
      ) : generations.length === 0 ? (
        <div className="text-zinc-500 text-sm">
          No generations yet. Start a chat to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {generations.map((gen) => (
            <div
              key={gen.id}
              className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedId(expandedId === gen.id ? null : gen.id)
                }
                className="w-full px-4 py-3 text-left flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-200 truncate">
                    {gen.inputPrompt}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">
                      {gen.agentType}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(gen.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 text-zinc-500 transition-transform ${
                    expandedId === gen.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {expandedId === gen.id && (
                <div className="px-4 pb-4 border-t border-zinc-700/50">
                  <div className="mt-3 text-sm text-zinc-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {gen.output}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm bg-zinc-800 rounded disabled:opacity-50 text-zinc-300"
          >
            Prev
          </button>
          <span className="text-sm text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm bg-zinc-800 rounded disabled:opacity-50 text-zinc-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

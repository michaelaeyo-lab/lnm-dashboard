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
          className="px-3 py-1.5 rounded text-sm"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-2)",
          }}
        >
          {AGENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <span className="text-sm" style={{ color: "var(--text-3)" }}>{total} generations</span>
      </div>

      {loading ? (
        <div className="text-sm animate-pulse" style={{ color: "var(--text-3)" }}>Loading...</div>
      ) : generations.length === 0 ? (
        <div className="text-sm" style={{ color: "var(--text-3)" }}>
          No generations yet. Start a chat to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {generations.map((gen) => (
            <div
              key={gen.id}
              className="rounded-lg overflow-hidden"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <button
                onClick={() =>
                  setExpandedId(expandedId === gen.id ? null : gen.id)
                }
                className="w-full px-4 py-3 text-left flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" style={{ color: "var(--text-1)" }}>
                    {gen.inputPrompt}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ background: "var(--bg-elev)", color: "var(--text-2)" }}
                    >
                      {gen.agentType}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-3)" }}>
                      {new Date(gen.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform ${
                    expandedId === gen.id ? "rotate-180" : ""
                  }`}
                  style={{ color: "var(--text-3)" }}
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
                <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--border)" }}>
                  <div
                    className="mt-3 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto"
                    style={{ color: "var(--text-2)" }}
                  >
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
            className="px-3 py-1 text-sm rounded disabled:opacity-50"
            style={{ background: "var(--surface)", color: "var(--text-2)" }}
          >
            Prev
          </button>
          <span className="text-sm" style={{ color: "var(--text-3)" }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm rounded disabled:opacity-50"
            style={{ background: "var(--surface)", color: "var(--text-2)" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BriefGenerator } from "../../components/BriefGenerator";

interface BriefListItem {
  id: string;
  topic: string;
  pageType: string;
  niche: string;
  location: string | null;
  status: string;
  version: number;
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-zinc-700 text-zinc-300",
  reviewing: "bg-yellow-900/50 text-yellow-300 border border-yellow-800",
  approved: "bg-green-900/50 text-green-300 border border-green-800",
};

export default function BriefsPage() {
  const router = useRouter();
  const [briefs, setBriefs] = useState<BriefListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const loadBriefs = useCallback(async () => {
    try {
      const res = await fetch("/api/briefs");
      if (res.ok) {
        const data = await res.json();
        setBriefs(data.briefs || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBriefs(); }, [loadBriefs]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this brief?")) return;
    await fetch(`/api/briefs/${id}`, { method: "DELETE" });
    setBriefs((prev) => prev.filter((b) => b.id !== id));
  }

  if (showNew) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setShowNew(false)} className="text-zinc-400 hover:text-zinc-200 text-sm">
            ← Back
          </button>
          <h1 className="text-xl font-bold text-zinc-100">New Brief</h1>
        </div>
        <BriefGenerator />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Content Briefs</h1>
          <p className="text-xs text-zinc-500 mt-1">
            AI-generated briefs with heading hierarchy, keyword mapping, and semantic rules
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
        >
          + New Brief
        </button>
      </div>

      {loading ? (
        <div className="text-center text-zinc-500 mt-20">Loading...</div>
      ) : briefs.length === 0 ? (
        <div className="text-center text-zinc-500 mt-20">
          <p className="text-lg mb-2">No briefs yet</p>
          <p className="text-sm">Generate your first content brief to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {briefs.map((b) => (
            <div
              key={b.id}
              onClick={() => router.push(`/briefs/${b.id}`)}
              className="flex items-center justify-between px-4 py-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-100 truncate">{b.topic}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${statusColors[b.status] || statusColors.draft}`}>
                    {b.status}
                  </span>
                  {b.sessionId && (
                    <span className="text-[10px] text-blue-400">has writer session</span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {b.niche} / {b.pageType}
                  {b.location && ` / ${b.location}`}
                  {" — "}v{b.version}
                  {" — "}
                  {new Date(b.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(b.id, e)}
                className="text-xs text-zinc-500 hover:text-red-400 ml-4 flex-shrink-0"
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

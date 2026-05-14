"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { BriefEditor } from "../../../components/BriefEditor";
import type { BriefData } from "../../../lib/types";

export default function BriefDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/briefs/${id}`);
        if (res.ok) {
          const data = await res.json();
          setBrief(data);
        } else if (res.status === 404) {
          setError("Brief not found");
        } else {
          setError("Failed to load brief");
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return <div className="text-center text-zinc-500 mt-20">Loading brief...</div>;
  }

  if (error || !brief) {
    return (
      <div className="text-center mt-20">
        <p className="text-zinc-400 mb-2">{error || "Brief not found"}</p>
        <a href="/briefs" className="text-sm text-blue-400 hover:text-blue-300">
          ← Back to briefs
        </a>
      </div>
    );
  }

  return <BriefEditor brief={brief} />;
}

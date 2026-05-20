"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BriefEditor } from "../../../components/BriefEditor";
import { Button } from "../../../components/ui/button";
import { Empty } from "../../../components/ui/empty";
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
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm muted pulse">Loading brief...</div>
      </div>
    );
  }

  if (error || !brief) {
    return (
      <Empty icon="alert" title={error || "Brief not found"} sub="The brief may have been deleted.">
        <Button variant="ghost" size="sm" asChild>
          <a href="/briefs">
            <ArrowLeft size={13} />
            Back to briefs
          </a>
        </Button>
      </Empty>
    );
  }

  return <BriefEditor brief={brief} />;
}

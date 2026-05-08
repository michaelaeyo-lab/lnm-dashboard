"use client";

import { useState, useEffect } from "react";
import type { ContentBrief, BriefHeading } from "../lib/types";

interface NicheInfo {
  name: string;
  label: string;
  description: string;
  pageTypes: string[];
}

const PAGE_TYPES = [
  { value: "service", label: "Service Page" },
  { value: "location", label: "Location Page" },
  { value: "blog", label: "Blog Post" },
  { value: "landing", label: "Landing Page" },
];

export function BriefForm({
  onSubmit,
  loading,
}: {
  onSubmit: (brief: ContentBrief) => void;
  loading: boolean;
}) {
  const [niches, setNiches] = useState<NicheInfo[]>([]);
  const [pageType, setPageType] = useState<string>("service");
  const [niche, setNiche] = useState("general");
  const [topic, setTopic] = useState("");
  const [location, setLocation] = useState("");
  const [clientName, setClientName] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [instructions, setInstructions] = useState("");
  const [headings, setHeadings] = useState<BriefHeading[]>([
    { level: 1, text: "" },
  ]);

  useEffect(() => {
    fetch("/api/content/niches")
      .then((r) => r.json())
      .then((data) => setNiches(data))
      .catch(() => {});
  }, []);

  function addHeading() {
    setHeadings([...headings, { level: 2, text: "" }]);
  }

  function removeHeading(i: number) {
    if (headings.length <= 1) return;
    setHeadings(headings.filter((_, idx) => idx !== i));
  }

  function updateHeading(i: number, field: keyof BriefHeading, value: unknown) {
    const updated = [...headings];
    updated[i] = { ...updated[i], [field]: value };
    setHeadings(updated);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || headings.some((h) => !h.text.trim())) return;

    const brief: ContentBrief = {
      pageType: pageType as ContentBrief["pageType"],
      niche,
      topic: topic.trim(),
      headings: headings.map((h) => ({ ...h, text: h.text.trim() })),
      source: "form",
    };
    if (location.trim()) brief.location = location.trim();
    if (clientName.trim()) brief.clientName = clientName.trim();
    if (targetAudience.trim()) brief.targetAudience = targetAudience.trim();
    if (instructions.trim()) brief.additionalInstructions = instructions.trim();

    onSubmit(brief);
  }

  const inputCls = "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500";
  const labelCls = "block text-xs text-zinc-400 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Page Type</label>
          <select value={pageType} onChange={(e) => setPageType(e.target.value)} className={inputCls}>
            {PAGE_TYPES.map((pt) => (
              <option key={pt.value} value={pt.value}>{pt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Niche</label>
          <select value={niche} onChange={(e) => setNiche(e.target.value)} className={inputCls}>
            {niches.map((n) => (
              <option key={n.name} value={n.name}>{n.label}</option>
            ))}
            {niches.length === 0 && <option value="general">General</option>}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Topic / Main Keyword *</label>
        <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Car Accident Lawyer, Plumbing Services" className={inputCls} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Location (optional)</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Titusville, FL" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Client / Brand (optional)</label>
          <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g., Smith & Associates" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Target Audience (optional)</label>
        <input type="text" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="e.g., Injured drivers seeking legal help" className={inputCls} />
      </div>

      {/* Heading builder */}
      <div>
        <label className={labelCls}>Headings *</label>
        <div className="space-y-2">
          {headings.map((h, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select
                value={h.level}
                onChange={(e) => updateHeading(i, "level", parseInt(e.target.value))}
                className="w-20 px-2 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
              >
                <option value={1}>H1</option>
                <option value={2}>H2</option>
                <option value={3}>H3</option>
                <option value={4}>H4</option>
              </select>
              <input
                type="text"
                value={h.text}
                onChange={(e) => updateHeading(i, "text", e.target.value)}
                placeholder={i === 0 ? "Main heading (H1)..." : "Section heading..."}
                className={`flex-1 ${inputCls}`}
                required
              />
              <input
                type="text"
                value={h.intent || ""}
                onChange={(e) => updateHeading(i, "intent", e.target.value || undefined)}
                placeholder="Intent (optional)"
                className={`w-48 ${inputCls}`}
              />
              {headings.length > 1 && (
                <button type="button" onClick={() => removeHeading(i)} className="text-zinc-500 hover:text-red-400 text-lg px-1">x</button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addHeading} className="mt-2 text-xs text-blue-400 hover:text-blue-300">
          + Add heading
        </button>
      </div>

      <div>
        <label className={labelCls}>Additional Instructions (optional)</label>
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Any extra writing instructions..." rows={2} className={`${inputCls} resize-none`} />
      </div>

      <button
        type="submit"
        disabled={loading || !topic.trim() || headings.some((h) => !h.text.trim())}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white text-sm rounded-lg transition-colors"
      >
        {loading ? "Creating..." : "Create Content Session"}
      </button>
    </form>
  );
}

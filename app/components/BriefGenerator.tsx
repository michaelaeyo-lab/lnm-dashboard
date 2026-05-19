"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { KeywordUpload } from "./KeywordUpload";
import type { QueryEntry } from "../lib/types";

const PIPELINE_STEPS = [
  "Researching keywords & SERP data",
  "Retrieving knowledge base",
  "Collecting competitor data",
  "Analyzing query intent & audience",
  "Analyzing SERP patterns",
  "Analyzing competitors in depth",
  "Mapping contextual vectors & entities",
  "Building heading hierarchy & title",
  "Generating structure & mapping queries",
  "Mapping internal connections",
  "Validating heading quality",
  "Scoring brief quality",
];

interface StepEvent {
  step: number;
  label: string;
  progress: number;
}

export function BriefGenerator() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [pageType, setPageType] = useState("service");
  const [niche, setNiche] = useState("general");
  const [niches, setNiches] = useState<{ id: string; label: string }[]>([]);
  const [location, setLocation] = useState("");
  const [clientName, setClientName] = useState("");
  const [domain, setDomain] = useState("");
  const [manualKeywords, setManualKeywords] = useState<QueryEntry[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/content/niches")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          const list: { id: string; label: string }[] = Array.isArray(data)
            ? data.map((n: { name?: string; label?: string; id?: string }) => ({
                id: n.name || n.id || "",
                label: n.label || n.name || "",
              }))
            : Object.entries(data).map(([id, label]) => ({ id, label: String(label) }));
          // Filter out "general" — already hardcoded in the select
          setNiches(list.filter((n) => n.id !== "general"));
        }
      })
      .catch(() => {});
  }, []);

  async function handleGenerate() {
    if (!topic.trim()) return;
    setGenerating(true);
    setError(null);
    setCurrentStep(0);
    setProgress(0);
    setStepLabel("Starting pipeline...");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          pageType,
          niche,
          location: location.trim() || undefined,
          clientName: clientName.trim() || undefined,
          domain: domain.trim() || undefined,
          manualKeywords: manualKeywords.length > 0 ? manualKeywords : undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let briefId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;

          try {
            const parsed = JSON.parse(raw);

            if (parsed.briefId) {
              briefId = parsed.briefId;
            }

            if (parsed.error) {
              throw new Error(parsed.error);
            }

            if (parsed.step) {
              const evt = parsed as StepEvent;
              setCurrentStep(evt.step);
              setProgress(evt.progress);
              setStepLabel(evt.label);
            }

            if (parsed.done && parsed.brief && briefId) {
              setProgress(1);
              setStepLabel("Brief complete!");
              // Navigate to brief editor
              setTimeout(() => router.push(`/briefs/${briefId}`), 800);
              return;
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "No stream") {
              throw e;
            }
          }
        }
      }

      // If we got here without a redirect, navigate to briefs list
      if (briefId) {
        router.push(`/briefs/${briefId}`);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Brief generation failed");
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    setGenerating(false);
  }

  const inputCls =
    "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500";

  // Progress view during generation
  if (generating) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <h2 className="text-lg font-bold text-zinc-100 mb-6">Generating Brief</h2>
        <p className="text-sm text-zinc-400 mb-4">{topic}</p>

        {/* Progress bar */}
        <div className="w-full bg-zinc-800 rounded-full h-2 mb-4">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-2 mb-6">
          {PIPELINE_STEPS.map((label, i) => {
            const step = i + 1;
            const isDone = currentStep > step;
            const isActive = currentStep === step;
            return (
              <div key={step} className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                    isDone
                      ? "bg-green-600 text-white"
                      : isActive
                        ? "bg-blue-600 text-white animate-pulse"
                        : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {isDone ? "✓" : step}
                </div>
                <span
                  className={`text-sm ${
                    isDone
                      ? "text-zinc-400"
                      : isActive
                        ? "text-zinc-100"
                        : "text-zinc-600"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-zinc-500 mb-4">{stepLabel}</p>

        <button
          onClick={handleCancel}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-bold text-zinc-100 mb-1">Generate Content Brief</h2>
      <p className="text-xs text-zinc-500 mb-6">
        The brief agent will research your topic, build a heading hierarchy with Koray&apos;s 56 semantic rules, and map keywords + internal links.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Topic */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Topic *</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Domestic Home Removal Service in Bristol"
            className={inputCls}
            required
          />
        </div>

        {/* Page Type + Niche */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Page Type *</label>
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
              {niches.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Location (optional)</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Bristol, UK"
            className={inputCls}
          />
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {showAdvanced ? "▾ Hide advanced options" : "▸ Show advanced options"}
        </button>

        {showAdvanced && (
          <div className="space-y-4 pl-3 border-l border-zinc-800">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Client Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g., Bristol Movers Ltd"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Domain</label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g., bristolmovers.co.uk"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Keyword Upload */}
            <KeywordUpload onKeywords={setManualKeywords} />
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleGenerate}
          disabled={!topic.trim()}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm rounded-lg transition-colors"
        >
          Generate Brief
        </button>
      </div>
    </div>
  );
}

"use client";

import { GenerationHistory } from "../../components/GenerationHistory";

export default function HistoryPage() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="h1">Generation History</h1>
          <p className="text-sm muted mt-1">
            Browse past RAG chat conversations and generated content.
          </p>
        </div>
      </div>
      <GenerationHistory />
    </div>
  );
}

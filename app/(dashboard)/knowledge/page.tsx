"use client";

import { BookOpen, Search } from "lucide-react";
import { KnowledgeBrowser } from "../../components/KnowledgeBrowser";

export default function KnowledgePage() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="h1">Knowledge Base</h1>
          <p className="text-sm muted mt-1">
            Search 14,130 knowledge chunks across 17 SEO categories using hybrid vector + keyword search.
          </p>
        </div>
      </div>
      <KnowledgeBrowser />
    </div>
  );
}

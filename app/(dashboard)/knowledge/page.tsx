import { KnowledgeBrowser } from "../../components/KnowledgeBrowser";

export default function KnowledgePage() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Knowledge Base</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Search 14,130 knowledge chunks across 17 SEO categories using hybrid
        vector + keyword search.
      </p>
      <KnowledgeBrowser />
    </div>
  );
}

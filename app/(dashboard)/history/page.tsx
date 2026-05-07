import { GenerationHistory } from "../../components/GenerationHistory";

export default function HistoryPage() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Generation History</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Browse past RAG chat conversations and generated content.
      </p>
      <GenerationHistory />
    </div>
  );
}

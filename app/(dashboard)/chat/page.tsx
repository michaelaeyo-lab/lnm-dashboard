import { ChatInterface } from "../../components/ChatInterface";

export default function ChatPage() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-2">RAG Chat</h2>
      <p className="text-sm text-zinc-500 mb-4">
        Chat with the knowledge base using GPT-4o + retrieval-augmented
        generation.
      </p>
      <ChatInterface />
    </div>
  );
}

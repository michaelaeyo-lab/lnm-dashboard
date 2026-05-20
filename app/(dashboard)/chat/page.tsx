"use client";

import { ChatInterface } from "../../components/ChatInterface";

export default function ChatPage() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="h1">RAG Chat</h1>
          <p className="text-sm muted mt-1">
            Chat with the knowledge base using GPT-4o + retrieval-augmented generation.
          </p>
        </div>
      </div>
      <ChatInterface />
    </div>
  );
}

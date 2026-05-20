"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "../lib/types";

const AGENT_POOLS = [
  { value: "all", label: "All Knowledge" },
  { value: "content", label: "Content Strategy" },
  { value: "technical", label: "Technical SEO" },
  { value: "local-seo", label: "Local SEO" },
  { value: "on-page", label: "On-Page SEO" },
  { value: "off-page", label: "Off-Page & Links" },
  { value: "strategy", label: "Strategy" },
];

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [agentPool, setAgentPool] = useState("all");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStreaming(true);

    // Add placeholder for assistant response
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          agentPool,
          history: messages,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: `Error: ${err.error || "Chat request failed"}`,
          };
          return updated;
        });
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setStreaming(false);
        return;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + parsed.content,
                };
                return updated;
              });
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Error: Network request failed",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      {/* Agent pool selector */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {AGENT_POOLS.map((pool) => (
          <button
            key={pool.value}
            onClick={() => setAgentPool(pool.value)}
            className="px-3 py-1 rounded text-sm transition-colors"
            style={{
              background: agentPool === pool.value ? "var(--accent)" : "var(--surface)",
              color: agentPool === pool.value ? "white" : "var(--text-2)",
            }}
          >
            {pool.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center mt-20" style={{ color: "var(--text-3)" }}>
            <p className="text-lg mb-2">Ask anything about SEO</p>
            <p className="text-sm">
              Powered by 14,130 knowledge chunks from Koray&apos;s resources
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className="max-w-[80%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap"
              style={{
                background: msg.role === "user" ? "var(--accent)" : "var(--surface)",
                color: msg.role === "user" ? "white" : "var(--text-1)",
              }}
            >
              {msg.content || (
                <span className="animate-pulse" style={{ color: "var(--text-3)" }}>
                  Thinking...
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about SEO strategies, technical SEO, content..."
          disabled={streaming}
          className="flex-1 px-4 py-3 rounded-lg disabled:opacity-50"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-1)",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
          style={{
            background: streaming || !input.trim() ? "var(--surface)" : "var(--accent)",
            color: streaming || !input.trim() ? "var(--text-3)" : "white",
          }}
        >
          {streaming ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}

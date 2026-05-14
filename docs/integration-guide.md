# Integration Guide — Chat Interface & Dashboard

This document shows how to connect the retrieval system to a chat interface, a tool dashboard, or any AI-powered feature.

## Pattern: RAG Chat Interface

The most common integration is a chat UI where the user asks a question, the system retrieves relevant knowledge, and an LLM generates a grounded answer.

### Architecture

```
User Message: "Write a service page intro for a plumber in Dallas"
         │
         ▼
    ┌─────────────┐
    │ retrieveFor  │
    │ Agent()      │ → 10 relevant chunks about service pages,
    │              │   local SEO, content structure
    └──────┬──────┘
           │
           ▼
    ┌─────────────────────────────────────────┐
    │ Build LLM Prompt                        │
    │                                         │
    │ SYSTEM: You are an SEO content writer.  │
    │ Use ONLY the knowledge below.           │
    │                                         │
    │ KNOWLEDGE:                              │
    │ [chunk 1 content]                       │
    │ [chunk 2 content]                       │
    │ ...                                     │
    │                                         │
    │ USER: Write a service page intro for    │
    │ a plumber in Dallas                     │
    └──────┬──────────────────────────────────┘
           │
           ▼
    ┌─────────────┐
    │ LLM (Claude │ → Generated content grounded in
    │ or GPT)     │   Koray's methodology
    └─────────────┘
```

### Code Example: Chat API Route

```typescript
// app/api/chat/route.ts
import { retrieveForAgent } from "@/app/lib/retrieval";
import Anthropic from "@anthropic-ai/sdk"; // or OpenAI

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const { message, agentType = "content" } = await request.json();

  // 1. Retrieve relevant knowledge
  const chunks = await retrieveForAgent(agentType, message, 8);

  // 2. Format knowledge context
  const knowledgeContext = chunks
    .map((c, i) => `[Source ${i + 1}: ${c.title} (${c.category})]
${c.content}
---`)
    .join("\n\n");

  // 3. Generate response with knowledge context
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: `You are an expert SEO content specialist trained on Koray Tugberk Gubur's methodology.

IMPORTANT RULES:
- Base your answers ONLY on the knowledge provided below
- If the knowledge doesn't cover something, say so — do not hallucinate
- Cite which source you're drawing from when making specific claims
- Make informed decisions from the knowledge — don't just fill templates

KNOWLEDGE BASE:
${knowledgeContext}`,
    messages: [{ role: "user", content: message }],
  });

  return Response.json({
    response: response.content[0].text,
    sources: chunks.map((c) => ({
      title: c.title,
      category: c.category,
      sourceUrl: c.sourceUrl,
      similarity: c.combinedScore,
    })),
  });
}
```

### Code Example: React Chat Component

```tsx
// app/components/Chat.tsx
"use client";
import { useState } from "react";

export default function Chat() {
  const [messages, setMessages] = useState<Array<{role: string, content: string, sources?: any[]}>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMsg, agentType: "content" }),
    });
    const data = await res.json();

    setMessages((m) => [
      ...m,
      { role: "assistant", content: data.response, sources: data.sources },
    ]);
    setLoading(false);
  }

  return (
    <div>
      <div className="messages">
        {messages.map((m, i) => (
          <div key={i} className={m.role}>
            <p>{m.content}</p>
            {m.sources && (
              <details>
                <summary>{m.sources.length} sources used</summary>
                <ul>
                  {m.sources.map((s, j) => (
                    <li key={j}>
                      {s.title} ({s.category}) — score: {s.similarity.toFixed(3)}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
      </div>
      <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
      <button onClick={send} disabled={loading}>Send</button>
    </div>
  );
}
```

## Pattern: Multi-Agent Dashboard

For a dashboard with specialized tools (content writer, technical auditor, GMB optimizer), each tool maps to an agent pool.

### Agent Tool Configuration

```typescript
// app/lib/agents.ts
export const AGENT_CONFIGS = {
  "content-writer": {
    name: "Content Writer",
    description: "Write service pages, blog posts, and landing pages",
    pool: "content",
    systemPrompt: `You write SEO-optimized content following Koray's methodology.
Focus on topical authority, semantic relevance, and entity-based optimization.`,
    topK: 12,
  },
  "technical-auditor": {
    name: "Technical SEO Auditor",
    description: "Analyze and fix technical SEO issues",
    pool: "technical",
    systemPrompt: `You diagnose technical SEO problems and provide specific fixes.
Reference exact HTML, HTTP headers, and configuration changes.`,
    topK: 8,
  },
  "local-seo": {
    name: "Local SEO / GMB Optimizer",
    description: "Optimize Google Business Profile and local search",
    pool: "local-seo",
    systemPrompt: `You optimize Google Business Profiles and local SEO.
Follow structured SOPs for GMB optimization tasks.`,
    topK: 10,
  },
  "strategy-planner": {
    name: "Strategy Planner",
    description: "Plan site architecture, topical maps, and authority structure",
    pool: "strategy",
    systemPrompt: `You design SEO strategies based on proven site architectures.
Reference real project blueprints and case study outcomes.`,
    topK: 15,
  },
};
```

### Generic Agent API Route

```typescript
// app/api/agent/route.ts
import { retrieveForAgent } from "@/app/lib/retrieval";
import { AGENT_CONFIGS } from "@/app/lib/agents";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const { message, agent } = await request.json();
  const config = AGENT_CONFIGS[agent];
  if (!config) return Response.json({ error: "Unknown agent" }, { status: 400 });

  const chunks = await retrieveForAgent(config.pool, message, config.topK);

  const knowledgeContext = chunks
    .map((c) => `[${c.category} | ${c.title}]\n${c.content}`)
    .join("\n\n---\n\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: `${config.systemPrompt}

Use ONLY the following knowledge to inform your response:

${knowledgeContext}`,
    messages: [{ role: "user", content: message }],
  });

  return Response.json({
    response: response.content[0].text,
    agent: config.name,
    sourcesUsed: chunks.length,
    sources: chunks.map((c) => ({
      title: c.title,
      category: c.category,
      score: c.combinedScore,
    })),
  });
}
```

## Pattern: Multi-Stage Content Generation

For the content writing tool (Phase 5), use a multi-stage pipeline:

```
Stage 1: BRIEF
    Retrieve: content + strategy pools
    Prompt: "Generate a content brief for [topic]"
    Output: structured brief (headings, key points, word count, target audience)

Stage 2: WRITE
    Retrieve: content + on-page pools (with brief as additional query context)
    Prompt: "Write content following this brief: [brief]. Match the style and depth of the knowledge sources."
    Output: draft content

Stage 3: SELF-CHECK
    Retrieve: strategy pool (content rules, quality criteria)
    Prompt: "Review this content against these quality criteria: [rules]. Flag issues."
    Output: review notes + revised content
```

```typescript
// Example: Multi-stage content generation
async function generateContent(topic: string, pageType: string) {
  // Stage 1: Brief
  const briefContext = await retrieveAcrossPools(
    `${pageType} structure for ${topic}`,
    ["content", "strategy"],
    10
  );
  const brief = await callLLM("Generate a content brief...", briefContext);

  // Stage 2: Write
  const writeContext = await retrieveAcrossPools(
    `${topic} ${brief.keyPoints.join(" ")}`,
    ["content", "on-page"],
    15
  );
  const draft = await callLLM("Write content following this brief...", writeContext);

  // Stage 3: Self-check
  const rulesContext = await retrieveForAgent("strategy", "content quality rules checklist");
  const final = await callLLM("Review and improve this content...", rulesContext);

  return final;
}
```

## Pattern: Knowledge Browser UI

A simple search interface for exploring the knowledge base:

```typescript
// Fetch from the existing search API
const response = await fetch(
  `/api/search?q=${encodeURIComponent(query)}&topK=20`
);
const { results } = await response.json();

// Display results with:
// - Title and category badge
// - Content preview (first 200 chars)
// - Source URL link
// - Similarity score bar
// - sourceType tag (web/youtube/gpt-prompt)
```

## Environment Variables for Integration

When adding LLM calls, you'll need:

```env
# For Claude (recommended for generation)
ANTHROPIC_API_KEY=sk-ant-...

# For GPT (alternative)
OPENAI_API_KEY=sk-proj-...  # already set for embeddings
```

## Key Principles

1. **Always retrieve before generating** — Never let the LLM generate from its training data alone. Always feed it relevant chunks from the knowledge base.

2. **Use agent pools** — Don't search the entire 14k chunk database for every query. Narrow to the relevant categories via agent pools.

3. **Show sources** — Always return the source chunks alongside generated content. This lets users verify and builds trust.

4. **Respect the knowledge** — The system prompt should tell the LLM to use ONLY the provided knowledge. If the knowledge doesn't cover something, the LLM should say so rather than make things up.

5. **Use topK wisely** — More chunks = more context = better output, but also more tokens and cost. 5-8 for quick answers, 10-15 for content generation, 20 for comprehensive research.

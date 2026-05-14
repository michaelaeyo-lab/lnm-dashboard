import { getSession } from "@/app/lib/session";
import { retrieveForAgent } from "@/app/lib/retrieval";
import { getPrisma } from "@/app/lib/db";
import { rateLimit, sanitizeInput } from "@/app/lib/security";
import { logOperation } from "@/app/lib/audit";
import OpenAI from "openai";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Rate limit: 10 requests/min per user (chat is expensive)
    const rl = rateLimit(`chat:${user.id}`, 10, 60_000);
    if (!rl.allowed) {
      return Response.json(
        { error: "Chat rate limit exceeded. Please wait before sending another message." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.resetMs - Date.now()) / 1000)) },
        }
      );
    }

    const { message, agentPool = "all", history = [] } = await request.json();

    if (!message || typeof message !== "string") {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    // Sanitize user input
    const sanitizedMessage = sanitizeInput(message);

    // Audit log
    logOperation({
      userId: user.id,
      action: "search_knowledge",
      resource: "/api/chat",
      metadata: { agentPool, messageLength: sanitizedMessage.length },
    });

    // Retrieve relevant knowledge chunks
    const chunks = await retrieveForAgent(agentPool, sanitizedMessage, 10);

    const contextBlock = chunks
      .map(
        (c, i) =>
          `[Source ${i + 1}: ${c.category} — ${c.title} (score: ${c.combinedScore.toFixed(2)})]
${c.content}`
      )
      .join("\n\n---\n\n");

    const systemPrompt = `You are an expert SEO consultant AI for the Late Night Millionaires agency. You have access to a curated knowledge base built from Koray Tugberk Gubur's SEO resources, case studies, and proven strategies.

Use the retrieved knowledge below to answer the user's question. Always ground your answers in the provided context. If the context doesn't contain enough information, say so clearly.

Agent pool: ${agentPool}

--- RETRIEVED KNOWLEDGE ---
${contextBlock}
--- END KNOWLEDGE ---

Guidelines:
- Be specific and actionable in your advice
- Reference specific concepts from the knowledge base when relevant
- If multiple sources provide different perspectives, synthesize them
- Indicate confidence level when making recommendations`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: sanitizedMessage },
    ];

    // Stream response via SSE
    const stream = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages,
      stream: true,
      max_tokens: 2000,
    });

    const encoder = new TextEncoder();
    let fullResponse = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              fullResponse += delta;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ content: delta })}\n\n`
                )
              );
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

          // Save generation to DB (fire-and-forget)
          getPrisma()
            .generation.create({
              data: {
                userId: user.id,
                agentType: agentPool,
                inputPrompt: sanitizedMessage,
                output: fullResponse,
                metadata: {
                  chunksUsed: chunks.length,
                  topChunkScore: chunks[0]?.combinedScore ?? 0,
                },
              },
            })
            .catch((e: unknown) =>
              console.error("[chat] Failed to save generation:", e)
            );
        } catch (err) {
          console.error("[/api/chat] Stream error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream error" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[/api/chat] Error:", err);
    return Response.json({ error: "Chat failed" }, { status: 500 });
  }
}

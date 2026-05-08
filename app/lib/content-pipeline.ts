import "server-only";
import OpenAI from "openai";
import { retrieveForAgent, retrieveAcrossPools } from "./retrieval";
import { buildWritingSystemPrompt } from "./writing-rules/index";
import type { ContentBrief, ContentSectionData } from "./types";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

interface GenerateSectionParams {
  brief: ContentBrief;
  section: ContentSectionData;
  previousSections: ContentSectionData[];
}

interface RefineSectionParams {
  brief: ContentBrief;
  section: ContentSectionData;
  previousSections: ContentSectionData[];
  feedback: string;
}

/**
 * Retrieve relevant knowledge chunks for a section.
 * Uses topic + heading text to find relevant SEO knowledge.
 */
async function retrieveKnowledgeForSection(
  brief: ContentBrief,
  headingText: string
): Promise<string> {
  // Build a search query combining the page topic with the section heading
  const searchQuery = `${brief.topic} ${headingText}`;

  // Retrieve from multiple relevant pools
  const pools = brief.location
    ? ["content", "on-page", "local-seo"]
    : ["content", "on-page", "strategy"];

  const chunks = await retrieveAcrossPools(searchQuery, pools, 8);

  if (chunks.length === 0) {
    return "";
  }

  const contextBlock = chunks
    .map(
      (c, i) =>
        `[Source ${i + 1}: ${c.category} — ${c.title} (score: ${c.combinedScore.toFixed(2)})]
${c.content}`
    )
    .join("\n\n---\n\n");

  return `\n## Retrieved Knowledge (use to inform content, not copy)\n${contextBlock}`;
}

/**
 * Generate content for a single section.
 * Returns an async iterable of SSE-formatted strings.
 */
export async function generateSection(
  params: GenerateSectionParams
): Promise<ReadableStream<Uint8Array>> {
  const { brief, section, previousSections } = params;
  const encoder = new TextEncoder();

  // 1. Retrieve relevant knowledge
  const knowledge = await retrieveKnowledgeForSection(brief, section.headingText);

  // 2. Build system prompt with rules
  const completedSections = previousSections
    .filter((s) => s.content && s.status !== "pending")
    .map((s) => ({ heading: s.headingText, content: s.content! }));

  const systemPrompt = buildWritingSystemPrompt({
    niche: brief.niche,
    pageType: brief.pageType,
    topic: brief.topic,
    location: brief.location,
    clientName: brief.clientName,
    targetAudience: brief.targetAudience,
    additionalInstructions: brief.additionalInstructions,
    previousSections: completedSections,
  });

  // 3. Build user prompt for this section
  const headingTag = `H${section.headingLevel}`;
  let userPrompt = `Write content for the following heading:\n\n${headingTag}: ${section.headingText}`;

  if (section.intent) {
    userPrompt += `\n\nIntent: ${section.intent}`;
  }

  if (section.headingLevel === 1) {
    userPrompt += `\n\nThis is the H1 (main heading). Write a representative summary paragraph of the entire page. Cover the main topic, key subtopics, and primary value proposition. Do not dive deep into any subsection. Use paragraph format.`;
  } else {
    userPrompt += `\n\nWrite complete content for this section. Follow all writing rules strictly.`;
  }

  if (knowledge) {
    userPrompt += `\n\n${knowledge}`;
  }

  // 4. Generate via GPT-4o with streaming
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const stream = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages,
    stream: true,
    max_tokens: 4000,
    temperature: 0.3,
  });

  // 5. Return readable stream (SSE format)
  let fullContent = "";

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ content: delta })}\n\n`
              )
            );
          }
        }

        // Send completion signal with full content
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, fullContent })}\n\n`
          )
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("[content-pipeline] Stream error:", err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "Generation failed" })}\n\n`
          )
        );
        controller.close();
      }
    },
  });
}

/**
 * Refine an existing section with user feedback.
 * Returns an async iterable of SSE-formatted strings.
 */
export async function refineSection(
  params: RefineSectionParams
): Promise<ReadableStream<Uint8Array>> {
  const { brief, section, previousSections, feedback } = params;
  const encoder = new TextEncoder();

  // Build system prompt with rules
  const completedSections = previousSections
    .filter((s) => s.content && s.status !== "pending" && s.id !== section.id)
    .map((s) => ({ heading: s.headingText, content: s.content! }));

  const systemPrompt = buildWritingSystemPrompt({
    niche: brief.niche,
    pageType: brief.pageType,
    topic: brief.topic,
    location: brief.location,
    clientName: brief.clientName,
    targetAudience: brief.targetAudience,
    additionalInstructions: brief.additionalInstructions,
    previousSections: completedSections,
  });

  const userPrompt = `You previously wrote the following content for the heading "${section.headingText}":

--- CURRENT CONTENT ---
${section.content}
--- END CURRENT CONTENT ---

The user has requested the following refinement:
${feedback}

Rewrite the section with the requested changes while continuing to follow all writing rules strictly. Cut fluff, improve logical flow between words, phrases, and sentences. Implement all rules correctly. Output only the refined content.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const stream = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages,
    stream: true,
    max_tokens: 4000,
    temperature: 0.3,
  });

  let fullContent = "";

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ content: delta })}\n\n`
              )
            );
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, fullContent })}\n\n`
          )
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("[content-pipeline] Refine stream error:", err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "Refinement failed" })}\n\n`
          )
        );
        controller.close();
      }
    },
  });
}

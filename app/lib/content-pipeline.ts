import "server-only";
import OpenAI from "openai";
import { retrieveAcrossPools } from "./retrieval";
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
 * Strip markdown artifacts that leak through despite prompt constraints.
 * Removes bold, italic, heading markers, and converts bullet lists to sentences.
 */
function stripMarkdownArtifacts(text: string): string {
  let out = text;
  // Remove bold/italic markers
  out = out.replace(/\*\*(.+?)\*\*/g, "$1");
  out = out.replace(/\*(.+?)\*/g, "$1");
  out = out.replace(/__(.+?)__/g, "$1");
  out = out.replace(/_(.+?)_/g, "$1");
  // Remove heading markers
  out = out.replace(/^#{1,4}\s+/gm, "");
  // Convert bullet/dash list items to flowing sentences
  out = out.replace(/^[\-\*\u2022]\s+/gm, "");
  // Convert numbered list items (1. 2. etc) to flowing text
  out = out.replace(/^\d+[.)]\s+/gm, "");
  // Collapse multiple blank lines
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

/**
 * Build heading-type-aware user prompt.
 * H1 = representative summary of entire page.
 * H2 = expansion section with definition -> evidence -> perspective.
 * H3/H4 = semantic stack: definition -> mechanism -> benefit -> condition.
 */
function buildSectionPrompt(
  brief: ContentBrief,
  section: ContentSectionData,
  allSections: ContentSectionData[]
): string {
  const tag = `H${section.headingLevel}`;
  const parts: string[] = [];

  parts.push(`HEADING: ${tag}: ${section.headingText}`);

  if (section.headingLevel === 1) {
    // H1: representative summary — mirrors the manual approach exactly
    const otherHeadings = allSections
      .filter((s) => s.headingLevel >= 2)
      .map((s) => `${s.headingText}`)
      .join(", ");

    parts.push(`
TASK: Write a representative summary paragraph for the H1 heading.
This paragraph summarizes the entire document in the same order as the page structure.

Page sections to represent: ${otherHeadings}

RULES FOR H1:
- Compress the full document into one paragraph.
- Process each contextual vector in order: definition, causes, mechanisms, solutions, service mention.
- Do NOT dive deep into any sub-section. Each topic gets one to two sentences maximum.
- Do NOT ask questions. Do NOT use headings. Paragraph format only.
- Use entity-driven factual declarations. No modal verbs. No fluff.
- Include the topic definition using signifier + qualifier structure in the first sentence.
- If a client/brand exists, mention it once near the end as a factual service reference. No promotion.`);
  } else if (section.headingLevel === 2) {
    // H2: expansion section
    parts.push(`
TASK: Write complete expansion content for this H2 section.

STRUCTURE (follow this order):
1. First sentence: Direct definitive answer or explicit definition using signifier + qualifier.
2. Causal or functional explanation: Why or how this works. Use evidence, research references, data points.
3. Supporting detail: Specific examples, numbers, percentages, entity attributes.
4. Perspective layer: Add one factual perspective from a different viewpoint (user, provider, researcher) if relevant.
5. Contextual close: Connect back to the page topic without repeating prior sections.

RULES FOR H2:
- Paragraph format only. No bullets. No bold. No dashes.
- Answer immediately in the first sentence, then expand with evidence.
- Every sentence adds unique information. Delete any sentence that, if removed, does not change meaning.
- Use short sentences. Split any sentence exceeding 30 words.
- No modal verbs. No opinions. No analogies. No filler phrases.
- Include entities, attribute values, and specific data where relevant.`);
  } else {
    // H3/H4: semantic stack
    parts.push(`
TASK: Write focused content for this ${tag} section.

SEMANTIC STACK (follow this exact order):
1. Definition: What this is, using signifier + qualifier structure.
2. Mechanism: How it works or why it matters. Functional explanation.
3. Benefit: The exact outcome or result. Use specific numbers if available.
4. Applicability: When or under what conditions this applies.

RULES FOR ${tag}:
- Paragraph format. No bullets. No bold. No dashes.
- Keep total length between 50 and 200 words.
- First sentence is the definition. Do not delay with context-setting.
- Every word carries contextual relevance.
- No modal verbs. No opinions. No filler.
- Use consistent part-of-speech patterns across parallel items.`);
  }

  // Add brief structure instructions if available from the brief agent
  if (section.intent) {
    parts.push(`\nBRIEF AGENT INSTRUCTIONS: ${section.intent}`);
  }

  return parts.join("\n");
}

/**
 * Retrieve relevant knowledge chunks for a section.
 */
async function retrieveKnowledgeForSection(
  brief: ContentBrief,
  headingText: string
): Promise<string> {
  const searchQuery = `${brief.topic} ${headingText}`;
  const pools = brief.location
    ? ["content", "on-page", "local-seo"]
    : ["content", "on-page", "strategy"];

  const chunks = await retrieveAcrossPools(searchQuery, pools, 8);

  if (chunks.length === 0) return "";

  const contextBlock = chunks
    .map(
      (c, i) =>
        `[Source ${i + 1}: ${c.category} — ${c.title} (score: ${c.combinedScore.toFixed(2)})]
${c.content}`
    )
    .join("\n\n---\n\n");

  return `\nRELEVANT KNOWLEDGE (use to inform content, do not copy verbatim):\n${contextBlock}`;
}

/**
 * Generate content for a single section.
 * Uses two-pass rule enforcement and heading-type-aware prompting.
 */
export async function generateSection(
  params: GenerateSectionParams
): Promise<ReadableStream<Uint8Array>> {
  const { brief, section, previousSections } = params;
  const encoder = new TextEncoder();

  // 1. Retrieve relevant knowledge
  const knowledge = await retrieveKnowledgeForSection(brief, section.headingText);

  // 2. Build system prompt with rules + hard output constraints
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

  // 3. Build heading-type-aware user prompt
  const allSections = [...previousSections, section];
  let userPrompt = buildSectionPrompt(brief, section, allSections);

  if (knowledge) {
    userPrompt += `\n\n${knowledge}`;
  }

  // Add two-pass enforcement reminder at the end
  userPrompt += `\n\nBEFORE WRITING: Internally process ALL 56 semantic writing rules from first to last. Then implement every applicable rule while writing. Output ONLY the content. No commentary. No rule listing. Paragraph format. No markdown formatting.`;

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
    temperature: 0.25,
  });

  // 5. Return readable stream with post-processing
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

        // Post-process: strip any markdown artifacts that leaked through
        const cleanedContent = stripMarkdownArtifacts(fullContent);

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, fullContent: cleanedContent })}\n\n`
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
 */
export async function refineSection(
  params: RefineSectionParams
): Promise<ReadableStream<Uint8Array>> {
  const { brief, section, previousSections, feedback } = params;
  const encoder = new TextEncoder();

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

  const userPrompt = `CURRENT CONTENT FOR "${section.headingText}":

${section.content}

REFINEMENT REQUEST: ${feedback}

INSTRUCTIONS:
1. First, internally reprocess ALL 56 semantic writing rules.
2. Apply the refinement request above.
3. Also fix any rule violations in the current content:
   - Remove all bold/italic markdown formatting.
   - Remove all bullet points and dashes. Convert to paragraph format.
   - Eliminate modal verbs (will, should, need to, have to, must, can, could).
   - Cut all filler phrases and fluff words.
   - Ensure every sentence adds unique information.
   - Use entity-driven factual declarations.
   - Maximize information density per word.
4. Output ONLY the refined content. No commentary. No markdown. Paragraph format only.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const stream = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages,
    stream: true,
    max_tokens: 4000,
    temperature: 0.25,
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

        const cleanedContent = stripMarkdownArtifacts(fullContent);

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, fullContent: cleanedContent })}\n\n`
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

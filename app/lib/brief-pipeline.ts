import "server-only";
import OpenAI from "openai";
import {
  retrieveSimilarBriefs,
  retrieveRuleExamples,
  retrieveAcrossPools,
} from "./retrieval";
import { getCoreRules } from "./writing-rules/core";
import {
  lookupKeyword,
  searchAtlasAvailable,
  type KeywordResearchResult,
} from "./searchatlas";
import type {
  EnhancedBrief,
  EnhancedHeading,
  QueryEntry,
  EntityMapping,
  ConnectionEntry,
  CompetitorEntry,
} from "./types";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

// --- Types ---

export interface BriefGenParams {
  topic: string;
  pageType: string;
  niche: string;
  location?: string;
  clientName?: string;
  domain?: string;
  manualKeywords?: QueryEntry[];
}

interface StepEvent {
  step: number;
  label: string;
  progress: number;
  data?: unknown;
}

// --- Pipeline ---

/**
 * Generate an enhanced content brief via a 6-step pipeline.
 * Returns a ReadableStream of SSE events with step progress and final brief.
 */
export async function generateBrief(
  params: BriefGenParams
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      function sendEvent(event: StepEvent | { done: true; brief: EnhancedBrief }) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      }

      try {
        // Step 1: Topic Research (SearchAtlas or manual)
        sendEvent({ step: 1, label: "Researching keywords...", progress: 0.05 });
        const keywordData = await stepTopicResearch(params);
        sendEvent({ step: 1, label: "Keywords researched", progress: 0.16 });

        // Step 2: Contextual Vectors
        sendEvent({ step: 2, label: "Mapping contextual vectors...", progress: 0.2 });
        const { contextualVectors, entityMap } = await stepContextualVectors(
          params,
          keywordData
        );
        sendEvent({ step: 2, label: "Vectors mapped", progress: 0.33 });

        // Step 3: Hierarchy Construction
        sendEvent({ step: 3, label: "Building heading hierarchy...", progress: 0.37 });
        const rawHeadings = await stepHierarchyConstruction(
          params,
          contextualVectors,
          keywordData
        );
        sendEvent({ step: 3, label: "Hierarchy built", progress: 0.5 });

        // Step 4: Per-Heading Structure Instructions
        sendEvent({ step: 4, label: "Generating structure instructions...", progress: 0.55 });
        const headings = await stepStructureInstructions(
          params,
          rawHeadings,
          keywordData
        );
        sendEvent({ step: 4, label: "Instructions generated", progress: 0.66 });

        // Step 5: Connection Mapping
        sendEvent({ step: 5, label: "Mapping internal connections...", progress: 0.7 });
        const connectionMap = await stepConnectionMapping(params, headings);
        sendEvent({ step: 5, label: "Connections mapped", progress: 0.83 });

        // Step 6: Query Mapping
        sendEvent({ step: 6, label: "Assigning queries to headings...", progress: 0.87 });
        const finalHeadings = await stepQueryMapping(headings, keywordData);
        sendEvent({ step: 6, label: "Queries assigned", progress: 0.95 });

        // Build final brief
        const competitors: CompetitorEntry[] =
          keywordData?.competitors?.map((c) => ({
            url: c.url,
            title: c.title,
            headings: c.headings,
            wordCount: c.wordCount,
            serpPosition: c.serpPosition,
          })) ?? [];

        const knowledgeGaps = deriveKnowledgeGaps(
          contextualVectors,
          finalHeadings
        );

        const brief: EnhancedBrief = {
          contextualVectors,
          headings: finalHeadings,
          entityMap,
          connectionMap,
          competitors,
          knowledgeGaps,
        };

        sendEvent({ done: true, brief });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("[brief-pipeline] Error:", err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Brief generation failed" })}\n\n`
          )
        );
        controller.close();
      }
    },
  });
}

// --- Step 1: Topic Research ---

async function stepTopicResearch(
  params: BriefGenParams
): Promise<KeywordResearchResult | null> {
  // Try SearchAtlas first
  if (searchAtlasAvailable() && params.topic) {
    const searchQuery = params.location
      ? `${params.topic} ${params.location}`
      : params.topic;
    const result = await lookupKeyword(searchQuery);
    if (result) return result;
  }

  // If manual keywords provided, build a pseudo-result
  if (params.manualKeywords && params.manualKeywords.length > 0) {
    const primary = params.manualKeywords[0];
    return {
      primary: { keyword: primary.query, volume: primary.volume, intent: primary.intent },
      related: params.manualKeywords.slice(1).map((k) => ({
        keyword: k.query,
        volume: k.volume,
        intent: k.intent,
      })),
      paa: [],
      serp: { keyword: primary.query, results: [], features: [] },
      competitors: [],
    };
  }

  return null;
}

// --- Step 2: Contextual Vectors ---

async function stepContextualVectors(
  params: BriefGenParams,
  keywordData: KeywordResearchResult | null
): Promise<{ contextualVectors: string[]; entityMap: EntityMapping[] }> {
  // RAG: retrieve relevant knowledge
  const ragChunks = await retrieveAcrossPools(
    params.topic,
    ["content", "on-page", "strategy"],
    6
  );

  const ragContext = ragChunks
    .map((c) => `[${c.category}] ${c.title}: ${c.content.slice(0, 300)}`)
    .join("\n\n");

  const keywordContext = keywordData
    ? `Primary keyword: ${keywordData.primary.keyword} (${keywordData.primary.volume}/mo)\nRelated: ${keywordData.related.slice(0, 10).map((k) => `${k.keyword} (${k.volume})`).join(", ")}\nPAA: ${keywordData.paa.slice(0, 5).join("; ")}`
    : "";

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a semantic SEO content strategist. Given a topic, identify:
1. Contextual Vectors: 8-15 topical coverage areas that a comprehensive page on this topic must address. Each vector is a short phrase (3-6 words).
2. Entity Map: Key entities (people, places, organizations, concepts, services) relevant to this topic, with their type and relevance (primary/secondary/contextual).

Return JSON: { "contextualVectors": string[], "entityMap": [{ "entity": string, "type": string, "relevance": string }] }`,
      },
      {
        role: "user",
        content: `Topic: ${params.topic}\nPage Type: ${params.pageType}\nNiche: ${params.niche}${params.location ? `\nLocation: ${params.location}` : ""}${params.clientName ? `\nClient: ${params.clientName}` : ""}\n\n${keywordContext}\n\nRelevant Knowledge:\n${ragContext}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content) as {
    contextualVectors?: string[];
    entityMap?: EntityMapping[];
  };

  return {
    contextualVectors: parsed.contextualVectors || [],
    entityMap: (parsed.entityMap || []).map((e) => ({
      entity: e.entity,
      type: e.type || "concept",
      relevance: e.relevance || "secondary",
    })),
  };
}

// --- Step 3: Hierarchy Construction ---

async function stepHierarchyConstruction(
  params: BriefGenParams,
  contextualVectors: string[],
  keywordData: KeywordResearchResult | null
): Promise<Array<{ level: number; text: string }>> {
  // RAG: retrieve similar briefs as few-shot examples
  const similarBriefs = await retrieveSimilarBriefs(
    params.topic,
    params.pageType,
    4
  );

  const briefExamples = similarBriefs
    .map(
      (c) =>
        `--- Example Brief (${c.sourceFile}) ---\n${c.content.slice(0, 500)}`
    )
    .join("\n\n");

  const competitorHeadings =
    keywordData?.competitors
      ?.filter((c) => c.headings.length > 0)
      .map(
        (c) =>
          `${c.title} (pos ${c.serpPosition}): ${c.headings.join(" | ")}`
      )
      .join("\n") || "";

  const paaQuestions = keywordData?.paa?.join("\n- ") || "";

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a semantic SEO heading architect. Build a comprehensive H1-H4 heading structure for a ${params.pageType} page.

Rules:
- Exactly 1 H1 (main topic heading)
- 5-12 H2s covering all contextual vectors
- H3s under H2s for subtopics, questions, or list items
- H4s sparingly for deep detail
- Use natural, search-friendly heading text (not keyword-stuffed)
- Include question-based headings where PAA opportunities exist
- If this is a service page: include "What is X?", benefits, process, pricing, FAQ sections
- If this is a blog: include definition, main points, how-to, comparison, FAQ sections

Return JSON: { "headings": [{ "level": 1|2|3|4, "text": string }] }`,
      },
      {
        role: "user",
        content: `Topic: ${params.topic}\nPage Type: ${params.pageType}${params.location ? `\nLocation: ${params.location}` : ""}${params.clientName ? `\nClient: ${params.clientName}` : ""}\n\nContextual Vectors:\n- ${contextualVectors.join("\n- ")}\n\n${paaQuestions ? `People Also Ask:\n- ${paaQuestions}\n\n` : ""}${competitorHeadings ? `Competitor Headings:\n${competitorHeadings}\n\n` : ""}${briefExamples ? `Similar Brief Examples:\n${briefExamples}` : ""}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content) as {
    headings?: Array<{ level: number; text: string }>;
  };

  return parsed.headings || [];
}

// --- Step 4: Structure Instructions ---

async function stepStructureInstructions(
  params: BriefGenParams,
  rawHeadings: Array<{ level: number; text: string }>,
  keywordData: KeywordResearchResult | null
): Promise<EnhancedHeading[]> {
  // RAG: get rule examples
  const ruleExamples = await retrieveRuleExamples(
    ["FS", "PAA", "NER", "TF-IDF"],
    5
  );

  const ruleContext = ruleExamples
    .map((c) => `[Rule Example] ${c.title}: ${c.content.slice(0, 300)}`)
    .join("\n\n");

  const coreRules = getCoreRules();

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a semantic SEO brief writer. For each heading, generate:
1. structureInstructions: Detailed instructions on what to write and how (format, tone, content type — e.g., "Explicit definition using signifier + qualifier", "List intro + List items + List outro", "Direct answer + expansion of evidence")
2. ruleCodes: Which writing rule codes apply (e.g., "FS" for featured snippet, "PAA" for people also ask, "NER" for named entity recognition, "TF-IDF" for term frequency)
3. intent: What this section should accomplish for the reader
4. wordCountTarget: Suggested word count (50-300 per section)

Reference these content writing rules when assigning structure instructions:
${coreRules.slice(0, 2000)}

Return JSON: { "headings": [{ "level": number, "text": string, "structureInstructions": string, "ruleCodes": string[], "intent": string, "wordCountTarget": number }] }`,
      },
      {
        role: "user",
        content: `Topic: ${params.topic}\nPage Type: ${params.pageType}\nNiche: ${params.niche}\n\nHeadings to annotate:\n${rawHeadings.map((h) => `${"#".repeat(h.level)} ${h.text}`).join("\n")}\n\n${ruleContext ? `Rule Application Examples:\n${ruleContext}` : ""}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content) as {
    headings?: Array<{
      level: number;
      text: string;
      structureInstructions: string;
      ruleCodes: string[];
      intent: string;
      wordCountTarget: number;
    }>;
  };

  return (parsed.headings || rawHeadings).map((h) => ({
    level: (h.level as 1 | 2 | 3 | 4) || 2,
    text: h.text,
    structureInstructions: (h as { structureInstructions?: string }).structureInstructions || "",
    targetQueries: [],
    serpFeatures: [],
    ruleCodes: (h as { ruleCodes?: string[] }).ruleCodes || [],
    intent: (h as { intent?: string }).intent || "",
    wordCountTarget: (h as { wordCountTarget?: number }).wordCountTarget,
  }));
}

// --- Step 5: Connection Mapping ---

async function stepConnectionMapping(
  params: BriefGenParams,
  headings: EnhancedHeading[]
): Promise<ConnectionEntry[]> {
  const headingList = headings
    .map((h) => `${"#".repeat(h.level)} ${h.text}`)
    .join("\n");

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an internal linking strategist. Given a page's heading structure, suggest 3-8 internal linking opportunities. Each link connects a heading on this page to another page that should exist on the site.

Return JSON: { "connections": [{ "fromHeading": string, "toPage": string, "anchorText": string, "reason": string }] }`,
      },
      {
        role: "user",
        content: `Topic: ${params.topic}\nPage Type: ${params.pageType}${params.clientName ? `\nClient: ${params.clientName}` : ""}${params.domain ? `\nDomain: ${params.domain}` : ""}\n\nHeadings:\n${headingList}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content) as {
    connections?: ConnectionEntry[];
  };

  return (parsed.connections || []).map((c) => ({
    fromHeading: c.fromHeading,
    toPage: c.toPage,
    anchorText: c.anchorText,
    reason: c.reason,
  }));
}

// --- Step 6: Query Mapping ---

async function stepQueryMapping(
  headings: EnhancedHeading[],
  keywordData: KeywordResearchResult | null
): Promise<EnhancedHeading[]> {
  if (!keywordData) return headings;

  const allKeywords = [
    keywordData.primary,
    ...keywordData.related,
  ].filter((k) => k.volume > 0);

  if (allKeywords.length === 0) return headings;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Map keywords to headings by semantic relevance. Each heading can have 0-5 target queries. Assign the primary keyword to the H1. Distribute remaining keywords to the most relevant H2/H3/H4 headings. Also identify which SERP features each heading could target (FS=Featured Snippet, PAA=People Also Ask, KP=Knowledge Panel, LC=Local Pack).

Return JSON: { "mappings": [{ "headingIndex": number, "queries": [{ "query": string, "volume": number, "intent": string }], "serpFeatures": string[] }] }`,
      },
      {
        role: "user",
        content: `Headings:\n${headings.map((h, i) => `${i}. ${"#".repeat(h.level)} ${h.text}`).join("\n")}\n\nKeywords:\n${allKeywords.map((k) => `${k.keyword} (${k.volume}/mo${k.intent ? `, ${k.intent}` : ""})`).join("\n")}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content) as {
    mappings?: Array<{
      headingIndex: number;
      queries: QueryEntry[];
      serpFeatures: string[];
    }>;
  };

  const mappings = parsed.mappings || [];
  const result = [...headings];

  for (const m of mappings) {
    if (m.headingIndex >= 0 && m.headingIndex < result.length) {
      result[m.headingIndex] = {
        ...result[m.headingIndex],
        targetQueries: m.queries || [],
        serpFeatures: m.serpFeatures || [],
      };
    }
  }

  return result;
}

// --- Helpers ---

function deriveKnowledgeGaps(
  vectors: string[],
  headings: EnhancedHeading[]
): string[] {
  // Simple gap detection: vectors not covered by any heading
  const headingTexts = headings
    .map((h) => h.text.toLowerCase())
    .join(" ");

  return vectors.filter((v) => {
    const words = v.toLowerCase().split(/\s+/);
    const covered = words.filter((w) => headingTexts.includes(w));
    return covered.length < words.length / 2;
  });
}

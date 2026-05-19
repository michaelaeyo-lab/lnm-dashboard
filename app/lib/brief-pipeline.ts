import "server-only";
import OpenAI from "openai";
import {
  retrieveSimilarBriefs,
  retrieveRuleExamples,
  retrieveAcrossPools,
  retrieveForPageType,
  retrieveForAgent,
} from "./retrieval";
import type { RetrievedChunk } from "./retrieval";
import { getCoreRules } from "./writing-rules/core";
import {
  lookupKeyword,
  searchAtlasAvailable,
  bulkSerpLookup,
  getOrganicKeywords,
  analyzeKeywordGap,
  type KeywordResearchResult,
  type KeywordData,
  type SerpOverview,
} from "./searchatlas";
import type {
  EnhancedBrief,
  EnhancedHeading,
  QueryEntry,
  EntityMapping,
  ConnectionEntry,
  CompetitorEntry,
  BulkSerpFeatureMatrix,
  KnowledgeContext,
  RetrievedChunkRef,
  CompetitorDataset,
  CompetitorKeywordData,
  QueryPreAnalysis,
  SerpAnalysis,
  CompetitorDeepAnalysis,
  DeepCompetitorAnalysisResult,
  TopicalMapEntry,
  TitleTagData,
  HeadingValidation,
  BriefQualityReport,
} from "./types";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

/**
 * Safely parse JSON from LLM output. Handles truncated responses by
 * attempting to repair common issues (missing closing brackets/braces).
 */
function safeParseJSON<T>(text: string): T {
  // First try direct parse
  try {
    return JSON.parse(text) as T;
  } catch {
    // ignore, try repairs
  }

  // Strip markdown code fences if present
  let cleaned = text.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();

  // Try again
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // ignore
  }

  // Attempt to repair truncated JSON by closing open brackets/braces
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;

  for (const ch of cleaned) {
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") openBraces++;
    if (ch === "}") openBraces--;
    if (ch === "[") openBrackets++;
    if (ch === "]") openBrackets--;
  }

  // If we're inside a string, close it
  if (inString) cleaned += '"';

  // Remove trailing comma before closing
  cleaned = cleaned.replace(/,\s*$/, "");

  // Close open structures
  for (let i = 0; i < openBrackets; i++) cleaned += "]";
  for (let i = 0; i < openBraces; i++) cleaned += "}";

  return JSON.parse(cleaned) as T;
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

// --- Helpers ---

function chunkToRef(c: RetrievedChunk): RetrievedChunkRef {
  return {
    category: c.category,
    title: c.title,
    content: c.content,
    sourceFile: c.sourceFile,
    similarity: c.similarity,
  };
}

function extractDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// --- Pipeline ---

/**
 * Generate an enhanced content brief via a 12-step pipeline.
 * Returns a ReadableStream of SSE events with step progress and final brief.
 *
 * Pipeline phases:
 *   A. Data Collection  (Steps 1-3)  — parallel
 *   B. Analysis          (Steps 4-6)  — Steps 4+5 parallel, Step 6 sequential
 *   C. Construction      (Steps 7-10) — sequential
 *   D. Validation        (Steps 11-12) — parallel
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
        // ============================================================
        // PHASE A: DATA COLLECTION (Steps 1-3) — parallel
        // ============================================================

        sendEvent({ step: 1, label: "Researching keywords & SERP data...", progress: 0.02 });
        sendEvent({ step: 2, label: "Retrieving knowledge base...", progress: 0.02 });

        // Start Step 1 and Step 2 in parallel
        const keywordDataPromise = stepTopicResearch(params);
        const knowledgePromise = stepKnowledgeRetrieval(params);

        // Await keyword data first (Step 3 depends on it)
        const keywordData = await keywordDataPromise;
        sendEvent({ step: 1, label: "Keywords researched", progress: 0.10 });

        // Start Step 3 (needs competitor URLs from Step 1)
        sendEvent({ step: 3, label: "Collecting competitor data...", progress: 0.10 });
        const [knowledgeContext, competitorDataset] = await Promise.all([
          knowledgePromise,
          stepCompetitorDataCollection(params, keywordData),
        ]);
        sendEvent({ step: 2, label: "Knowledge retrieved", progress: 0.17 });
        sendEvent({ step: 3, label: "Competitor data collected", progress: 0.25 });

        // ============================================================
        // PHASE B: ANALYSIS (Steps 4-6) — Steps 4+5 parallel, Step 6 after
        // ============================================================

        sendEvent({ step: 4, label: "Analyzing query intent & audience...", progress: 0.27 });
        sendEvent({ step: 5, label: "Analyzing SERP patterns...", progress: 0.27 });

        const [queryPreAnalysis, serpAnalysis] = await Promise.all([
          stepQueryPreAnalysis(params, keywordData, competitorDataset),
          stepSerpAnalysis(keywordData, competitorDataset),
        ]);
        sendEvent({ step: 4, label: "Intent analyzed", progress: 0.37 });
        sendEvent({ step: 5, label: "SERP patterns analyzed", progress: 0.37 });

        sendEvent({ step: 6, label: "Analyzing competitors in depth...", progress: 0.40 });
        const deepCompetitors = await stepDeepCompetitorAnalysis(
          keywordData,
          competitorDataset
        );
        sendEvent({ step: 6, label: "Competitors analyzed", progress: 0.50 });

        // ============================================================
        // PHASE C: CONSTRUCTION (Steps 7-10) — sequential
        // ============================================================

        sendEvent({ step: 7, label: "Mapping contextual vectors & entities...", progress: 0.52 });
        const { contextualVectors, entityMap, topicalMap } =
          await stepContextualVectors(
            params,
            keywordData,
            knowledgeContext,
            queryPreAnalysis,
            serpAnalysis,
            deepCompetitors
          );
        sendEvent({ step: 7, label: "Vectors mapped", progress: 0.58 });

        sendEvent({ step: 8, label: "Building heading hierarchy & title...", progress: 0.60 });
        const { rawHeadings, titleTag } = await stepHierarchyAndTitle(
          params,
          contextualVectors,
          topicalMap,
          keywordData,
          knowledgeContext,
          queryPreAnalysis,
          serpAnalysis,
          deepCompetitors
        );
        sendEvent({ step: 8, label: "Hierarchy built", progress: 0.68 });

        sendEvent({ step: 9, label: "Generating structure & mapping queries...", progress: 0.70 });
        const headings = await stepStructureAndQueryMapping(
          params,
          rawHeadings,
          keywordData,
          deepCompetitors
        );
        sendEvent({ step: 9, label: "Structure complete", progress: 0.78 });

        sendEvent({ step: 10, label: "Mapping internal connections...", progress: 0.80 });
        const connectionMap = await stepConnectionMapping(
          params,
          headings,
          topicalMap
        );
        sendEvent({ step: 10, label: "Connections mapped", progress: 0.85 });

        // ============================================================
        // PHASE D: VALIDATION (Steps 11-12) — parallel
        // ============================================================

        sendEvent({ step: 11, label: "Validating heading quality...", progress: 0.87 });
        sendEvent({ step: 12, label: "Scoring brief quality...", progress: 0.87 });

        const [headingValidation, qualityReport] = await Promise.all([
          stepHeadingValidation(headings, queryPreAnalysis),
          stepQualityScoring(
            contextualVectors,
            headings,
            entityMap,
            queryPreAnalysis,
            serpAnalysis,
            deepCompetitors
          ),
        ]);
        sendEvent({ step: 11, label: "Headings validated", progress: 0.95 });
        sendEvent({ step: 12, label: "Brief scored", progress: 0.98 });

        // Apply heading corrections if validation score < 8
        const finalHeadings =
          headingValidation.score < 8 && headingValidation.correctedHeadings
            ? headingValidation.correctedHeadings
            : headings;

        // Build competitors list from keyword data
        const competitors: CompetitorEntry[] =
          keywordData?.competitors?.map((c) => ({
            url: c.url,
            title: c.title,
            headings: c.headings,
            wordCount: c.wordCount,
            serpPosition: c.serpPosition,
          })) ?? [];

        // Build final brief (backward compatible)
        const brief: EnhancedBrief = {
          contextualVectors,
          headings: finalHeadings,
          entityMap,
          connectionMap,
          competitors,
          knowledgeGaps: qualityReport.knowledgeGaps,
          // V2 fields
          queryPreAnalysis,
          serpAnalysis,
          deepCompetitorAnalysis: deepCompetitors,
          topicalMap,
          titleTag,
          headingValidation,
          qualityReport,
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

// ============================================================
// PHASE A: DATA COLLECTION
// ============================================================

// --- Step 1: Topic Research + Extended Keyword Data ---

async function stepTopicResearch(
  params: BriefGenParams
): Promise<KeywordResearchResult | null> {
  // Try SearchAtlas first
  if (searchAtlasAvailable() && params.topic) {
    const searchQuery = params.location
      ? `${params.topic} ${params.location}`
      : params.topic;
    const result = await lookupKeyword(searchQuery);

    // Also fetch bulk SERP data for related keywords if available
    if (result && result.related.length > 0) {
      const relatedKeywords = result.related
        .slice(0, 8)
        .map((k) => k.keyword);
      const bulkSerp = await bulkSerpLookup(relatedKeywords);
      if (bulkSerp) {
        // Attach as metadata on the result for downstream steps
        (result as KeywordResearchResult & { bulkSerp?: SerpOverview[] }).bulkSerp =
          bulkSerp;
      }
    }

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

// --- Step 2: Knowledge Base Retrieval ---

async function stepKnowledgeRetrieval(
  params: BriefGenParams
): Promise<KnowledgeContext> {
  const pageType = params.pageType as "service" | "location" | "blog" | "landing";

  // Run 3 RAG queries in parallel
  const [pageTypeChunks, briefExampleChunks, strategyChunks] =
    await Promise.all([
      retrieveForPageType(pageType, params.topic, 8),
      retrieveForAgent("brief-examples", params.topic, 4),
      retrieveForAgent("strategy", params.topic, 4),
    ]);

  return {
    pageTypeChunks: pageTypeChunks.map(chunkToRef),
    briefExampleChunks: briefExampleChunks.map(chunkToRef),
    strategyChunks: strategyChunks.map(chunkToRef),
  };
}

// --- Step 3: Competitor Data Collection ---

async function stepCompetitorDataCollection(
  params: BriefGenParams,
  keywordData: KeywordResearchResult | null
): Promise<CompetitorDataset> {
  if (!searchAtlasAvailable() || !keywordData) {
    return { competitorKeywords: null, gapKeywords: null };
  }

  // Extract top 3 competitor domains from SERP
  const competitorDomains = keywordData.competitors
    .slice(0, 3)
    .map((c) => extractDomainFromUrl(c.url))
    .filter((d) => d.length > 0);

  if (competitorDomains.length === 0) {
    return { competitorKeywords: null, gapKeywords: null };
  }

  // Fetch organic keywords for each competitor in parallel
  const keywordPromises = competitorDomains.map(async (domain) => {
    const keywords = await getOrganicKeywords(domain, "gb", 30);
    return { domain, keywords };
  });

  // Optionally run keyword gap analysis if client domain provided
  const gapPromise =
    params.domain
      ? analyzeKeywordGap(params.domain, competitorDomains)
      : Promise.resolve(null);

  const [competitorResults, gapResults] = await Promise.all([
    Promise.all(keywordPromises),
    gapPromise,
  ]);

  // Build competitor keywords map
  const competitorKeywords = new Map<string, CompetitorKeywordData[]>();
  for (const { domain, keywords } of competitorResults) {
    if (keywords) {
      competitorKeywords.set(
        domain,
        keywords.map((k: KeywordData) => ({
          keyword: k.keyword,
          volume: k.volume,
          intent: k.intent,
        }))
      );
    }
  }

  const gapKeywords: CompetitorKeywordData[] | null = gapResults
    ? gapResults.map((k: KeywordData) => ({
        keyword: k.keyword,
        volume: k.volume,
        intent: k.intent,
      }))
    : null;

  return {
    competitorKeywords: competitorKeywords.size > 0 ? competitorKeywords : null,
    gapKeywords,
  };
}

// ============================================================
// PHASE B: ANALYSIS
// ============================================================

// --- Step 4: Query & Intent Pre-Analysis ---

async function stepQueryPreAnalysis(
  params: BriefGenParams,
  keywordData: KeywordResearchResult | null,
  competitorDataset: CompetitorDataset
): Promise<QueryPreAnalysis> {
  const keywordContext = keywordData
    ? `Primary keyword: ${keywordData.primary.keyword} (${keywordData.primary.volume}/mo, intent: ${keywordData.primary.intent || "unknown"})\nRelated: ${keywordData.related.slice(0, 15).map((k) => `${k.keyword} (${k.volume})`).join(", ")}\nPAA: ${keywordData.paa.slice(0, 8).join("; ")}`
    : `Topic: ${params.topic}`;

  const competitorContext = keywordData?.competitors
    ? `Top SERP results:\n${keywordData.competitors.slice(0, 5).map((c) => `#${c.serpPosition} ${c.title} — ${c.url}`).join("\n")}`
    : "";

  const gapContext = competitorDataset.gapKeywords
    ? `Keyword gaps (client vs competitors): ${competitorDataset.gapKeywords.slice(0, 10).map((k) => k.keyword).join(", ")}`
    : "";

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.2,
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert SEO query analyst. Analyze the query and produce a comprehensive pre-analysis.

Return JSON:
{
  "searchIntent": "informational"|"commercial"|"transactional"|"navigational"|"investigational"|"local"|"comparative"|"mixed",
  "queryType": "head-term"|"mid-tail"|"long-tail"|"entity-based"|"attribute-based"|"modifier-based"|"problem-based",
  "queryCompleteness": { "isComplete": boolean, "missingQualifiers": string[] },
  "audienceSegments": { "primary": string, "secondary"?: string, "tertiary"?: string },
  "businessModel": "lead-gen"|"affiliate"|"ecommerce"|"saas"|"local-service"|"publisher"|"marketplace",
  "intentSatisfactionThreshold": { "depth": "shallow"|"moderate"|"deep"|"exhaustive", "description": string },
  "freshnessRequirement": "evergreen"|"seasonal"|"time-sensitive"|"trending"
}

Guidelines:
- Search intent: Determine the dominant intent. Use "mixed" only when genuinely ambiguous.
- Query completeness: Detect missing qualifiers like audience (who?), location (where?), budget (how much?), experience level, timeframe, use-case.
- Audience segments: Define who would search this query. Be specific (not just "general public").
- Business model: What business purpose does this page serve?
- Depth threshold: How deep must the content go to satisfy the searcher? "shallow" = quick answer, "exhaustive" = comprehensive guide.
- Freshness: Does this topic involve prices, laws, statistics, trends, or other time-sensitive data?`,
      },
      {
        role: "user",
        content: `Query/Topic: ${params.topic}\nPage Type: ${params.pageType}\nNiche: ${params.niche}${params.location ? `\nLocation: ${params.location}` : ""}${params.clientName ? `\nClient: ${params.clientName}` : ""}\n\n${keywordContext}\n\n${competitorContext}\n\n${gapContext}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = safeParseJSON<QueryPreAnalysis>(content);

  return {
    searchIntent: parsed.searchIntent || "informational",
    queryType: parsed.queryType || "mid-tail",
    queryCompleteness: parsed.queryCompleteness || { isComplete: true, missingQualifiers: [] },
    audienceSegments: parsed.audienceSegments || { primary: "general audience" },
    businessModel: parsed.businessModel || "local-service",
    intentSatisfactionThreshold: parsed.intentSatisfactionThreshold || { depth: "moderate", description: "Standard coverage" },
    freshnessRequirement: parsed.freshnessRequirement || "evergreen",
  };
}

// --- Step 5: SERP Pattern Analysis ---

async function stepSerpAnalysis(
  keywordData: KeywordResearchResult | null,
  competitorDataset: CompetitorDataset
): Promise<SerpAnalysis> {
  if (!keywordData) {
    return {
      consensusCoverage: [],
      serpGaps: [],
      compressionPatterns: [],
      featuredSnippetOpportunities: [],
      aiOverviewPresence: false,
      serpFeaturePresence: { imagePack: false, video: false, maps: false, forums: false, paa: false, knowledgePanel: false },
      autocompleteVariations: [],
    };
  }

  const competitorHeadings = keywordData.competitors
    .filter((c) => c.headings.length > 0)
    .map((c) => `${c.title} (pos ${c.serpPosition}):\n  ${c.headings.join("\n  ")}`)
    .join("\n\n");

  const serpFeatures = keywordData.serp.features.join(", ") || "none detected";
  const paaQuestions = keywordData.paa.join("\n- ") || "none";

  // Include bulk SERP data if available
  const bulkSerp = (keywordData as KeywordResearchResult & { bulkSerp?: SerpOverview[] }).bulkSerp;
  const bulkSerpContext = bulkSerp
    ? `\nBulk SERP features for related keywords:\n${bulkSerp.map((s) => `${s.keyword}: ${s.features.join(", ") || "none"}`).join("\n")}`
    : "";

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 3000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a SERP analysis expert. Analyze the SERP data and competitor headings to identify patterns, consensus, and gaps.

Return JSON:
{
  "consensusCoverage": string[],
  "serpGaps": string[],
  "compressionPatterns": string[],
  "featuredSnippetOpportunities": [{ "query": string, "currentFormat": string, "strategy": string }],
  "aiOverviewPresence": boolean,
  "serpFeaturePresence": { "imagePack": boolean, "video": boolean, "maps": boolean, "forums": boolean, "paa": boolean, "knowledgePanel": boolean },
  "autocompleteVariations": string[]
}

Guidelines:
- consensusCoverage: Topics that ALL or nearly all top-ranking pages cover. These are minimum requirements.
- serpGaps: Angles, entities, or subtopics that competitors miss or cover shallowly. These are differentiation opportunities.
- compressionPatterns: Overused shallow sections competitors repeat without adding value (e.g., generic "Why choose us" sections with no specifics).
- featuredSnippetOpportunities: Queries that currently have featured snippets or could trigger them. Identify the format (paragraph, list, table) and a targeting strategy.
- aiOverviewPresence: Whether the SERP features suggest AI Overviews are present.
- serpFeaturePresence: Which SERP features are present across the keyword set.
- autocompleteVariations: Related query variations users might also search.`,
      },
      {
        role: "user",
        content: `Primary keyword: ${keywordData.primary.keyword}\nSERP features: ${serpFeatures}\n\nPeople Also Ask:\n- ${paaQuestions}\n\nCompetitor heading structures:\n${competitorHeadings || "No competitor headings available"}${bulkSerpContext}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = safeParseJSON<SerpAnalysis>(content);

  return {
    consensusCoverage: parsed.consensusCoverage || [],
    serpGaps: parsed.serpGaps || [],
    compressionPatterns: parsed.compressionPatterns || [],
    featuredSnippetOpportunities: parsed.featuredSnippetOpportunities || [],
    aiOverviewPresence: parsed.aiOverviewPresence || false,
    serpFeaturePresence: parsed.serpFeaturePresence || { imagePack: false, video: false, maps: false, forums: false, paa: false, knowledgePanel: false },
    autocompleteVariations: parsed.autocompleteVariations || [],
  };
}

// --- Step 6: Deep Competitor Analysis ---

async function stepDeepCompetitorAnalysis(
  keywordData: KeywordResearchResult | null,
  competitorDataset: CompetitorDataset
): Promise<DeepCompetitorAnalysisResult> {
  if (!keywordData || keywordData.competitors.length === 0) {
    return { competitors: [], crossCompetitorEntities: [], gapKeywords: [] };
  }

  const competitorDetails = keywordData.competitors.slice(0, 5).map((c) => {
    const domain = extractDomainFromUrl(c.url);
    const rankingKeywords = competitorDataset.competitorKeywords?.get(domain);
    return {
      url: c.url,
      title: c.title,
      headings: c.headings,
      wordCount: c.wordCount,
      serpPosition: c.serpPosition,
      rankingKeywords: rankingKeywords
        ? rankingKeywords.slice(0, 15).map((k) => `${k.keyword} (${k.volume}/mo)`)
        : [],
    };
  });

  const gapContext = competitorDataset.gapKeywords
    ? `\nKeyword gap opportunities (keywords competitors rank for but client does not):\n${competitorDataset.gapKeywords.slice(0, 15).map((k) => `${k.keyword} (${k.volume}/mo)`).join("\n")}`
    : "";

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a competitive content analyst. Review each competitor individually and produce a detailed analysis.

Return JSON:
{
  "competitors": [{
    "url": string,
    "title": string,
    "serpPosition": number,
    "headingDepth": { "h1": number, "h2": number, "h3": number, "h4": number, "maxDepth": number },
    "contentDesignPatterns": string[],
    "strengths": string[],
    "weaknesses": string[],
    "topicalArchitecture": string[],
    "entityCoverage": string[],
    "rankingKeywords": string[]
  }],
  "crossCompetitorEntities": string[],
  "gapKeywords": string[]
}

Guidelines:
- Analyze EACH competitor individually, not collectively.
- headingDepth: Count headings at each level based on their heading structure. maxDepth is the deepest heading level used.
- contentDesignPatterns: Infer from headings whether they use tables, comparisons, calculators, lists, maps, FAQs, visuals, statistics, or examples.
- strengths: What does this competitor do well topically?
- weaknesses: Where does coverage stop? Missing entities, shallow explanations, outdated angles, generic sections.
- topicalArchitecture: The main topic clusters/sections the competitor covers.
- entityCoverage: Key entities (people, places, concepts, services) the competitor mentions.
- crossCompetitorEntities: Entities that appear across most competitors (shared semantic expectations).
- gapKeywords: Keywords from gap analysis that represent content opportunities.`,
      },
      {
        role: "user",
        content: `Competitors to analyze:\n${competitorDetails.map((c, i) => `\n--- Competitor ${i + 1}: ${c.title} (Position #${c.serpPosition}) ---\nURL: ${c.url}\nWord Count: ${c.wordCount || "unknown"}\nHeadings: ${c.headings.length > 0 ? c.headings.join(" | ") : "none available"}\n${c.rankingKeywords.length > 0 ? `Ranking keywords: ${c.rankingKeywords.join(", ")}` : ""}`).join("\n")}${gapContext}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = safeParseJSON<DeepCompetitorAnalysisResult>(content);

  return {
    competitors: parsed.competitors || [],
    crossCompetitorEntities: parsed.crossCompetitorEntities || [],
    gapKeywords: parsed.gapKeywords || [],
  };
}

// ============================================================
// PHASE C: CONSTRUCTION
// ============================================================

// --- Step 7: Contextual Vectors + Entities + Topical Map ---

async function stepContextualVectors(
  params: BriefGenParams,
  keywordData: KeywordResearchResult | null,
  knowledgeContext: KnowledgeContext,
  queryPreAnalysis: QueryPreAnalysis,
  serpAnalysis: SerpAnalysis,
  deepCompetitors: DeepCompetitorAnalysisResult
): Promise<{ contextualVectors: string[]; entityMap: EntityMapping[]; topicalMap: TopicalMapEntry[] }> {
  const ragContext = [
    ...knowledgeContext.pageTypeChunks.slice(0, 4),
    ...knowledgeContext.strategyChunks.slice(0, 2),
  ]
    .map((c) => `[${c.category}] ${c.title}: ${c.content.slice(0, 300)}`)
    .join("\n\n");

  const keywordContext = keywordData
    ? `Primary keyword: ${keywordData.primary.keyword} (${keywordData.primary.volume}/mo)\nRelated: ${keywordData.related.slice(0, 10).map((k) => `${k.keyword} (${k.volume})`).join(", ")}\nPAA: ${keywordData.paa.slice(0, 5).join("; ")}`
    : "";

  const analysisContext = `Search Intent: ${queryPreAnalysis.searchIntent}
Query Type: ${queryPreAnalysis.queryType}
Depth Required: ${queryPreAnalysis.intentSatisfactionThreshold.depth} — ${queryPreAnalysis.intentSatisfactionThreshold.description}
Audience: ${queryPreAnalysis.audienceSegments.primary}${queryPreAnalysis.audienceSegments.secondary ? `, ${queryPreAnalysis.audienceSegments.secondary}` : ""}
Business Model: ${queryPreAnalysis.businessModel}
SERP Consensus: ${serpAnalysis.consensusCoverage.slice(0, 8).join(", ") || "none identified"}
SERP Gaps: ${serpAnalysis.serpGaps.slice(0, 5).join(", ") || "none identified"}
Cross-competitor entities: ${deepCompetitors.crossCompetitorEntities.slice(0, 10).join(", ") || "none identified"}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a semantic SEO content strategist. Given a topic and comprehensive analysis data, identify:

1. Contextual Vectors: 8-15 topical coverage areas that a comprehensive page must address. Each vector is a short phrase (3-6 words). Include vectors for SERP consensus topics AND gap opportunities.

2. Entity Map: Key entities with their type, relevance, and whether they are explicitly mentioned in the query or implicitly expected.

3. Topical Map: How this page connects to the broader topical graph. Include the root topic, supporting topics, adjacent topics, and downstream pages.

Return JSON:
{
  "contextualVectors": string[],
  "entityMap": [{ "entity": string, "type": string, "relevance": "primary"|"secondary"|"contextual" }],
  "topicalMap": [{ "topic": string, "relationship": "root"|"supporting"|"adjacent"|"downstream", "suggestedPageType"?: string, "clusterLabel"?: string }]
}`,
      },
      {
        role: "user",
        content: `Topic: ${params.topic}\nPage Type: ${params.pageType}\nNiche: ${params.niche}${params.location ? `\nLocation: ${params.location}` : ""}${params.clientName ? `\nClient: ${params.clientName}` : ""}\n\n${keywordContext}\n\nAnalysis:\n${analysisContext}\n\nRelevant Knowledge:\n${ragContext}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = safeParseJSON(content) as {
    contextualVectors?: string[];
    entityMap?: EntityMapping[];
    topicalMap?: TopicalMapEntry[];
  };

  return {
    contextualVectors: parsed.contextualVectors || [],
    entityMap: (parsed.entityMap || []).map((e) => ({
      entity: e.entity,
      type: e.type || "concept",
      relevance: e.relevance || "secondary",
    })),
    topicalMap: (parsed.topicalMap || []).map((t) => ({
      topic: t.topic,
      relationship: t.relationship || "supporting",
      suggestedPageType: t.suggestedPageType,
      clusterLabel: t.clusterLabel,
    })),
  };
}

// --- Step 8: Heading Hierarchy + Title Tag ---

async function stepHierarchyAndTitle(
  params: BriefGenParams,
  contextualVectors: string[],
  topicalMap: TopicalMapEntry[],
  keywordData: KeywordResearchResult | null,
  knowledgeContext: KnowledgeContext,
  queryPreAnalysis: QueryPreAnalysis,
  serpAnalysis: SerpAnalysis,
  deepCompetitors: DeepCompetitorAnalysisResult
): Promise<{ rawHeadings: Array<{ level: number; text: string }>; titleTag: TitleTagData }> {
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

  const competitorWeaknesses = deepCompetitors.competitors
    .filter((c) => c.weaknesses.length > 0)
    .map((c) => `${c.title}: ${c.weaknesses.join("; ")}`)
    .join("\n");

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a semantic SEO heading architect. Build a comprehensive H1-H4 heading structure AND a title tag for a ${params.pageType} page.

HEADING RULES (STRICTLY ENFORCED — violations will be rejected):
- The FIRST heading MUST be level 1 (H1). Exactly 1 H1. This is non-negotiable.
- Minimum 15 total headings. Aim for 20-35 headings for comprehensive coverage.
- 5-12 H2s covering all contextual vectors
- H3s under H2s for subtopics, questions, or list items
- H4s sparingly for deep detail
- Valid nesting only: H1 → H2 → H3 → H4. Never skip levels (no H1 → H3, no H2 → H4).
- Progressive depth: foundational understanding → advanced depth
- Each heading must satisfy a unique intent layer (no duplicate intent)
- Headings must flow logically — each leads naturally to the next
- Include edge cases, negative attributes (e.g., risks, downsides), and decision-making factors where relevant
- Use question-based headings only where PAA opportunities exist naturally
- Natural, search-friendly text — not keyword-stuffed
- Cover SERP consensus topics (minimum requirements) AND SERP gaps (differentiation)
- Address competitor weaknesses with stronger coverage

CRITICAL: Your output MUST start with exactly one H1 heading (level: 1), followed by H2s and their children. If you return headings that don't start with H1 or have fewer than 15 total, the output will be rejected.

TITLE TAG RULES:
- Must reflect the dominant search intent with contextual precision
- If the query has low search demand, include up to 3 contextual attributes for specificity
- If the query has strong demand and semantic clarity, keep the title focused without extra modifiers

Return JSON:
{
  "headings": [{ "level": 1|2|3|4, "text": string }],
  "titleTag": { "titleTag": string, "contextualAttributes": string[], "rationale": string }
}`,
      },
      {
        role: "user",
        content: `Topic: ${params.topic}\nPage Type: ${params.pageType}${params.location ? `\nLocation: ${params.location}` : ""}${params.clientName ? `\nClient: ${params.clientName}` : ""}

Search Intent: ${queryPreAnalysis.searchIntent} | Query Type: ${queryPreAnalysis.queryType}
Depth Required: ${queryPreAnalysis.intentSatisfactionThreshold.depth}
Audience: ${queryPreAnalysis.audienceSegments.primary}${queryPreAnalysis.audienceSegments.secondary ? `, ${queryPreAnalysis.audienceSegments.secondary}` : ""}
Business Model: ${queryPreAnalysis.businessModel}

Contextual Vectors:
- ${contextualVectors.join("\n- ")}

SERP Consensus (must cover):
${serpAnalysis.consensusCoverage.slice(0, 10).join("\n- ") || "none identified"}

SERP Gaps (differentiation opportunities):
${serpAnalysis.serpGaps.slice(0, 8).join("\n- ") || "none identified"}

Competitor Weaknesses:
${competitorWeaknesses || "none identified"}

${paaQuestions ? `People Also Ask:\n- ${paaQuestions}\n` : ""}
${competitorHeadings ? `Competitor Headings:\n${competitorHeadings}\n` : ""}
${briefExamples ? `Similar Brief Examples:\n${briefExamples}` : ""}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = safeParseJSON(content) as {
    headings?: Array<{ level: number; text: string }>;
    titleTag?: TitleTagData;
  };

  let headings = parsed.headings || [];

  // --- Structural enforcement (hard rules) ---

  // Ensure exactly 1 H1 at the start
  const h1Count = headings.filter((h) => h.level === 1).length;
  if (h1Count === 0) {
    // Prepend an H1 from the topic
    headings = [{ level: 1, text: params.topic }, ...headings];
  } else if (h1Count > 1) {
    // Demote extra H1s to H2
    let seenH1 = false;
    headings = headings.map((h) => {
      if (h.level === 1) {
        if (seenH1) return { ...h, level: 2 };
        seenH1 = true;
      }
      return h;
    });
  }

  // Ensure first heading is H1
  if (headings.length > 0 && headings[0].level !== 1) {
    headings = [{ level: 1, text: params.topic }, ...headings];
  }

  // Fix invalid nesting: no skipping levels (H1→H3 becomes H1→H2)
  let maxAllowed = 1;
  headings = headings.map((h) => {
    if (h.level > maxAllowed + 1) {
      return { ...h, level: maxAllowed + 1 };
    }
    maxAllowed = Math.max(maxAllowed, h.level);
    return h;
  });

  // Warn if too few headings (but don't block — the LLM might have a reason)
  if (headings.length < 10) {
    console.warn(`[Step 8] Only ${headings.length} headings generated for "${params.topic}" — expected 15+`);
  }

  return {
    rawHeadings: headings,
    titleTag: parsed.titleTag || {
      titleTag: params.topic,
      contextualAttributes: [],
      rationale: "Default title from topic",
    },
  };
}

// --- Step 9: Structure Instructions + Query Mapping (merged) ---

async function stepStructureAndQueryMapping(
  params: BriefGenParams,
  rawHeadings: Array<{ level: number; text: string }>,
  keywordData: KeywordResearchResult | null,
  deepCompetitors: DeepCompetitorAnalysisResult
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

  // Build keyword list for query mapping
  const allKeywords = keywordData
    ? [keywordData.primary, ...keywordData.related].filter((k) => k.volume > 0)
    : [];

  const keywordList = allKeywords
    .slice(0, 30)
    .map((k) => `${k.keyword} (${k.volume}/mo${k.intent ? `, ${k.intent}` : ""})`)
    .join("\n");

  // Extract competitor design patterns for reference
  const designPatterns = deepCompetitors.competitors
    .filter((c) => c.contentDesignPatterns.length > 0)
    .map((c) => `${c.title}: ${c.contentDesignPatterns.join(", ")}`)
    .join("\n");

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a semantic SEO brief writer. For each heading, generate structure instructions AND map keywords. This is a combined step.

For each heading provide:
1. structureInstructions: Concise instruction (1-2 sentences) on what to write and how
2. ruleCodes: Which writing rule codes apply (e.g., "FS", "PAA", "NER", "TF-IDF")
3. intent: One sentence on what this section should accomplish
4. wordCountTarget: Suggested word count (50-300 per section)
5. targetQueries: Keywords mapped to this heading by semantic relevance (0-5 per heading)
6. serpFeatures: Which SERP features this heading could target (FS, PAA, KP, LC)
7. contentDesignPattern: Suggested content format ("paragraph"|"table"|"comparison"|"list"|"visual")
8. snippetTarget: Whether this heading should be optimized for featured snippets (boolean)
9. paaTarget: Whether this heading answers a People Also Ask question (boolean)

Rules:
- Assign the primary keyword to the H1
- Distribute remaining keywords to the most relevant H2/H3/H4 headings
- Keep structureInstructions SHORT — max 2 sentences

Reference these content writing rules when assigning rule codes:
${coreRules.slice(0, 1500)}

Return JSON:
{
  "headings": [{
    "level": number, "text": string, "structureInstructions": string,
    "ruleCodes": string[], "intent": string, "wordCountTarget": number,
    "targetQueries": [{ "query": string, "volume": number, "intent": string }],
    "serpFeatures": string[],
    "contentDesignPattern": string, "snippetTarget": boolean, "paaTarget": boolean
  }]
}`,
      },
      {
        role: "user",
        content: `Topic: ${params.topic}\nPage Type: ${params.pageType}\nNiche: ${params.niche}\n\nHeadings to annotate:\n${rawHeadings.map((h) => `${"#".repeat(h.level)} ${h.text}`).join("\n")}\n\n${keywordList ? `Keywords to map:\n${keywordList}\n` : ""}${designPatterns ? `\nCompetitor design patterns for reference:\n${designPatterns}\n` : ""}${ruleContext ? `\nRule Application Examples:\n${ruleContext}` : ""}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = safeParseJSON(content) as {
    headings?: Array<{
      level: number;
      text: string;
      structureInstructions: string;
      ruleCodes: string[];
      intent: string;
      wordCountTarget: number;
      targetQueries: QueryEntry[];
      serpFeatures: string[];
      contentDesignPattern: string;
      snippetTarget: boolean;
      paaTarget: boolean;
    }>;
  };

  return (parsed.headings || rawHeadings).map((h, i) => ({
    level: ((h.level as 1 | 2 | 3 | 4) || 2),
    text: h.text,
    structureInstructions: (h as { structureInstructions?: string }).structureInstructions || "",
    targetQueries: (h as { targetQueries?: QueryEntry[] }).targetQueries || [],
    serpFeatures: (h as { serpFeatures?: string[] }).serpFeatures || [],
    ruleCodes: (h as { ruleCodes?: string[] }).ruleCodes || [],
    intent: (h as { intent?: string }).intent || "",
    wordCountTarget: (h as { wordCountTarget?: number }).wordCountTarget,
    contentDesignPattern: (h as { contentDesignPattern?: string }).contentDesignPattern,
    snippetTarget: (h as { snippetTarget?: boolean }).snippetTarget,
    paaTarget: (h as { paaTarget?: boolean }).paaTarget,
  }));
}

// --- Step 10: Connection Mapping ---

async function stepConnectionMapping(
  params: BriefGenParams,
  headings: EnhancedHeading[],
  topicalMap: TopicalMapEntry[]
): Promise<ConnectionEntry[]> {
  const headingList = headings
    .map((h) => `${"#".repeat(h.level)} ${h.text}`)
    .join("\n");

  const topicalMapContext = topicalMap.length > 0
    ? `\nTopical Map (broader site architecture):\n${topicalMap.map((t) => `- ${t.topic} (${t.relationship}${t.suggestedPageType ? `, ${t.suggestedPageType} page` : ""})`).join("\n")}`
    : "";

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an internal linking strategist. Given a page's heading structure and the broader topical map, suggest 3-8 internal linking opportunities. Each link connects a heading on this page to another page that should exist on the site.

Use the topical map to ensure links connect to actual related topics in the site architecture, not arbitrary pages.

Return JSON: { "connections": [{ "fromHeading": string, "toPage": string, "anchorText": string, "reason": string }] }`,
      },
      {
        role: "user",
        content: `Topic: ${params.topic}\nPage Type: ${params.pageType}${params.clientName ? `\nClient: ${params.clientName}` : ""}${params.domain ? `\nDomain: ${params.domain}` : ""}\n\nHeadings:\n${headingList}${topicalMapContext}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = safeParseJSON(content) as {
    connections?: ConnectionEntry[];
  };

  return (parsed.connections || []).map((c) => ({
    fromHeading: c.fromHeading,
    toPage: c.toPage,
    anchorText: c.anchorText,
    reason: c.reason,
  }));
}

// ============================================================
// PHASE D: VALIDATION
// ============================================================

// --- Step 11: Heading Validation ---

async function stepHeadingValidation(
  headings: EnhancedHeading[],
  queryPreAnalysis: QueryPreAnalysis
): Promise<HeadingValidation> {
  const headingList = headings
    .map((h, i) => `${i}. ${"#".repeat(h.level)} ${h.text} — intent: ${h.intent}`)
    .join("\n");

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.2,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a heading quality validator. Evaluate the heading structure against these criteria:

STRUCTURAL REQUIREMENTS (automatic failure if violated):
- Must have exactly 1 H1 as the first heading
- Must have at least 15 total headings (5 headings is far too few for any page)
- Valid nesting: H1 → H2 → H3 → H4 (no skipping levels like H1 → H3)
- If any structural requirement is violated, score MUST be ≤ 4 and correctedHeadings MUST be provided.

QUALITY CRITERIA:
1. Contextual continuity: Does each heading logically lead to the next?
2. Unique intent: Does each heading satisfy a distinct intent layer? No two headings should answer the same question.
3. Semantic repetition: Are any headings saying the same thing differently?
4. Progressive depth: Do H2→H3→H4 go deeper into the topic, not sideways?
5. Edge case coverage: Are edge cases and exception scenarios addressed?
6. Negative attribute coverage: Does the page include balanced perspective (e.g., "safest areas" should also mention areas to avoid)?
7. Syntactic clarity: Are headings clear, natural, and free from awkward grammar?
8. Sufficient coverage: Are there enough headings to comprehensively cover the topic? A service page needs 20-35 headings.

Return JSON:
{
  "score": number (1-10, where 10 is perfect),
  "issues": [{
    "headingIndex": number,
    "headingText": string,
    "issueType": "semantic-repetition"|"missing-unique-intent"|"continuity-break"|"depth-regression"|"edge-case-missing"|"syntactic-unclear"|"negative-attribute-missing"|"missing-h1"|"insufficient-headings"|"invalid-nesting",
    "severity": "low"|"medium"|"high",
    "description": string,
    "suggestedFix": string
  }],
  "correctedHeadings": [{ "level": number, "text": string, "structureInstructions": string, "targetQueries": [], "serpFeatures": [], "ruleCodes": [], "intent": string, "wordCountTarget": number }]
}

IMPORTANT: Only include "correctedHeadings" if score < 8. If score >= 8, omit correctedHeadings entirely.
When providing correctedHeadings, preserve the original heading data (targetQueries, serpFeatures, ruleCodes, etc.) and only modify text, level, or intent as needed.`,
      },
      {
        role: "user",
        content: `Search Intent: ${queryPreAnalysis.searchIntent}
Query Type: ${queryPreAnalysis.queryType}
Audience: ${queryPreAnalysis.audienceSegments.primary}
Depth Required: ${queryPreAnalysis.intentSatisfactionThreshold.depth}

Headings to validate:
${headingList}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = safeParseJSON<HeadingValidation>(content);

  // If corrected headings are provided, merge with original heading data
  let correctedHeadings: EnhancedHeading[] | undefined;
  if (parsed.correctedHeadings && parsed.score < 8) {
    correctedHeadings = parsed.correctedHeadings.map((corrected, i) => {
      const original = headings[i];
      if (!original) return corrected as EnhancedHeading;
      return {
        ...original,
        level: (corrected.level as 1 | 2 | 3 | 4) || original.level,
        text: corrected.text || original.text,
        intent: corrected.intent || original.intent,
        structureInstructions: corrected.structureInstructions || original.structureInstructions,
      };
    });
  }

  return {
    score: parsed.score || 8,
    issues: parsed.issues || [],
    correctedHeadings,
  };
}

// --- Step 12: Brief Quality Scoring ---

async function stepQualityScoring(
  contextualVectors: string[],
  headings: EnhancedHeading[],
  entityMap: EntityMapping[],
  queryPreAnalysis: QueryPreAnalysis,
  serpAnalysis: SerpAnalysis,
  deepCompetitors: DeepCompetitorAnalysisResult
): Promise<BriefQualityReport> {
  const headingSummary = headings
    .map((h) => `${"#".repeat(h.level)} ${h.text}`)
    .join("\n");

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.2,
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a content brief quality assessor. Evaluate the brief against competitors and intent requirements.

Return JSON:
{
  "overallScore": number (0-100),
  "breakdown": {
    "competitorCoverage": number (0-100),
    "intentSatisfaction": number (0-100),
    "semanticCoherence": number (0-100),
    "entityCompleteness": number (0-100),
    "headingQuality": number (0-100)
  },
  "knowledgeGaps": string[],
  "recommendations": string[]
}

Scoring criteria:
- competitorCoverage: Does the brief cover everything top competitors cover, plus more?
- intentSatisfaction: Does the brief structure satisfy the identified search intent?
- semanticCoherence: Do vectors, entities, headings, and queries form a coherent semantic system?
- entityCompleteness: Are all important entities from the topic and competitors represented?
- headingQuality: Are headings well-structured, progressive, and natural?
- knowledgeGaps: Contextual vectors NOT adequately covered by any heading.
- recommendations: 3-5 actionable improvement suggestions.`,
      },
      {
        role: "user",
        content: `Search Intent: ${queryPreAnalysis.searchIntent}
Depth Required: ${queryPreAnalysis.intentSatisfactionThreshold.depth}
Audience: ${queryPreAnalysis.audienceSegments.primary}

Contextual Vectors:
${contextualVectors.join(", ")}

Entity Map (${entityMap.length} entities):
${entityMap.slice(0, 15).map((e) => `${e.entity} (${e.type}, ${e.relevance})`).join(", ")}

Headings:
${headingSummary}

SERP Consensus (topics all competitors cover):
${serpAnalysis.consensusCoverage.join(", ") || "none identified"}

SERP Gaps (opportunities):
${serpAnalysis.serpGaps.join(", ") || "none identified"}

Competitor strengths to match:
${deepCompetitors.competitors.slice(0, 3).map((c) => `${c.title}: ${c.strengths.join("; ")}`).join("\n")}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = safeParseJSON<BriefQualityReport>(content);

  return {
    overallScore: parsed.overallScore || 70,
    breakdown: {
      competitorCoverage: parsed.breakdown?.competitorCoverage || 70,
      intentSatisfaction: parsed.breakdown?.intentSatisfaction || 70,
      semanticCoherence: parsed.breakdown?.semanticCoherence || 70,
      entityCompleteness: parsed.breakdown?.entityCompleteness || 70,
      headingQuality: parsed.breakdown?.headingQuality || 70,
    },
    knowledgeGaps: parsed.knowledgeGaps || [],
    recommendations: parsed.recommendations || [],
  };
}

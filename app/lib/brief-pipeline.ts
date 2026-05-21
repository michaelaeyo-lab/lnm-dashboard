import "server-only";
import OpenAI from "openai";
import {
  retrieveSimilarBriefs,
  retrieveRuleExamples,
  retrieveAcrossPools,
  retrieveForPageType,
  retrieveForAgent,
  retrieveMethodology,
  retrieveStepKnowledge,
} from "./retrieval";
import type { RetrievedChunk } from "./retrieval";
import { getCoreRules, getRulesForPageType, type PageType } from "./writing-rules/core";
import { STRUCTURE_PATTERNS, type StructurePatternId } from "./writing-rules/structure-patterns";
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
  GoldStandardCrossRef,
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

// --- Step-to-Methodology RAG Mapping ---

interface StepRagSpec {
  methodologyQuery: string;
  domainCategories: string[];
  domainQuery: string;
}

const STEP_RAG_SPECS: Record<number, StepRagSpec> = {
  1: {
    methodologyQuery: "keyword research intent analysis query type classification entity extraction",
    domainCategories: ["01-semantic-seo", "03-content-strategy"],
    domainQuery: "keyword research intent analysis query classification semantic SEO",
  },
  4: {
    methodologyQuery: "search intent classification audience segmentation business model query completeness freshness",
    domainCategories: ["01-semantic-seo", "03-content-strategy"],
    domainQuery: "search intent classification query categorization user intent SERP designing holistic SEO",
  },
  5: {
    methodologyQuery: "SERP analysis consensus coverage gap identification featured snippets PAA autocomplete compression patterns",
    domainCategories: ["05-on-page-seo", "01-semantic-seo"],
    domainQuery: "SERP analysis heading patterns consensus coverage gaps featured snippets AI overview",
  },
  6: {
    methodologyQuery: "competitor analysis heading depth content design patterns entity relationships topical architecture weaknesses",
    domainCategories: ["05-on-page-seo", "02-topical-authority", "13-case-studies"],
    domainQuery: "competitor heading depth content patterns entity relationships weakness analysis topical architecture",
  },
  7: {
    methodologyQuery: "entity extraction contextual vectors topical map primary secondary entities attributes predicates semantic dependencies",
    domainCategories: ["01-semantic-seo", "02-topical-authority", "18-content-writing-rules"],
    domainQuery: "entity oriented SEO knowledge graph co-occurrence topical map entity attributes semantic relationships NLP",
  },
  8: {
    methodologyQuery: "heading hierarchy structure foundation to depth contextual continuity unique intent per heading question vs declarative edge cases",
    domainCategories: ["18-content-writing-rules", "19-brief-examples"],
    domainQuery: "heading hierarchy structure progression contextual continuity writing rules",
  },
  9: {
    methodologyQuery: "structure patterns writing rules information gain query mapping topical completeness factual validation non-SERP sources",
    domainCategories: ["18-content-writing-rules", "19-brief-examples"],
    domainQuery: "structure patterns writing rules query mapping information gain semantic system",
  },
  10: {
    methodologyQuery: "internal linking topical connections supporting adjacent downstream pages contextual relationships",
    domainCategories: ["02-topical-authority", "08-off-page-and-link-building"],
    domainQuery: "internal linking topical connections page relationships contextual structure",
  },
  11: {
    methodologyQuery: "heading validation fluff removal semantic repetition topical focus syntactic precision unique intent",
    domainCategories: ["18-content-writing-rules"],
    domainQuery: "heading validation semantic repetition fluff removal topical focus natural language",
  },
  12: {
    methodologyQuery: "brief quality contextual depth entity relationships completeness usefulness surpass competitors intent satisfaction",
    domainCategories: ["19-brief-examples", "17-strategy-blueprints"],
    domainQuery: "brief quality scoring contextual depth entity completeness practical usefulness",
  },
};

/**
 * Retrieve methodology + domain knowledge for a pipeline step.
 * Returns formatted sections to inject into GPT-4o system prompts.
 */
async function getStepMethodologyContext(stepNum: number, topicContext?: string): Promise<string> {
  const spec = STEP_RAG_SPECS[stepNum];
  if (!spec) return "";

  try {
    const [methodologyChunks, domainChunks] = await Promise.all([
      retrieveMethodology(spec.methodologyQuery, 4),
      retrieveStepKnowledge(
        topicContext ? `${spec.domainQuery} ${topicContext}` : spec.domainQuery,
        spec.domainCategories,
        4
      ),
    ]);

    const sections: string[] = [];

    if (methodologyChunks.length > 0) {
      const methodText = methodologyChunks
        .map((c) => c.content.slice(0, 600))
        .join("\n\n");
      sections.push(`## METHODOLOGY (follow these instructions exactly)\n${methodText}`);
    }

    if (domainChunks.length > 0) {
      const domainText = domainChunks
        .map((c) => `[${c.title}]: ${c.content.slice(0, 400)}`)
        .join("\n\n");
      sections.push(`## DOMAIN KNOWLEDGE (reference material)\n${domainText}`);
    }

    if (sections.length > 0) {
      console.log(`  [RAG Step ${stepNum}] Retrieved ${methodologyChunks.length} methodology + ${domainChunks.length} domain chunks`);
    }

    return sections.join("\n\n---\n\n");
  } catch (err) {
    console.warn(`  [RAG Step ${stepNum}] Retrieval failed, proceeding without:`, err);
    return "";
  }
}

// --- Step-Level Output Validation ---

interface StepValidationResult {
  valid: boolean;
  missing: string[];
}

/**
 * Validate that a pipeline step produced the artifacts the methodology requires.
 * Returns { valid, missing[] }. Logs PASS or WARN per step.
 */
function validateStepOutput(stepNum: number, output: unknown): StepValidationResult {
  const missing: string[] = [];
  const o = output as Record<string, unknown>;

  switch (stepNum) {
    case 4: {
      // Query Pre-Analysis
      if (!o.searchIntent || typeof o.searchIntent !== "string" || o.searchIntent.trim() === "")
        missing.push("searchIntent");
      if (!o.queryType || typeof o.queryType !== "string" || o.queryType.trim() === "")
        missing.push("queryType");
      const aud = o.audienceSegments as Record<string, unknown> | undefined;
      if (!aud || !aud.primary || typeof aud.primary !== "string" || (aud.primary as string).trim() === "")
        missing.push("audienceSegments.primary");
      if (!o.businessModel || typeof o.businessModel !== "string" || o.businessModel.trim() === "")
        missing.push("businessModel");
      break;
    }

    case 5: {
      // SERP Analysis
      const cc = o.consensusCoverage;
      if (!Array.isArray(cc) || cc.length < 1)
        missing.push("consensusCoverage (need ≥1 item)");
      if (!o.serpFeaturePresence || typeof o.serpFeaturePresence !== "object")
        missing.push("serpFeaturePresence");
      break;
    }

    case 6: {
      // Deep Competitor Analysis — deep checks per Sardar's methodology
      const comps = (o.competitors as Record<string, unknown>[]) || [];
      if (comps.length === 0) {
        missing.push("competitors (empty array)");
      } else {
        for (const comp of comps) {
          const title = (comp.title as string) || "unknown";
          const depthIssues: string[] = [];

          // headingDepth must be an object with real breakdown
          const hd = comp.headingDepth as Record<string, unknown> | undefined;
          if (!hd || typeof hd !== "object") {
            depthIssues.push("headingDepth missing");
          } else {
            const maxD = (hd.maxDepth as number) || 0;
            if (maxD <= 0) depthIssues.push("headingDepth.maxDepth ≤ 0");
          }

          // contentDesignPatterns: ≥2 unique, not just "paragraph" repeated
          const patterns = (comp.contentDesignPatterns as string[]) || [];
          const uniquePatterns = new Set(patterns.map((p) => p.toLowerCase().trim()));
          if (uniquePatterns.size < 2)
            depthIssues.push(`contentDesignPatterns has <2 unique patterns (got ${uniquePatterns.size})`);

          // strengths: ≥2 items, each ≥10 chars
          const strengths = (comp.strengths as string[]) || [];
          const validStrengths = strengths.filter((s) => typeof s === "string" && s.trim().length >= 10);
          if (validStrengths.length < 2)
            depthIssues.push(`strengths has <2 substantive items (got ${validStrengths.length})`);

          // weaknesses: ≥2 items, each ≥10 chars
          const weaknesses = (comp.weaknesses as string[]) || [];
          const validWeaknesses = weaknesses.filter((s) => typeof s === "string" && s.trim().length >= 10);
          if (validWeaknesses.length < 2)
            depthIssues.push(`weaknesses has <2 substantive items (got ${validWeaknesses.length})`);

          // topicalArchitecture or headingAnalysis with real structure data
          const tArch = (comp.topicalArchitecture as string[]) || [];
          if (tArch.length === 0)
            depthIssues.push("topicalArchitecture empty (no structure data)");

          if (depthIssues.length >= 2) {
            missing.push(`Competitor '${title}' analysis lacks depth — missing: ${depthIssues.join(", ")}`);
          }
        }
      }

      // crossCompetitorEntities ≥3
      const cce = (o.crossCompetitorEntities as string[]) || [];
      if (cce.length < 3)
        missing.push(`crossCompetitorEntities (need ≥3, got ${cce.length})`);

      // gapKeywords field must exist (even if empty)
      if (!("gapKeywords" in o))
        missing.push("gapKeywords field missing");
      break;
    }

    case 7: {
      // Contextual Vectors + Entities + Topical Map
      const cv = (o.contextualVectors as string[]) || [];
      if (cv.length < 5)
        missing.push(`contextualVectors (need ≥5, got ${cv.length})`);
      const em = (o.entityMap as unknown[]) || [];
      if (em.length < 3)
        missing.push(`entityMap (need ≥3, got ${em.length})`);
      const tm = (o.topicalMap as unknown[]) || [];
      if (tm.length < 3)
        missing.push(`topicalMap (need ≥3, got ${tm.length})`);
      break;
    }

    case 8: {
      // Heading Hierarchy
      const hdgs = (o.headings as Array<{ level: number; text: string }>) || [];
      if (hdgs.length < 10)
        missing.push(`headings (need ≥10, got ${hdgs.length})`);
      if (hdgs.length > 0 && hdgs[0].level !== 1)
        missing.push("first heading is not H1");
      const h1s = hdgs.filter((h) => h.level === 1);
      if (h1s.length !== 1)
        missing.push(`exactly 1 H1 required (got ${h1s.length})`);
      // Check valid nesting (no level skips)
      for (let i = 1; i < hdgs.length; i++) {
        if (hdgs[i].level > hdgs[i - 1].level + 1) {
          missing.push(`nesting skip at heading ${i}: H${hdgs[i - 1].level} → H${hdgs[i].level}`);
          break; // only report first
        }
      }
      break;
    }

    case 9: {
      // Structure + Queries
      const h9 = (o.headings as Array<Record<string, unknown>>) || [];
      for (const h of h9) {
        const level = h.level as number;
        const text = (h.text as string) || "";
        const tq = (h.targetQueries as unknown[]) || [];
        if ((level === 1 || level === 2) && tq.length < 1)
          missing.push(`H${level} "${text.slice(0, 40)}" has 0 targetQueries`);
        if (!h.structurePattern || (h.structurePattern as string).trim() === "")
          missing.push(`"${text.slice(0, 40)}" missing structurePattern`);
        if (!h.structureInstructions || (h.structureInstructions as string).trim() === "")
          missing.push(`"${text.slice(0, 40)}" missing structureInstructions`);
      }
      // Cap missing array to avoid log flooding
      if (missing.length > 8) {
        const extra = missing.length - 5;
        missing.length = 5;
        missing.push(`... and ${extra} more`);
      }
      break;
    }

    case 10: {
      // Connections
      const conns = (o.connections as unknown[]) || [];
      if (conns.length < 2)
        missing.push(`connections (need ≥2, got ${conns.length})`);
      else {
        for (const c of conns as Record<string, unknown>[]) {
          if (!c.fromHeading || (c.fromHeading as string).trim() === "")
            { missing.push("a connection missing fromHeading"); break; }
          if (!c.toPage || (c.toPage as string).trim() === "")
            { missing.push("a connection missing toPage"); break; }
          if (!c.anchorText || (c.anchorText as string).trim() === "")
            { missing.push("a connection missing anchorText"); break; }
        }
      }
      break;
    }

    case 11: {
      // Heading Validation
      if (typeof o.score !== "number" || o.score < 1 || o.score > 10)
        missing.push(`score must be 1-10 (got ${o.score})`);
      if (!Array.isArray(o.issues))
        missing.push("issues must be an array");
      break;
    }

    case 12: {
      // Quality Scoring
      if (typeof o.overallScore !== "number" || o.overallScore < 0 || o.overallScore > 100)
        missing.push(`overallScore must be 0-100 (got ${o.overallScore})`);
      const bd = o.breakdown as Record<string, unknown> | undefined;
      const dims = ["competitorCoverage", "intentSatisfaction", "semanticCoherence", "entityCompleteness", "headingQuality"];
      if (!bd) {
        missing.push("breakdown missing entirely");
      } else {
        for (const d of dims) {
          const v = bd[d];
          if (typeof v !== "number" || v < 0 || v > 100)
            missing.push(`breakdown.${d} must be 0-100 (got ${v})`);
        }
      }
      break;
    }
  }

  const valid = missing.length === 0;
  if (valid) {
    console.log(`[Validation Step ${stepNum}] PASS`);
  } else {
    console.log(`[Validation Step ${stepNum}] WARN: missing ${missing.join(", ")}`);
  }
  return { valid, missing };
}

// --- Gold-Standard Cross-Reference (programmatic, no GPT-4o) ---

/**
 * Parse heading count from gold-standard brief chunks.
 *
 * Chunks from category 19 may be fragments of a full brief. We look for:
 *   1. "**Total Rows:** N" metadata line → exact count (only in first chunk)
 *   2. "### H1:", "### H2:", "#### H3:" markers → count what we see
 * Across multiple chunks from different briefs, we take the max Total Rows
 * found, or sum unique heading markers, or fall back to page-type benchmarks.
 */
/**
 * Programmatic quality gate — checks the brief against Sardar's structural rules.
 * No LLM comparison, no chunk parsing. Pure deterministic checks derived from
 * what makes gold-standard CSVs good: query coverage on H1/H2, structure instructions
 * on every heading, pattern diversity, entity density, proper hierarchy, and depth.
 */
function programmaticQualityGate(
  brief: EnhancedBrief
): GoldStandardCrossRef {
  const checks: Record<string, "PASS" | "WARN"> = {};
  let passCount = 0;
  const TOTAL_DIMENSIONS = 6;
  const headings = brief.headings || [];
  const headingCount = headings.length;

  // --- 1. H1/H2 Query Coverage (≥90% of H1/H2 must have ≥1 targetQuery) ---
  const h1h2 = headings.filter((h) => h.level <= 2);
  const h1h2WithQueries = h1h2.filter((h) => (h.targetQueries?.length || 0) > 0);
  const h1h2Coverage = h1h2.length > 0 ? h1h2WithQueries.length / h1h2.length : 0;
  if (h1h2Coverage >= 0.9) {
    checks.h1_h2_query_coverage = "PASS";
    passCount++;
  } else {
    checks.h1_h2_query_coverage = "WARN";
  }

  // --- 2. Structure Instructions Coverage (≥80% of headings have instructions ≥10 chars) ---
  const withInstructions = headings.filter(
    (h) => h.structureInstructions && h.structureInstructions.trim().length >= 10
  );
  const structCoverage = headingCount > 0 ? withInstructions.length / headingCount : 0;
  if (structCoverage >= 0.8) {
    checks.structure_coverage = "PASS";
    passCount++;
  } else {
    checks.structure_coverage = "WARN";
  }

  // --- 3. Pattern Diversity (≥3 unique structure patterns) ---
  const uniquePatterns = new Set(
    headings
      .map((h) => h.structurePattern || h.contentDesignPattern)
      .filter(Boolean)
  );
  if (uniquePatterns.size >= 3) {
    checks.pattern_diversity = "PASS";
    passCount++;
  } else {
    checks.pattern_diversity = "WARN";
  }

  // --- 4. Entity Coverage (≥0.3 entities per heading) ---
  const entityDensity = (brief.entityMap?.length || 0) / Math.max(headingCount, 1);
  if (entityDensity >= 0.3) {
    checks.entity_coverage = "PASS";
    passCount++;
  } else {
    checks.entity_coverage = "WARN";
  }

  // --- 5. Hierarchy Valid (starts with H1, no level skips like H1→H3) ---
  let hierarchyValid = headingCount > 0 && headings[0].level === 1;
  if (hierarchyValid) {
    for (let i = 1; i < headings.length; i++) {
      if (headings[i].level > headings[i - 1].level + 1) {
        hierarchyValid = false;
        break;
      }
    }
  }
  if (hierarchyValid) {
    checks.hierarchy_valid = "PASS";
    passCount++;
  } else {
    checks.hierarchy_valid = "WARN";
  }

  // --- 6. Heading Depth (must have H1 + at least one H2 + at least one H3) ---
  const levels = new Set(headings.map((h) => h.level));
  if (levels.has(1) && levels.has(2) && levels.has(3)) {
    checks.heading_depth = "PASS";
    passCount++;
  } else {
    checks.heading_depth = "WARN";
  }

  const score = Math.round((passCount / TOTAL_DIMENSIONS) * 100);
  const checkSummary = Object.entries(checks).map(([k, v]) => `${k}: ${v}`).join(" | ");
  console.log(`[Quality Gate] ${passCount}/${TOTAL_DIMENSIONS} passed | Score: ${score}/100 | ${checkSummary}`);

  return { score, checks };
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
          stepSerpAnalysis(keywordData, competitorDataset, params.topic),
        ]);
        validateStepOutput(4, queryPreAnalysis);
        validateStepOutput(5, serpAnalysis);
        sendEvent({ step: 4, label: "Intent analyzed", progress: 0.37 });
        sendEvent({ step: 5, label: "SERP patterns analyzed", progress: 0.37 });

        sendEvent({ step: 6, label: "Analyzing competitors in depth...", progress: 0.40 });
        const deepCompetitors = await stepDeepCompetitorAnalysis(
          keywordData,
          competitorDataset
        );
        validateStepOutput(6, deepCompetitors);
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
        validateStepOutput(7, { contextualVectors, entityMap, topicalMap });
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
        validateStepOutput(8, { headings: rawHeadings });
        sendEvent({ step: 8, label: "Hierarchy built", progress: 0.68 });

        sendEvent({ step: 9, label: "Generating structure & mapping queries...", progress: 0.70 });
        const headings = await stepStructureAndQueryMapping(
          params,
          rawHeadings,
          keywordData,
          deepCompetitors
        );
        validateStepOutput(9, { headings });
        sendEvent({ step: 9, label: "Structure complete", progress: 0.78 });

        sendEvent({ step: 10, label: "Mapping internal connections...", progress: 0.80 });
        const connectionMap = await stepConnectionMapping(
          params,
          headings,
          topicalMap
        );
        validateStepOutput(10, { connections: connectionMap });
        sendEvent({ step: 10, label: "Connections mapped", progress: 0.85 });

        // ── Rule compliance pass (Sardar's refinement step) ──
        // Check co-occurrence, entity density, perspective placement
        const ruleComplianceIssues = checkRuleCompliance(params, headings);
        if (ruleComplianceIssues.length > 0) {
          console.log(`[Rule Compliance] ${ruleComplianceIssues.length} issues found, adding to quality report`);
        }

        // ============================================================
        // PHASE D: VALIDATION (Steps 11-12) — parallel
        // ============================================================

        sendEvent({ step: 11, label: "Validating heading quality...", progress: 0.87 });
        sendEvent({ step: 12, label: "Scoring brief quality...", progress: 0.87 });

        const [headingValidation, qualityReport] = await Promise.all([
          stepHeadingValidation(headings, queryPreAnalysis, params.topic),
          stepQualityScoring(
            contextualVectors,
            headings,
            entityMap,
            queryPreAnalysis,
            serpAnalysis,
            deepCompetitors,
            params.topic
          ),
        ]);
        validateStepOutput(11, headingValidation);
        validateStepOutput(12, qualityReport);
        sendEvent({ step: 11, label: "Headings validated", progress: 0.95 });
        sendEvent({ step: 12, label: "Brief scored", progress: 0.98 });

        // Apply heading corrections if validation score < 8
        // Guard: only use corrected headings if they aren't drastically shorter
        // (GPT-4o sometimes returns a partial list instead of the full corrected set)
        const corrected = headingValidation.correctedHeadings;
        const useCorrected =
          headingValidation.score < 8 &&
          corrected &&
          corrected.length >= Math.max(headings.length * 0.6, 5);
        const finalHeadings = useCorrected ? corrected : headings;

        // ============================================================
        // GOLD-STANDARD CROSS-REFERENCE (programmatic, after Step 12)
        // ============================================================

        const goldStandardCrossRef = programmaticQualityGate(
          { contextualVectors, headings: finalHeadings, entityMap, connectionMap, competitors: [], knowledgeGaps: qualityReport.knowledgeGaps }
        );
        qualityReport.goldStandardCrossRef = goldStandardCrossRef;

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

  const methodologyCtx4 = await getStepMethodologyContext(4, params.topic);

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.2,
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are executing Step 4 of the Sardar brief methodology: Query Pre-Analysis.

${methodologyCtx4}

## TASK
Analyze the query and produce a comprehensive pre-analysis following the methodology above.

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
- Identify the exact search intent before anything else. The intent layer defines the entire content structure.
- Determine query type (head-term, mid-tail, long-tail, entity-based, etc.) — this changes topical structure and heading depth.
- Assess query completeness rigorously. Detect missing audience, location, use-case, budget, risk level, experience level, time frame qualifiers.
- Define audience segments specifically — not "general public" but the actual people searching.
- Determine the search intent satisfaction threshold — how deep must content go?
- Assess freshness: prices, laws, statistics, trends, algorithms, crime rates, or market changes require updated data.`,
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
  competitorDataset: CompetitorDataset,
  topic?: string
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

  const methodologyCtx5 = await getStepMethodologyContext(5, topic);

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 3000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are executing Step 5 of the Sardar brief methodology: SERP Pattern Analysis.

${methodologyCtx5}

## TASK
Analyze the live SERP data following the methodology above. SERP analysis defines the actual ranking consensus — not assumptions.

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
- consensusCoverage: Topics covered by nearly ALL top-ranking pages — these are minimum coverage requirements.
- serpGaps: Missing angles competitors are NOT covering deeply, accurately, or contextually. These are differentiation opportunities.
- compressionPatterns: Overused shallow sections competitors repeat without adding value. Detect where Google compresses repeated info into expected entity clusters.
- featuredSnippetOpportunities: Extract how Google summarizes the topic and which entities/attributes it prioritizes. Identify format (paragraph, list, table) and targeting strategy.
- PAA questions reveal query expansion paths, hidden user intent layers, and missing semantic branches.
- autocompleteVariations: Related searches and autocomplete reveal modifier relationships and adjacent topical demand.
- Analyze ALL SERP features: image packs, videos, maps, forums, Reddit threads — different features indicate different content expectations.`,
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

  const methodologyCtx6 = await getStepMethodologyContext(6, keywordData.primary.keyword);

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are executing Step 6 of the Sardar brief methodology: Deep Competitor Analysis.

${methodologyCtx6}

## TASK
Review each competitor INDIVIDUALLY — do not analyze them collectively. Each competitor may reveal unique entity relationships or topical depth.

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
- Extract each competitor's topical architecture: how they structure info hierarchy from intro to conclusion.
- Analyze heading depth: where do competitors STOP covering the topic? Where is deeper explanation needed?
- Evaluate content design patterns: tables, comparisons, maps, visuals, calculators, examples, statistics, FAQs, internal linking.
- Identify weak contextual areas: outdated info, missing entities, shallow explanations, lack of examples, missing comparisons, poor topical flow.
- Extract dominant entity relationships: search engines reinforce recurring semantic relationships across ranking pages.
- crossCompetitorEntities: Entities appearing across MOST competitors — these are shared semantic expectations.
- gapKeywords: Keywords competitors rank for that represent content opportunities the client misses.`,
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

  const methodologyCtx7 = await getStepMethodologyContext(7, params.topic);

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are executing Step 7 of the Sardar brief methodology: Contextual Vectors, Entities & Topical Map.

${methodologyCtx7}

## TASK
Extract the complete semantic foundation for this page following the methodology.

1. Contextual Vectors: 8-15 topical coverage areas the page must address. Each vector is a short phrase (3-6 words). Include vectors for SERP consensus AND gap opportunities. Cover root attributes, supporting attributes, contextual qualifiers, edge-case attributes, hidden informational layers, and unique semantic nuances.

2. Entity Map: Extract ALL primary entities, secondary entities, attributes, predicates, modifiers, qualifiers, and semantic dependencies. Include BOTH explicit entities directly mentioned and implicit entities users and search engines expect.

3. Topical Map: Build a topical map BEFORE headings. The page should not exist independently — it connects to broader topical clusters. Define root topic, supporting topics, adjacent topics, and downstream pages.

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

  const methodologyCtx8 = await getStepMethodologyContext(8, params.topic);

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are executing Step 8 of the Sardar brief methodology: Heading Hierarchy + Title Tag.

${methodologyCtx8}

## TASK
Build a comprehensive H1-H4 heading structure AND a title tag for a ${params.pageType} page.

SARDAR'S HEADING METHODOLOGY:
- H1 is the PURPOSE SUMMARY: it represents ALL contextual vectors of the document in heading order. It is a representative summary, NOT a keyword-stuffed title.
- Each H2 represents a major contextual vector. The H2 text is a question or topic phrase.
- H3s under H2s decompose the vector into sub-questions, list items, or subtopics.
- H4s provide deep detail, edge cases, or data tables.

HEADING RULES (STRICTLY ENFORCED — violations will be rejected):
- The FIRST heading MUST be level 1 (H1). Exactly 1 H1. This is non-negotiable.
- H1 text format: "[Main Topic] — [concise representative summary phrase]" or a natural title that captures the page's full scope.
- Target 15-22 total headings for service/location pages, 20-30 for blog/landing pages. Quality over quantity — each heading must earn its place.
- 4-8 H2s covering the most important contextual vectors (not every vector needs its own H2)
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

  // Retry once if too few headings — GPT-4o sometimes produces sparse output
  if (headings.length < 10) {
    console.warn(`[Step 8] Only ${headings.length} headings — retrying with enforcement prompt...`);
    const retryResponse = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      temperature: 0.4,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You previously generated only ${headings.length} headings for a ${params.pageType} page. This is far too few.

HARD REQUIREMENT: Generate AT LEAST 15 headings (ideally 18-22) with proper H1 → H2 → H3 → H4 nesting.
- 1 H1 (purpose-summary)
- 5-7 H2s (major contextual vectors)
- 6-10 H3s (sub-topics under H2s)
- 2-4 H4s (deep detail, edge cases)

Your previous headings were:
${headings.map((h) => `${"#".repeat(h.level)} ${h.text}`).join("\n")}

Return the COMPLETE expanded heading set as JSON: { "headings": [{ "level": 1|2|3|4, "text": string }] }
Keep the existing headings but ADD missing depth. Cover: contextual vectors, edge cases, costs, risks, process details, local factors, decision criteria, FAQs.`,
        },
        {
          role: "user",
          content: `Topic: ${params.topic}\nPage Type: ${params.pageType}\nContextual Vectors: ${contextualVectors.join(", ")}`,
        },
      ],
    });

    const retryContent = retryResponse.choices[0]?.message?.content || "{}";
    const retryParsed = safeParseJSON(retryContent) as { headings?: Array<{ level: number; text: string }> };
    if (retryParsed.headings && retryParsed.headings.length > headings.length) {
      headings = retryParsed.headings;
      console.log(`[Step 8] Retry produced ${headings.length} headings — using expanded set`);

      // Re-apply structural enforcement on retry output
      const retryH1Count = headings.filter((h) => h.level === 1).length;
      if (retryH1Count === 0) {
        headings = [{ level: 1, text: params.topic }, ...headings];
      } else if (retryH1Count > 1) {
        let seen = false;
        headings = headings.map((h) => {
          if (h.level === 1) {
            if (seen) return { ...h, level: 2 };
            seen = true;
          }
          return h;
        });
      }
      if (headings[0]?.level !== 1) {
        headings = [{ level: 1, text: params.topic }, ...headings];
      }
      let max = 1;
      headings = headings.map((h) => {
        if (h.level > max + 1) return { ...h, level: max + 1 };
        max = Math.max(max, h.level);
        return h;
      });
    }
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

  const methodologyCtx9 = await getStepMethodologyContext(9, params.topic);

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are executing Step 9 of the Sardar brief methodology: Structure Instructions + Query Mapping.

${methodologyCtx9}

## TASK
For each heading, assign a structure pattern AND map keywords following the methodology above.

STRUCTURE PATTERN TAXONOMY (assign one per heading):
${Object.values(STRUCTURE_PATTERNS).map((p) => `- "${p.id}": ${p.description} [${p.wordCountRange[0]}-${p.wordCountRange[1]} words]`).join("\n")}

For H1: ALWAYS assign "purpose-summary" pattern.
For H2/H3 definitions: use "explicit-definition".
For H2/H3 with lists: use "list-definition".
For yes/no or direct questions: use "direct-answer".
For numeric/data answers: use "exact-answer".
For why/how explanations: use "reasoning-based".
For recommendations: use "suggestive-answer".
For comparison tables: use "table-format" or "comparison".

For each heading provide:
1. structurePattern: Pattern ID from taxonomy above (REQUIRED)
2. structureInstructions: Sardar-style instruction matching the pattern template, customized for this heading
3. ruleCodes: Which writing rule codes apply (e.g., "FS", "PAA", "NER", "TF-IDF", "CO-OCC", "PERSPECTIVE")
4. intent: One sentence on what this section accomplishes
5. wordCountTarget: From the pattern's word count range
6. targetQueries: Keywords mapped to this heading by semantic relevance (0-5 per heading)
7. serpFeatures: SERP features this heading targets (FS, PAA, KP, LC)
8. contentDesignPattern: "paragraph"|"table"|"comparison"|"list"|"visual"
9. snippetTarget: boolean
10. paaTarget: boolean

PAGE-TYPE RULES (enforce for ${params.pageType} pages):
${getRulesForPageType((params.pageType || "blog") as PageType).slice(0, 2000)}

HARD RULES (violations will be rejected):
- Assign the primary keyword to the H1
- EVERY H1 and H2 heading MUST have at least 1 targetQuery. This is NON-NEGOTIABLE. Zero queries on any H1/H2 = rejection.
- EVERY H3 heading SHOULD have at least 1 targetQuery unless there are truly no semantically relevant keywords left.
- Distribute ALL provided keywords across headings. Every keyword must appear in at least one heading's targetQueries.
- If there are more headings than keywords, derive natural-language queries from the heading text itself (e.g., heading "Types of Home Removal Services" → query "types of home removal services").
- H1 structureInstructions MUST follow purpose-summary format: "Summarize the entire document's contextual vectors in heading order using a representative paragraph..."
- H1 structurePattern MUST be "purpose-summary" (not "paragraph")

Return JSON:
{
  "headings": [{
    "level": number, "text": string,
    "structurePattern": string, "structureInstructions": string,
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

  // Build a pool of unused keywords for backfill
  const usedQueries = new Set<string>();
  const parsedHeadings = parsed.headings || rawHeadings;
  for (const h of parsedHeadings) {
    const raw = h as Record<string, unknown>;
    const tq = (raw.targetQueries as QueryEntry[]) || [];
    for (const q of tq) usedQueries.add(q.query?.toLowerCase?.() || "");
  }
  const unusedKeywords = allKeywords.filter((k) => !usedQueries.has(k.keyword.toLowerCase()));
  let unusedIdx = 0;

  return parsedHeadings.map((h, i) => {
    const raw = h as Record<string, unknown>;
    // Enforce purpose-summary for H1
    const level = ((h.level as 1 | 2 | 3 | 4) || 2);
    const structurePattern = level === 1
      ? "purpose-summary"
      : (raw.structurePattern as string) || "paragraph";

    // Backfill: ensure H1/H2 always have at least 1 query
    let targetQueries = (raw.targetQueries as QueryEntry[]) || [];
    if (targetQueries.length === 0 && level <= 2) {
      // Try to assign an unused keyword
      if (unusedIdx < unusedKeywords.length) {
        const kw = unusedKeywords[unusedIdx++];
        targetQueries = [{ query: kw.keyword, volume: kw.volume, intent: kw.intent || "informational" }];
      } else {
        // Derive a natural query from the heading text
        targetQueries = [{ query: h.text.replace(/^#+\s*/, "").toLowerCase(), volume: 0, intent: "informational" }];
      }
    }

    return {
      level,
      text: h.text,
      structureInstructions: (raw.structureInstructions as string) || "",
      targetQueries,
      serpFeatures: (raw.serpFeatures as string[]) || [],
      ruleCodes: (raw.ruleCodes as string[]) || [],
      intent: (raw.intent as string) || "",
      wordCountTarget: raw.wordCountTarget as number | undefined,
      structurePattern,
      contentDesignPattern: (raw.contentDesignPattern as string) || structurePattern,
      snippetTarget: raw.snippetTarget as boolean | undefined,
      paaTarget: raw.paaTarget as boolean | undefined,
    };
  });
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

  const methodologyCtx10 = await getStepMethodologyContext(10, params.topic);

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are executing Step 10 of the Sardar brief methodology: Connection Mapping.

${methodologyCtx10}

## TASK
Given a page's heading structure and the broader topical map, suggest 3-8 internal linking opportunities. Each link connects a heading on this page to another page that should exist on the site.

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
// RULE COMPLIANCE CHECK (Sardar's refinement pass)
// ============================================================

interface RuleComplianceIssue {
  headingIndex: number;
  headingText: string;
  ruleViolation: string;
  severity: "low" | "medium" | "high";
}

function checkRuleCompliance(
  params: BriefGenParams,
  headings: EnhancedHeading[]
): RuleComplianceIssue[] {
  const issues: RuleComplianceIssue[] = [];
  const isLocal = params.pageType === "service" || params.pageType === "location";
  const hasLocation = !!params.location;

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];

    // CO-OCCURRENCE CHECK: local pages must pair region+service
    if (isLocal && hasLocation && i === 0) {
      const h1Text = h.text.toLowerCase();
      const locationLower = params.location!.toLowerCase();
      if (!h1Text.includes(locationLower)) {
        issues.push({
          headingIndex: i,
          headingText: h.text,
          ruleViolation: `CO-OCC: H1 missing location "${params.location}" — local pages require region+service co-occurrence`,
          severity: "high",
        });
      }
    }

    // STRUCTURE PATTERN CHECK: every heading should have a pattern
    if (!h.contentDesignPattern) {
      issues.push({
        headingIndex: i,
        headingText: h.text,
        ruleViolation: "PATTERN: Missing structure pattern assignment",
        severity: "medium",
      });
    }

    // H1 PURPOSE-SUMMARY CHECK
    if (h.level === 1 && h.structureInstructions) {
      const instr = h.structureInstructions.toLowerCase();
      if (!instr.includes("summar") && !instr.includes("represent") && !instr.includes("purpose")) {
        issues.push({
          headingIndex: i,
          headingText: h.text,
          ruleViolation: "PURPOSE: H1 structure instructions should follow purpose-summary pattern",
          severity: "medium",
        });
      }
    }

    // RULE CODE DENSITY: each heading should have at least 1 rule code
    if (h.ruleCodes.length === 0) {
      issues.push({
        headingIndex: i,
        headingText: h.text,
        ruleViolation: "RULES: No rule codes assigned — every heading needs applicable rules",
        severity: "low",
      });
    }

    // WORD COUNT TARGET: should be set
    if (!h.wordCountTarget || h.wordCountTarget < 30) {
      issues.push({
        headingIndex: i,
        headingText: h.text,
        ruleViolation: "WORDCOUNT: Missing or too-low word count target",
        severity: "low",
      });
    }
  }

  return issues;
}

// ============================================================
// PHASE D: VALIDATION
// ============================================================

// --- Step 11: Heading Validation ---

async function stepHeadingValidation(
  headings: EnhancedHeading[],
  queryPreAnalysis: QueryPreAnalysis,
  topic?: string
): Promise<HeadingValidation> {
  const headingList = headings
    .map((h, i) => `${i}. ${"#".repeat(h.level)} ${h.text} — intent: ${h.intent}`)
    .join("\n");

  const methodologyCtx11 = await getStepMethodologyContext(11, topic);

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.2,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are executing Step 11 of the Sardar brief methodology: Heading Validation.

${methodologyCtx11}

## TASK
Evaluate the heading structure against these criteria:

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
  deepCompetitors: DeepCompetitorAnalysisResult,
  topic?: string
): Promise<BriefQualityReport> {
  const headingSummary = headings
    .map((h) => `${"#".repeat(h.level)} ${h.text}`)
    .join("\n");

  const methodologyCtx12 = await getStepMethodologyContext(12, topic);

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.2,
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are executing Step 12 of the Sardar brief methodology: Brief Quality Scoring.

${methodologyCtx12}

## TASK
Evaluate the brief against competitors and intent requirements.

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

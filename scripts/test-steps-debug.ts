/**
 * Step-by-step pipeline debug for "Festivals in Bristol"
 * Runs each step individually, logs output, saves intermediate results.
 *
 * Run:
 *   node --import ./scripts/register.mjs --import tsx scripts/test-steps-debug.ts
 */
import "dotenv/config";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";
import {
  stepTopicResearch,
  stepKnowledgeRetrieval,
  stepCompetitorDataCollection,
  stepQueryPreAnalysis,
  stepSerpAnalysis,
  stepDeepCompetitorAnalysis,
  stepContextualVectors,
  stepHierarchyAndTitle,
  stepStructureAndQueryMapping,
  type BriefGenParams,
} from "../app/lib/brief-pipeline";

const outputDir = resolve(process.cwd(), "output/debug");
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

function save(name: string, data: unknown) {
  const p = resolve(outputDir, `${name}.json`);
  writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
  console.log(`  >> saved ${p}`);
}

function divider(step: number, label: string) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`  STEP ${step}: ${label}`);
  console.log("=".repeat(70));
}

const params: BriefGenParams = {
  topic: "Festivals in Bristol",
  pageType: "blog",
  niche: "events",
  location: "Bristol",
};

async function main() {
  console.log(">>> STEP-BY-STEP DEBUG: Festivals in Bristol <<<\n");
  const t0 = Date.now();

  // ── STEP 1: Topic Research ──
  divider(1, "Topic Research (keywords, SERP, competitors)");
  const keywordData = await stepTopicResearch(params);
  if (keywordData) {
    console.log(`  Primary: ${keywordData.primary.keyword} (vol: ${keywordData.primary.volume})`);
    console.log(`  Related: ${keywordData.related.length} keywords`);
    console.log(`  PAA: ${keywordData.paa.length} questions`);
    console.log(`  Competitors: ${keywordData.competitors.length}`);
    for (const c of keywordData.competitors.slice(0, 5)) {
      console.log(`    #${c.serpPosition} ${c.title}`);
      console.log(`      Headings: ${c.headings.slice(0, 5).join(" | ")}`);
    }
  } else {
    console.log("  (no keyword data returned)");
  }
  save("step1-keywords", keywordData);

  // ── STEP 2: Knowledge Retrieval ──
  divider(2, "Knowledge Base Retrieval");
  const knowledgeContext = await stepKnowledgeRetrieval(params);
  console.log(`  pageTypeChunks: ${knowledgeContext.pageTypeChunks.length}`);
  console.log(`  briefExampleChunks: ${knowledgeContext.briefExampleChunks.length}`);
  console.log(`  strategyChunks: ${knowledgeContext.strategyChunks.length}`);
  save("step2-knowledge", knowledgeContext);

  // ── STEP 3: Competitor Data Collection ──
  divider(3, "Competitor Data Collection");
  const competitorDataset = await stepCompetitorDataCollection(params, keywordData);
  console.log(`  competitorKeywords: ${competitorDataset.competitorKeywords ? "yes" : "none"}`);
  console.log(`  gapKeywords: ${competitorDataset.gapKeywords?.length ?? 0}`);
  save("step3-competitors", competitorDataset);

  // ── STEP 4: Query Pre-Analysis ──
  divider(4, "Query Pre-Analysis");
  const queryPreAnalysis = await stepQueryPreAnalysis(params, keywordData, competitorDataset);
  console.log(`  searchIntent: ${queryPreAnalysis.searchIntent}`);
  console.log(`  queryType: ${queryPreAnalysis.queryType}`);
  console.log(`  businessModel: ${queryPreAnalysis.businessModel}`);
  console.log(`  depth: ${queryPreAnalysis.intentSatisfactionThreshold.depth}`);
  console.log(`  audience.primary: ${queryPreAnalysis.audienceSegments.primary}`);
  save("step4-queryanalysis", queryPreAnalysis);

  // ── STEP 5: SERP Analysis ──
  divider(5, "SERP Pattern Analysis");
  const serpAnalysis = await stepSerpAnalysis(keywordData, competitorDataset, params.topic);
  console.log(`  consensusCoverage: ${serpAnalysis.consensusCoverage.join(", ")}`);
  console.log(`  serpGaps: ${serpAnalysis.serpGaps.join(", ")}`);
  console.log(`  compressionPatterns: ${serpAnalysis.compressionPatterns.join(", ")}`);
  console.log(`  snippetOpps: ${serpAnalysis.featuredSnippetOpportunities.length}`);
  save("step5-serpanalysis", serpAnalysis);

  // ── STEP 6: Deep Competitor Analysis ──
  divider(6, "Deep Competitor Analysis");
  const deepCompetitors = await stepDeepCompetitorAnalysis(keywordData, competitorDataset);
  console.log(`  competitors analyzed: ${deepCompetitors.competitors?.length ?? 0}`);
  console.log(`  gapKeywords: ${deepCompetitors.gapKeywords?.length ?? 0}`);
  save("step6-deepcomp", deepCompetitors);

  // ── STEP 7: Contextual Vectors + Entities ──
  divider(7, "Contextual Vectors, Entities & Topical Map");
  const { contextualVectors, entityMap, topicalMap } = await stepContextualVectors(
    params, keywordData, knowledgeContext, queryPreAnalysis, serpAnalysis, deepCompetitors
  );
  console.log(`  vectors (${contextualVectors.length}):`);
  for (const v of contextualVectors) console.log(`    + ${v}`);
  console.log(`  entities: ${entityMap.length}`);
  console.log(`  topicalMap: ${topicalMap.length}`);
  save("step7-vectors", { contextualVectors, entityMap, topicalMap });

  // ── STEP 8: Heading Hierarchy + Title ──
  divider(8, "Heading Hierarchy & Title Tag");
  const { rawHeadings, titleTag } = await stepHierarchyAndTitle(
    params, contextualVectors, topicalMap, keywordData, knowledgeContext,
    queryPreAnalysis, serpAnalysis, deepCompetitors
  );
  console.log(`  titleTag: ${titleTag.titleTag}`);
  console.log(`  rawHeadings (${rawHeadings.length}):`);
  for (const h of rawHeadings) {
    console.log(`    ${"  ".repeat(h.level - 1)}[H${h.level}] ${h.text}`);
  }
  save("step8-headings", { rawHeadings, titleTag });

  // ── STEP 9: Structure Instructions + Query Mapping ──
  divider(9, "Structure Instructions & Query Mapping (THE KEY STEP)");
  const headings = await stepStructureAndQueryMapping(params, rawHeadings, keywordData, deepCompetitors);
  console.log(`\n  === STEP 9 OUTPUT vs GOLD STANDARD ===\n`);
  for (const h of headings) {
    console.log(`  ${"─".repeat(60)}`);
    console.log(`  [H${h.level}] ${h.text}`);
    console.log(`  PATTERN: ${h.contentDesignPattern || h.structurePattern || "NONE"}`);
    console.log(`  INTENT: ${h.intent || "NONE"}`);
    console.log(`  STRUCTURE INSTRUCTIONS:`);
    for (const line of (h.structureInstructions || "(empty)").split("\n")) {
      console.log(`    ${line}`);
    }
    if (h.targetQueries?.length) {
      console.log(`  QUERIES: ${h.targetQueries.map(q => `${q.query} (${q.volume})`).join(", ")}`);
    }
    console.log("");
  }
  save("step9-structure", headings);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n>>> Done in ${elapsed}s. All step outputs in ${outputDir}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

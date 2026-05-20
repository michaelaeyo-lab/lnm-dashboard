/**
 * Test: Generate a brief for "Domestic Home Removal Service in Bristol"
 * using the 12-step pipeline and validate against gold-standard CSV format.
 *
 * Run:
 *   node --import ./scripts/register.mjs --import tsx scripts/test-bristol-brief.ts
 */
import "dotenv/config";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";
import { generateBrief } from "../app/lib/brief-pipeline";
import {
  validateBriefAgainstCsvFormat,
  briefToCsvString,
} from "../app/lib/csv-validation";
import type { EnhancedBrief, QueryEntry } from "../app/lib/types";

const outputDir = resolve(process.cwd(), "output");
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

// Bristol keywords from gold-standard CSV column E
const manualKeywords: QueryEntry[] = [
  { query: "home removals", volume: 600, intent: "commercial" },
  { query: "house removal companies", volume: 450, intent: "commercial" },
  { query: "house moving service", volume: 350, intent: "commercial" },
  { query: "home moving services", volume: 200, intent: "commercial" },
  { query: "residential moving", volume: 150, intent: "commercial" },
  { query: "domestic removals", volume: 150, intent: "commercial" },
  { query: "household removals", volume: 100, intent: "commercial" },
  { query: "house removal company", volume: 100, intent: "commercial" },
  { query: "home removal companies", volume: 70, intent: "commercial" },
];

async function main() {
  console.log("=== Bristol Brief Pipeline Test ===\n");
  console.log("Topic: Domestic Home Removal Service in Bristol");
  console.log("Client: Mo Transport");
  console.log(`Keywords: ${manualKeywords.length} manual keywords\n`);

  // --- Generate brief ---
  console.log("Starting 12-step pipeline...\n");
  const t0 = Date.now();

  const stream = await generateBrief({
    topic: "Domestic Home Removal Service in Bristol",
    pageType: "service",
    niche: "removal",
    location: "Bristol",
    clientName: "Mo Transport",
    manualKeywords,
  });

  // --- Read SSE stream ---
  let brief: EnhancedBrief | null = null;
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE events (terminated by \n\n)
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || ""; // keep incomplete tail

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") continue;

      try {
        const event = JSON.parse(payload);

        if (event.error) {
          console.error(`\nERROR: ${event.error}`);
          process.exit(1);
        }

        if (event.done && event.brief) {
          brief = event.brief as EnhancedBrief;
          const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
          console.log(`\n>> Brief generated in ${elapsed}s`);
        } else if (event.step !== undefined) {
          const pct = Math.round((event.progress || 0) * 100);
          console.log(
            `  [Step ${String(event.step).padStart(2)}/12] ${event.label} (${pct}%)`
          );
        }
      } catch {
        // partial JSON — skip
      }
    }
  }

  if (!brief) {
    console.error("\nFAILED: No brief produced");
    process.exit(1);
  }

  // --- Summary ---
  console.log("\n=== Brief Summary ===");
  console.log(`Headings: ${brief.headings.length}`);
  const lc: Record<string, number> = {};
  for (const h of brief.headings) lc[`H${h.level}`] = (lc[`H${h.level}`] || 0) + 1;
  console.log(
    `Levels: ${Object.entries(lc).map(([k, v]) => `${k}:${v}`).join(", ")}`
  );
  console.log(`Vectors: ${brief.contextualVectors.length}`);
  console.log(`Entities: ${brief.entityMap.length}`);
  console.log(`Connections: ${brief.connectionMap.length}`);
  console.log(`Topical Map: ${brief.topicalMap?.length ?? 0} topics`);
  console.log(`Title Tag: ${brief.titleTag?.titleTag ?? "none"}`);

  if (brief.qualityReport) {
    const qr = brief.qualityReport;
    console.log(`\nPipeline Quality Score: ${qr.overallScore}/100`);
    console.log(`  Competitor Coverage:  ${qr.breakdown.competitorCoverage}`);
    console.log(`  Intent Satisfaction:  ${qr.breakdown.intentSatisfaction}`);
    console.log(`  Semantic Coherence:   ${qr.breakdown.semanticCoherence}`);
    console.log(`  Entity Completeness:  ${qr.breakdown.entityCompleteness}`);
    console.log(`  Heading Quality:      ${qr.breakdown.headingQuality}`);
  }

  if (brief.headingValidation) {
    console.log(
      `\nHeading Validation: ${brief.headingValidation.score}/10 (${brief.headingValidation.issues.length} issues)`
    );
  }

  // --- CSV format validation ---
  console.log("\n=== CSV Format Validation ===");
  const vr = validateBriefAgainstCsvFormat(brief);
  console.log(`Valid: ${vr.valid}  Score: ${vr.score}/100`);
  for (const issue of vr.issues) {
    const loc = issue.heading ? ` [${issue.heading.slice(0, 50)}]` : "";
    console.log(`  ${issue.severity.toUpperCase().padEnd(7)} ${issue.field}: ${issue.message}${loc}`);
  }

  // --- Heading dump ---
  console.log("\n=== Generated Headings ===");
  for (const h of brief.headings) {
    const indent = "  ".repeat(h.level - 1);
    const queries = h.targetQueries?.length || 0;
    const rules = h.ruleCodes?.length || 0;
    const pattern = h.structurePattern || h.contentDesignPattern || "-";
    console.log(
      `${indent}H${h.level} ${h.text}  [pattern:${pattern}, queries:${queries}, rules:${rules}, wc:${h.wordCountTarget ?? "-"}]`
    );
  }

  // --- Export ---
  const csvStr = briefToCsvString(brief);
  const csvPath = resolve(outputDir, "bristol-brief-generated.csv");
  const jsonPath = resolve(outputDir, "bristol-brief-generated.json");

  writeFileSync(csvPath, csvStr, "utf-8");
  writeFileSync(jsonPath, JSON.stringify(brief, null, 2), "utf-8");

  console.log("\n=== Files Written ===");
  console.log(`CSV:  ${csvPath}`);
  console.log(`JSON: ${jsonPath}`);
  console.log("\nDone. Run compare-bristol.ts next.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

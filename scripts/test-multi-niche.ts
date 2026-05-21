/**
 * Multi-Niche Validation — run the 12-step pipeline against 5 diverse briefs
 * and validate CSV format, pipeline quality, and gold-standard cross-reference.
 *
 * Run:
 *   node --require ./scripts/shim-server-only.cjs --import tsx scripts/test-multi-niche.ts
 */
import "dotenv/config";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";
import { generateBrief, type BriefGenParams } from "../app/lib/brief-pipeline";
import { validateBriefAgainstCsvFormat } from "../app/lib/csv-validation";
import { getPrisma } from "../app/lib/db";
import type { EnhancedBrief, QueryEntry } from "../app/lib/types";

const outputDir = resolve(process.cwd(), "output");
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

// --- Test Definitions ---

interface TestCase {
  name: string;
  params: BriefGenParams;
}

const testCases: TestCase[] = [
  {
    name: "Bristol Home Removal (service)",
    params: {
      topic: "Domestic Home Removal Service in Bristol",
      pageType: "service",
      niche: "removal",
      location: "Bristol",
      clientName: "Mo Transport",
      manualKeywords: [
        { query: "home removals", volume: 600, intent: "commercial" },
        { query: "house removal companies", volume: 450, intent: "commercial" },
        { query: "house moving service", volume: 350, intent: "commercial" },
        { query: "home moving services", volume: 200, intent: "commercial" },
        { query: "residential moving", volume: 150, intent: "commercial" },
        { query: "domestic removals", volume: 150, intent: "commercial" },
        { query: "household removals", volume: 100, intent: "commercial" },
        { query: "house removal company", volume: 100, intent: "commercial" },
        { query: "home removal companies", volume: 70, intent: "commercial" },
      ],
    },
  },
  {
    name: "Emergency Locksmith Manchester (location)",
    params: {
      topic: "Emergency Locksmith in Manchester",
      pageType: "location",
      niche: "locksmith",
      location: "Manchester",
      manualKeywords: [
        { query: "emergency locksmith manchester", volume: 880, intent: "transactional" },
        { query: "24 hour locksmith manchester", volume: 590, intent: "transactional" },
        { query: "locksmith near me manchester", volume: 320, intent: "local" },
        { query: "locked out of house manchester", volume: 210, intent: "transactional" },
        { query: "emergency lock change", volume: 170, intent: "commercial" },
        { query: "locksmith manchester city centre", volume: 140, intent: "local" },
      ],
    },
  },
  {
    name: "How to Choose a Moving Company (blog)",
    params: {
      topic: "How to Choose a Reliable Moving Company",
      pageType: "blog",
      niche: "moving",
      manualKeywords: [
        { query: "how to choose a moving company", volume: 1200, intent: "informational" },
        { query: "reliable movers", volume: 720, intent: "commercial" },
        { query: "moving company reviews", volume: 590, intent: "investigational" },
        { query: "questions to ask movers", volume: 480, intent: "informational" },
        { query: "moving company red flags", volume: 320, intent: "informational" },
        { query: "licensed and insured movers", volume: 210, intent: "informational" },
        { query: "moving company checklist", volume: 170, intent: "informational" },
        { query: "compare moving quotes", volume: 140, intent: "commercial" },
      ],
    },
  },
  {
    name: "Professional Teeth Whitening London (service)",
    params: {
      topic: "Professional Teeth Whitening Services",
      pageType: "service",
      niche: "dental",
      location: "London",
      manualKeywords: [
        { query: "teeth whitening london", volume: 2400, intent: "transactional" },
        { query: "professional teeth whitening", volume: 1600, intent: "commercial" },
        { query: "teeth whitening cost uk", volume: 1100, intent: "commercial" },
        { query: "laser teeth whitening", volume: 880, intent: "informational" },
        { query: "zoom teeth whitening", volume: 590, intent: "commercial" },
        { query: "teeth whitening dentist near me", volume: 480, intent: "local" },
        { query: "best teeth whitening treatment", volume: 320, intent: "investigational" },
      ],
    },
  },
  {
    name: "Best CRM Software for Small Business (landing)",
    params: {
      topic: "Best CRM Software for Small Business",
      pageType: "landing",
      niche: "saas",
      manualKeywords: [
        { query: "best crm for small business", volume: 6600, intent: "commercial" },
        { query: "crm software small business", volume: 3600, intent: "commercial" },
        { query: "free crm for small business", volume: 2900, intent: "commercial" },
        { query: "simple crm software", volume: 1300, intent: "commercial" },
        { query: "crm comparison", volume: 880, intent: "investigational" },
        { query: "crm pricing", volume: 720, intent: "commercial" },
        { query: "small business crm features", volume: 390, intent: "informational" },
        { query: "crm for startups", volume: 480, intent: "commercial" },
      ],
    },
  },
];

// --- Pipeline Runner ---

async function runBrief(params: BriefGenParams): Promise<EnhancedBrief> {
  const stream = await generateBrief(params);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let brief: EnhancedBrief | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") continue;

      try {
        const event = JSON.parse(payload);
        if (event.error) throw new Error(event.error);
        if (event.done && event.brief) {
          brief = event.brief as EnhancedBrief;
        } else if (event.step !== undefined) {
          const pct = Math.round((event.progress || 0) * 100);
          process.stdout.write(`  [Step ${String(event.step).padStart(2)}/12] ${event.label} (${pct}%)\r`);
        }
      } catch (e) {
        if (e instanceof Error && e.message !== "") throw e;
      }
    }
  }

  if (!brief) throw new Error("No brief produced");
  return brief;
}

// --- Main ---

interface TestResult {
  name: string;
  pageType: string;
  niche: string;
  headingsCount: number;
  csvValid: boolean;
  csvScore: number;
  pipelineQuality: number;
  goldStandardCrossRef: number;
  pass: boolean;
}

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║      MULTI-NICHE BRIEF VALIDATION SUITE        ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // --- DB setup: find or create a user for persisting test briefs ---
  const prisma = getPrisma();
  let testUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: "system@lnm.local",
        name: "System (Test Briefs)",
        role: "admin",
      },
    });
    console.log(`  Created system user: ${testUser.id}`);
  }
  console.log(`  Saving briefs to DB under user: ${testUser.email}\n`);

  const results: TestResult[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`\n[${ i + 1}/${testCases.length}] ${tc.name}`);
    console.log("─".repeat(50));

    const t0 = Date.now();

    try {
      const brief = await runBrief(tc.params);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`\n  Generated in ${elapsed}s`);

      // Persist full brief to database
      const savedBrief = await prisma.brief.create({
        data: {
          userId: testUser.id,
          topic: tc.params.topic,
          pageType: tc.params.pageType,
          niche: tc.params.niche,
          location: tc.params.location || null,
          clientName: "Multi-Niche Sample",
          status: "reviewing",
          data: brief as unknown as Record<string, unknown>,
        },
      });
      console.log(`  Saved to DB: ${savedBrief.id}`);

      // CSV validation
      const csvResult = validateBriefAgainstCsvFormat(brief);
      const pipelineScore = brief.qualityReport?.overallScore ?? 0;
      const goldRef = brief.qualityReport?.goldStandardCrossRef?.score ?? 0;

      const pass =
        csvResult.score >= 70 &&
        pipelineScore >= 70 &&
        goldRef >= 60;

      const result: TestResult = {
        name: tc.name,
        pageType: tc.params.pageType,
        niche: tc.params.niche,
        headingsCount: brief.headings.length,
        csvValid: csvResult.valid,
        csvScore: csvResult.score,
        pipelineQuality: pipelineScore,
        goldStandardCrossRef: goldRef,
        pass,
      };

      results.push(result);

      console.log(`  Headings: ${brief.headings.length}`);
      console.log(`  CSV Valid: ${csvResult.valid}  CSV Score: ${csvResult.score}/100`);
      console.log(`  Pipeline Quality: ${pipelineScore}/100`);
      console.log(`  Gold-Standard Cross-Ref: ${goldRef}/100`);
      console.log(`  Result: ${pass ? "PASS ✓" : "FAIL ✗"}`);

      if (csvResult.issues.length > 0) {
        const errors = csvResult.issues.filter((i) => i.severity === "error");
        const warnings = csvResult.issues.filter((i) => i.severity === "warning");
        console.log(`  CSV Issues: ${errors.length} errors, ${warnings.length} warnings`);
      }
    } catch (err) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.error(`\n  FAILED after ${elapsed}s: ${err instanceof Error ? err.message : err}`);
      results.push({
        name: tc.name,
        pageType: tc.params.pageType,
        niche: tc.params.niche,
        headingsCount: 0,
        csvValid: false,
        csvScore: 0,
        pipelineQuality: 0,
        goldStandardCrossRef: 0,
        pass: false,
      });
    }
  }

  // --- Summary Table ---
  console.log("\n\n╔══════════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                           MULTI-NICHE VALIDATION RESULTS                           ║");
  console.log("╠══════════════════════════════════════════════════════════════════════════════════════╣");
  console.log("║ # │ Name                                     │ Hdgs │ CSV │ Qual │ Gold │ Result   ║");
  console.log("╠══════════════════════════════════════════════════════════════════════════════════════╣");

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const name = r.name.padEnd(40).slice(0, 40);
    const hdgs = String(r.headingsCount).padStart(4);
    const csv = String(r.csvScore).padStart(3);
    const qual = String(r.pipelineQuality).padStart(4);
    const gold = String(r.goldStandardCrossRef).padStart(4);
    const pass = r.pass ? "PASS   " : "FAIL   ";
    console.log(`║ ${i + 1} │ ${name} │ ${hdgs} │ ${csv} │ ${qual} │ ${gold} │ ${pass} ║`);
  }

  console.log("╚══════════════════════════════════════════════════════════════════════════════════════╝");

  // --- Overall verdict ---
  const allPassed = results.every((r) => r.pass);
  const passCount = results.filter((r) => r.pass).length;
  console.log(`\nOverall: ${passCount}/${results.length} passed`);
  console.log(`Verdict: ${allPassed ? "ALL PASS" : "SOME FAILURES"}`);

  // --- Write results JSON ---
  const outputPath = resolve(outputDir, "multi-niche-results.json");
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        passCriteria: {
          csvScore: "≥70",
          pipelineQuality: "≥70",
          goldStandardCrossRef: "≥60",
        },
        results,
        summary: {
          total: results.length,
          passed: passCount,
          failed: results.length - passCount,
          allPassed,
        },
      },
      null,
      2
    ),
    "utf-8"
  );
  console.log(`\nResults written to: ${outputPath}`);

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

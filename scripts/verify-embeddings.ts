import "dotenv/config";
import fs from "fs";
import path from "path";
import pg from "pg";
import { embedSingle } from "./lib/openai.js";

const { Pool } = pg;

interface ChunkStats {
  totalChunks: number;
  categories: Record<string, { chunks: number }>;
}

interface TestQuery {
  query: string;
  expectedCategories: string[];
}

const TEST_QUERIES: TestQuery[] = [
  {
    query: "How to build topical authority",
    expectedCategories: ["02-topical-authority"],
  },
  {
    query: "JSON-LD schema markup for local business",
    expectedCategories: ["15-schema-and-structured-data", "07-local-seo"],
  },
  {
    query: "Core Web Vitals LCP optimization",
    expectedCategories: ["06-page-speed-and-performance"],
  },
  {
    query: "Google algorithm update recovery",
    expectedCategories: ["09-algorithm-updates-and-ranking"],
  },
  {
    query: "GMB optimization checklist",
    expectedCategories: ["07-local-seo"],
  },
];

async function main() {
  console.log("=== LNM Embedding Verification ===\n");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const statsPath = path.join(process.cwd(), "data", "chunks", "chunk-stats.json");
  const stats: ChunkStats = JSON.parse(fs.readFileSync(statsPath, "utf-8"));

  let passed = 0;
  let failed = 0;

  // --- Check 1: Total embedded count ---
  console.log("--- Check 1: Total embedding count ---");
  const totalResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM "KnowledgeChunk" WHERE embedding IS NOT NULL`
  );
  const totalEmbedded = parseInt(totalResult.rows[0].count, 10);
  const expectedTotal = stats.totalChunks;

  if (totalEmbedded === expectedTotal) {
    console.log(`  PASS: ${totalEmbedded} embeddings (expected ${expectedTotal})`);
    passed++;
  } else {
    console.log(`  FAIL: ${totalEmbedded} embeddings (expected ${expectedTotal})`);
    failed++;
  }

  // --- Check 2: Per-category counts ---
  console.log("\n--- Check 2: Per-category counts ---");
  const catResult = await pool.query<{ category: string; count: string }>(
    `SELECT category, COUNT(*) as count FROM "KnowledgeChunk" WHERE embedding IS NOT NULL GROUP BY category ORDER BY category`
  );

  let catPassed = 0;
  let catFailed = 0;

  for (const row of catResult.rows) {
    const expected = stats.categories[row.category]?.chunks ?? 0;
    const actual = parseInt(row.count, 10);
    if (actual === expected) {
      catPassed++;
    } else {
      console.log(`  FAIL: ${row.category}: ${actual} (expected ${expected})`);
      catFailed++;
    }
  }

  if (catFailed === 0) {
    console.log(`  PASS: All ${catPassed} categories match expected counts`);
    passed++;
  } else {
    console.log(`  ${catPassed} passed, ${catFailed} failed`);
    failed++;
  }

  // --- Check 3: Test queries ---
  console.log("\n--- Check 3: Test queries ---");
  for (const test of TEST_QUERIES) {
    const embedding = await embedSingle(test.query);
    const embStr = `[${embedding.join(",")}]`;

    const result = await pool.query<{
      category: string;
      title: string;
      similarity: number;
    }>(
      `SELECT category, title,
              1 - (embedding <=> $1::vector(1536)) AS similarity
       FROM "KnowledgeChunk"
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector(1536)
       LIMIT 5`,
      [embStr]
    );

    const topCategories = result.rows.map((r) => r.category);
    const topSimilarities = result.rows.map((r) => Number(r.similarity));
    const hasExpected = test.expectedCategories.some((ec) =>
      topCategories.includes(ec)
    );

    if (hasExpected) {
      console.log(`  PASS: "${test.query}"`);
      console.log(`    Top: ${topCategories.slice(0, 3).join(", ")}`);
      console.log(
        `    Scores: ${topSimilarities.slice(0, 3).map((s) => s.toFixed(4)).join(", ")}`
      );
      passed++;
    } else {
      console.log(`  FAIL: "${test.query}"`);
      console.log(`    Expected: ${test.expectedCategories.join(", ")}`);
      console.log(`    Got: ${topCategories.join(", ")}`);
      failed++;
    }
  }

  // --- Check 4: Similarity score range ---
  console.log("\n--- Check 4: Similarity score range ---");
  // Sample a query and check scores are in 0.3-0.9 range
  const sampleEmbedding = await embedSingle("SEO best practices for 2024");
  const sampleStr = `[${sampleEmbedding.join(",")}]`;
  const rangeResult = await pool.query<{ min_sim: number; max_sim: number }>(
    `SELECT
       MIN(1 - (embedding <=> $1::vector(1536))) as min_sim,
       MAX(1 - (embedding <=> $1::vector(1536))) as max_sim
     FROM "KnowledgeChunk"
     WHERE embedding IS NOT NULL`,
    [sampleStr]
  );

  const minSim = Number(rangeResult.rows[0].min_sim);
  const maxSim = Number(rangeResult.rows[0].max_sim);

  if (maxSim <= 1.0 && maxSim > 0.3 && minSim >= 0.0) {
    console.log(`  PASS: Score range [${minSim.toFixed(4)}, ${maxSim.toFixed(4)}]`);
    passed++;
  } else {
    console.log(`  FAIL: Unexpected score range [${minSim.toFixed(4)}, ${maxSim.toFixed(4)}]`);
    failed++;
  }

  // --- Summary ---
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

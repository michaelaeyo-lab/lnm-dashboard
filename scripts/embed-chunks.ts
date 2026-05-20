import "dotenv/config";
import fs from "fs";
import path from "path";
import { embedTexts } from "./lib/openai.js";
import {
  createPool,
  ensurePgVector,
  upsertChunksWithEmbeddings,
  createIndexes,
  getEmbeddedIds,
  type ChunkRow,
} from "./lib/vector-db.js";

interface RawChunk {
  id: string;
  category: string;
  title: string;
  content: string;
  sourceFile: string | null;
  sourceUrl: string | null;
  sourceType: string | null;
  contentType: string | null;
  tokenCount: number | null;
  chunkIndex: number;
  totalChunks: number;
  headingPath: string[];
}

const CHUNKS_DIR = path.join(process.cwd(), "data", "chunks");
const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 200;
// OpenAI text-embedding-3-small has an 8192 token limit per input.
// Rough estimate: 1 token ≈ 4 chars. Truncate at ~30000 chars to be safe.
// JSON content (strategy snapshots) tokenizes at ~1 token per 2 chars due to
// special characters. 8000 chars guarantees we stay under OpenAI's 8192 token limit.
const MAX_CONTENT_CHARS = 8000;

// Categories in order
const CATEGORIES = [
  "01-semantic-seo",
  "02-topical-authority",
  "03-content-strategy",
  "04-technical-seo",
  "05-on-page-seo",
  "06-page-speed-and-performance",
  "07-local-seo",
  "08-off-page-and-link-building",
  "09-algorithm-updates-and-ranking",
  "10-user-experience",
  "11-ai-and-automation",
  "12-marketing-and-growth",
  "13-case-studies",
  "14-gpt-prompts-and-tools",
  "15-schema-and-structured-data",
  "16-web-security",
  "17-strategy-blueprints",
  "18-content-writing-rules",
  "19-brief-examples",
  "20-brief-methodology",
];

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const startTime = Date.now();
  console.log("=== LNM Embedding Pipeline ===\n");

  // Validate env
  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL not set in .env");
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY not set in .env");
    process.exit(1);
  }

  const pool = createPool();

  try {
    // Step 1: Ensure pgvector
    await ensurePgVector(pool);

    let totalEmbedded = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Step 2: Process each category
    for (const category of CATEGORIES) {
      const filePath = path.join(CHUNKS_DIR, `${category}.json`);
      if (!fs.existsSync(filePath)) {
        console.warn(`[WARN] Missing: ${category}.json — skipping`);
        continue;
      }

      const raw: RawChunk[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      console.log(`\n[${category}] ${raw.length} chunks`);

      // Check which are already embedded (resumability)
      const embeddedIds = await getEmbeddedIds(pool, category);
      const toEmbed = raw.filter((c) => !embeddedIds.has(c.id));
      const skipped = raw.length - toEmbed.length;
      totalSkipped += skipped;

      if (skipped > 0) {
        console.log(`  Skipping ${skipped} already-embedded chunks`);
      }

      if (toEmbed.length === 0) {
        console.log(`  All chunks already embedded ✓`);
        continue;
      }

      // Batch process
      const batches = Math.ceil(toEmbed.length / BATCH_SIZE);
      for (let b = 0; b < batches; b++) {
        const batchChunks = toEmbed.slice(
          b * BATCH_SIZE,
          (b + 1) * BATCH_SIZE
        );
        const texts = batchChunks.map((c) =>
          c.content.length > MAX_CONTENT_CHARS
            ? c.content.slice(0, MAX_CONTENT_CHARS)
            : c.content
        );

        try {
          // Get embeddings from OpenAI
          const embeddings = await embedTexts(texts);

          // Build rows with embeddings
          const rows: ChunkRow[] = batchChunks.map((chunk, i) => ({
            id: chunk.id,
            category: chunk.category,
            title: chunk.title,
            content: chunk.content,
            sourceFile: chunk.sourceFile,
            sourceUrl: chunk.sourceUrl,
            sourceType: chunk.sourceType,
            contentType: chunk.contentType,
            tokenCount: chunk.tokenCount,
            metadata: {
              headingPath: chunk.headingPath,
              chunkIndex: chunk.chunkIndex,
              totalChunks: chunk.totalChunks,
            },
            embedding: embeddings[i],
          }));

          // Upsert to DB
          await upsertChunksWithEmbeddings(pool, rows);
          totalEmbedded += batchChunks.length;

          console.log(
            `  Batch ${b + 1}/${batches}: ${batchChunks.length} chunks embedded`
          );
        } catch (err) {
          totalErrors++;
          console.error(
            `  ERROR batch ${b + 1}/${batches}:`,
            err instanceof Error ? err.message : err
          );
        }

        // Rate limit delay
        if (b < batches - 1) {
          await sleep(BATCH_DELAY_MS);
        }
      }
    }

    // Step 3: Create indexes
    console.log("\n--- Creating indexes ---");
    await createIndexes(pool);

    // Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log("\n=== Summary ===");
    console.log(`  Embedded:  ${totalEmbedded}`);
    console.log(`  Skipped:   ${totalSkipped} (already done)`);
    console.log(`  Errors:    ${totalErrors}`);
    console.log(`  Time:      ${elapsed}s`);
    console.log(`  Total in DB: ${totalEmbedded + totalSkipped}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

/**
 * Import Knowledge Base from JSON
 *
 * Reads a knowledge export JSON file (produced by export-knowledge.ts)
 * and upserts all chunks back into the database.
 *
 * Embeddings are NOT imported -- they must be regenerated separately
 * by running: npm run embed:chunks
 *
 * Usage: npx tsx scripts/import-knowledge.ts <path-to-export.json>
 *
 * Example:
 *   npx tsx scripts/import-knowledge.ts ../backups/knowledge-export-2025-05-14.json
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExportedChunk {
  id: string;
  category: string;
  title: string;
  content: string;
  sourceFile: string | null;
  sourceUrl: string | null;
  sourceType: string | null;
  contentType: string | null;
  tokenCount: number | null;
  metadata: Prisma.JsonValue | null;
  createdAt: string;
}

interface ExportFile {
  metadata: {
    exportDate: string;
    totalChunks: number;
    totalCategories: number;
    categories: Array<{ name: string; count: number }>;
  };
  chunks: ExportedChunk[];
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Parse CLI argument
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.error("Usage: npx tsx scripts/import-knowledge.ts <path-to-export.json>");
    console.error("Example: npx tsx scripts/import-knowledge.ts ../backups/knowledge-export-2025-05-14.json");
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), inputArg);

  if (!fs.existsSync(inputPath)) {
    console.error(`[import] ERROR: File not found: ${inputPath}`);
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("[import] ERROR: DATABASE_URL not set in .env");
    process.exit(1);
  }

  console.log(`[import] Reading export file: ${inputPath}`);

  const raw = fs.readFileSync(inputPath, "utf-8");
  let exportData: ExportFile;

  try {
    exportData = JSON.parse(raw) as ExportFile;
  } catch {
    console.error("[import] ERROR: Failed to parse JSON file");
    process.exit(1);
  }

  if (!exportData.chunks || !Array.isArray(exportData.chunks)) {
    console.error('[import] ERROR: Invalid export format -- missing "chunks" array');
    process.exit(1);
  }

  console.log(`[import] Export date: ${exportData.metadata?.exportDate ?? "unknown"}`);
  console.log(`[import] Chunks to import: ${exportData.chunks.length}`);

  // Connect to database
  const adapter = new PrismaPg(process.env.DATABASE_URL!);
  const prisma = new PrismaClient({ adapter });

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const total = exportData.chunks.length;
    const BATCH_LOG_INTERVAL = 100;

    for (let i = 0; i < total; i++) {
      const chunk = exportData.chunks[i];

      // Validate required fields
      if (!chunk.id || !chunk.category || !chunk.title || !chunk.content) {
        console.warn(
          `[import] SKIP chunk at index ${i}: missing required fields (id, category, title, or content)`
        );
        skipped++;
        continue;
      }

      try {
        // Check if chunk already exists
        const existing = await prisma.knowledgeChunk.findUnique({
          where: { id: chunk.id },
          select: { id: true, content: true },
        });

        if (existing) {
          // Check if content differs -- only update if changed
          if (existing.content === chunk.content) {
            skipped++;
          } else {
            await prisma.knowledgeChunk.update({
              where: { id: chunk.id },
              data: {
                category: chunk.category,
                title: chunk.title,
                content: chunk.content,
                sourceFile: chunk.sourceFile,
                sourceUrl: chunk.sourceUrl,
                sourceType: chunk.sourceType,
                contentType: chunk.contentType,
                tokenCount: chunk.tokenCount,
                metadata: chunk.metadata ?? Prisma.JsonNull,
              },
            });
            updated++;
          }
        } else {
          // Insert new chunk
          await prisma.knowledgeChunk.create({
            data: {
              id: chunk.id,
              category: chunk.category,
              title: chunk.title,
              content: chunk.content,
              sourceFile: chunk.sourceFile,
              sourceUrl: chunk.sourceUrl,
              sourceType: chunk.sourceType,
              contentType: chunk.contentType,
              tokenCount: chunk.tokenCount,
              metadata: chunk.metadata ?? Prisma.JsonNull,
            },
          });
          inserted++;
        }
      } catch (err) {
        errors++;
        console.error(
          `[import] ERROR on chunk "${chunk.id}":`,
          err instanceof Error ? err.message : err
        );
      }

      // Progress logging
      if ((i + 1) % BATCH_LOG_INTERVAL === 0 || i + 1 === total) {
        console.log(`[import] Progress: ${i + 1}/${total}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  // Summary
  console.log("");
  console.log("─── Import Summary ──────────────────────────────");
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Updated:  ${updated}`);
  console.log(`  Skipped:  ${skipped} (unchanged or missing required fields)`);
  console.log(`  Errors:   ${errors}`);
  console.log(`  Total:    ${inserted + updated + skipped + errors}`);
  console.log("─────────────────────────────────────────────────");

  if (inserted > 0 || updated > 0) {
    console.log("");
    console.log(
      "[import] NOTE: Embeddings were not imported. Run 'npm run embed:chunks' to regenerate them."
    );
  }

  if (errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[import] Fatal error:", err);
  process.exit(1);
});

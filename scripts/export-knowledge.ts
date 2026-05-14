/**
 * Export Knowledge Base to JSON
 *
 * Connects to Postgres via Prisma, exports all KnowledgeChunk rows
 * (excluding embeddings) to a JSON file with metadata.
 *
 * Output: ../../backups/knowledge-export-{date}.json
 *
 * Usage: npx tsx scripts/export-knowledge.ts
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ─── Configuration ───────────────────────────────────────────────────────────

const BACKUPS_DIR = path.resolve(process.cwd(), "..", "backups");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDateStamp(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

function ensureBackupsDir(): void {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    console.log(`[export] Created backups directory: ${BACKUPS_DIR}`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("[export] ERROR: DATABASE_URL not set in .env");
    process.exit(1);
  }

  console.log("[export] Connecting to database...");

  const adapter = new PrismaPg(process.env.DATABASE_URL!);
  const prisma = new PrismaClient({ adapter });

  try {
    // Query all KnowledgeChunks, selecting every field except embedding
    // (embedding is Unsupported("vector(1536)") and excluded by Prisma automatically)
    const chunks = await prisma.knowledgeChunk.findMany({
      select: {
        id: true,
        category: true,
        title: true,
        content: true,
        sourceFile: true,
        sourceUrl: true,
        sourceType: true,
        contentType: true,
        tokenCount: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    });

    console.log(`[export] Found ${chunks.length} knowledge chunks`);

    if (chunks.length === 0) {
      console.log("[export] No chunks to export. Exiting.");
      return;
    }

    // Build category summary
    const categoryMap: Record<string, number> = {};
    for (const chunk of chunks) {
      categoryMap[chunk.category] = (categoryMap[chunk.category] || 0) + 1;
    }

    const categories = Object.entries(categoryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Build export payload
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalChunks: chunks.length,
        totalCategories: categories.length,
        categories,
        note: "Embeddings are excluded from this export. Re-run embed:chunks after import to regenerate them.",
      },
      chunks,
    };

    // Write to file
    ensureBackupsDir();
    const dateStamp = getDateStamp();
    const filename = `knowledge-export-${dateStamp}.json`;
    const outputPath = path.join(BACKUPS_DIR, filename);

    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), "utf-8");

    const stats = fs.statSync(outputPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`[export] Export complete: ${filename} (${sizeMB} MB)`);
    console.log(`[export] Total chunks: ${chunks.length}`);
    console.log(`[export] Categories (${categories.length}):`);
    for (const cat of categories) {
      console.log(`[export]   ${cat.name}: ${cat.count} chunks`);
    }
    console.log(`[export] Output: ${outputPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[export] Fatal error:", err);
  process.exit(1);
});

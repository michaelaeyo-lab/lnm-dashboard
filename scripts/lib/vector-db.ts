import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

export interface ChunkRow {
  id: string;
  category: string;
  title: string;
  content: string;
  sourceFile: string | null;
  sourceUrl: string | null;
  sourceType: string | null;
  contentType: string | null;
  tokenCount: number | null;
  metadata: Record<string, unknown> | null;
  embedding: number[];
}

/** Create a pg Pool from DATABASE_URL. */
export function createPool(): pg.Pool {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

/** Ensure pgvector extension exists. */
export async function ensurePgVector(pool: pg.Pool): Promise<void> {
  await pool.query("CREATE EXTENSION IF NOT EXISTS vector;");
  console.log("[vector-db] pgvector extension ensured");
}

/**
 * Bulk upsert chunks with embeddings.
 * Uses multi-row INSERT ... ON CONFLICT DO UPDATE.
 * Batches of up to 50 rows per statement to stay within param limits.
 */
export async function upsertChunksWithEmbeddings(
  pool: pg.Pool,
  chunks: ChunkRow[]
): Promise<void> {
  if (chunks.length === 0) return;

  // Build multi-row insert. pg has a 65535 param limit; with 10 params per row, 50 rows = 500 params.
  const BATCH = 50;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const values: unknown[] = [];
    const placeholders: string[] = [];

    batch.forEach((chunk, idx) => {
      const offset = idx * 10;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}::jsonb)`
      );
      values.push(
        chunk.id,
        chunk.category,
        chunk.title,
        chunk.content,
        chunk.sourceFile,
        chunk.sourceUrl,
        chunk.sourceType,
        chunk.contentType,
        chunk.tokenCount,
        chunk.metadata ? JSON.stringify(chunk.metadata) : null
      );
    });

    // Embedding set via raw SQL string — pgvector needs '[ ]'::vector format
    // We build the embedding literals inline since pg can't parameterize vector arrays
    const embeddingCases = batch
      .map(
        (chunk, idx) =>
          `WHEN id = $${idx * 10 + 1} THEN '[${chunk.embedding.join(",")}]'::vector(1536)`
      )
      .join(" ");

    const sql = `
      INSERT INTO "KnowledgeChunk" (id, category, title, content, "sourceFile", "sourceUrl", "sourceType", "contentType", "tokenCount", metadata)
      VALUES ${placeholders.join(", ")}
      ON CONFLICT (id) DO UPDATE SET
        category = EXCLUDED.category,
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        "sourceFile" = EXCLUDED."sourceFile",
        "sourceUrl" = EXCLUDED."sourceUrl",
        "sourceType" = EXCLUDED."sourceType",
        "contentType" = EXCLUDED."contentType",
        "tokenCount" = EXCLUDED."tokenCount",
        metadata = EXCLUDED.metadata;
    `;

    await pool.query(sql, values);

    // Now update embeddings separately (can't parameterize vector type easily)
    const embeddingUpdates = batch.map(
      (chunk) =>
        `UPDATE "KnowledgeChunk" SET embedding = '[${chunk.embedding.join(",")}]'::vector(1536) WHERE id = '${chunk.id.replace(/'/g, "''")}'`
    );
    for (const update of embeddingUpdates) {
      await pool.query(update);
    }
  }
}

/** Create IVFFlat index for vector search and GIN index for full-text search.
 *  IVFFlat is used instead of HNSW because it requires much less memory during build.
 *  For 14k vectors, 100 lists provides good recall/speed tradeoff.
 */
export async function createIndexes(pool: pg.Pool): Promise<void> {
  console.log("[vector-db] Creating IVFFlat index on embeddings...");
  // Increase maintenance_work_mem for index build (default 64MB is too small for 14k vectors)
  await pool.query("SET maintenance_work_mem = '256MB'");
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_kc_embedding
    ON "KnowledgeChunk" USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
  `);

  console.log("[vector-db] Creating GIN index for full-text search...");
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_kc_content_fts
    ON "KnowledgeChunk" USING gin(to_tsvector('english', content));
  `);

  console.log("[vector-db] Indexes created");
}

/** Get IDs of chunks that already have embeddings for a given category. */
export async function getEmbeddedIds(
  pool: pg.Pool,
  category: string
): Promise<Set<string>> {
  const result = await pool.query<{ id: string }>(
    `SELECT id FROM "KnowledgeChunk" WHERE category = $1 AND embedding IS NOT NULL`,
    [category]
  );
  return new Set(result.rows.map((r) => r.id));
}

import "dotenv/config";
import pg from "pg";
import OpenAI from "openai";

const { Pool } = pg;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  console.log("=== Phase 3 Validation ===\n");

  // 1. Total count
  const total = await pool.query(
    'SELECT COUNT(*) as c FROM "KnowledgeChunk" WHERE embedding IS NOT NULL'
  );
  console.log("Total embeddings:", total.rows[0].c);

  // 2. Per-category
  const cats = await pool.query(
    'SELECT category, COUNT(*) as c FROM "KnowledgeChunk" GROUP BY category ORDER BY category'
  );
  console.log("\nPer category:");
  for (const r of cats.rows) {
    console.log(`  ${r.category}: ${r.c}`);
  }

  // 3. Index check
  const idx = await pool.query(
    "SELECT indexname FROM pg_indexes WHERE tablename = 'KnowledgeChunk' ORDER BY indexname"
  );
  console.log("\nIndexes:");
  for (const r of idx.rows) {
    console.log(`  ${r.indexname}`);
  }

  // 4. Live similarity searches
  const queries = [
    "how to build topical authority for a new website",
    "technical SEO crawl budget optimization",
    "GMB listing optimization for local plumber",
  ];

  for (const q of queries) {
    const resp = await ai.embeddings.create({
      model: "text-embedding-3-small",
      dimensions: 1536,
      input: q,
    });
    const emb = `[${resp.data[0].embedding.join(",")}]`;

    const results = await pool.query(
      `SELECT category, title, 1 - (embedding <=> $1::vector(1536)) AS similarity
       FROM "KnowledgeChunk"
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector(1536)
       LIMIT 5`,
      [emb]
    );

    console.log(`\n--- Query: "${q}" ---`);
    for (const r of results.rows) {
      const sim = Number(r.similarity).toFixed(4);
      const title = r.title.length > 55 ? r.title.slice(0, 55) + "..." : r.title;
      console.log(`  [${sim}] ${r.category} | ${title}`);
    }
  }

  // 5. Confirm add-new-data path
  console.log("\n=== How to add new knowledge ===");
  console.log("1. Add .md files to consolidated-knowledge/{category}/");
  console.log("2. npm run chunk:knowledge");
  console.log("3. npm run embed:chunks  (skips already-done, only embeds new)");

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

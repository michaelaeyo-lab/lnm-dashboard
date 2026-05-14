import { getPrisma } from "./db";
import OpenAI from "openai";

// --- Types ---

export interface RetrievalOptions {
  query: string;
  categories?: string[];
  topK?: number;
  similarityThreshold?: number;
  sourceTypes?: string[];
  contentTypes?: string[];
}

export interface RetrievedChunk {
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
  similarity: number;
  ftsRank: number;
  combinedScore: number;
}

// --- Agent Pool Mapping ---

const AGENT_POOLS: Record<string, string[] | null> = {
  content: [
    "03-content-strategy",
    "05-on-page-seo",
    "13-case-studies",
    "18-content-writing-rules",
  ],
  technical: [
    "04-technical-seo",
    "06-page-speed-and-performance",
    "15-schema-and-structured-data",
    "16-web-security",
  ],
  "local-seo": ["07-local-seo", "12-marketing-and-growth"],
  "on-page": ["05-on-page-seo", "01-semantic-seo", "02-topical-authority"],
  "off-page": ["08-off-page-and-link-building"],
  strategy: [
    "02-topical-authority",
    "17-strategy-blueprints",
    "13-case-studies",
  ],
  "writing-rules": ["18-content-writing-rules"],
  "brief-examples": ["19-brief-examples"],
  all: null, // search everything
};

// --- OpenAI Embedding ---

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/** Embed a query string for search. */
export async function embedQuery(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    dimensions: 1536,
    input: text,
  });
  return response.data[0].embedding;
}

// --- Core Retrieval ---

/**
 * Hybrid search: vector cosine similarity (0.7 weight) + full-text ts_rank (0.3 weight).
 * Fetches 3x topK candidates from vector search, reranks with keyword scores.
 */
export async function retrieveChunks(
  options: RetrievalOptions
): Promise<RetrievedChunk[]> {
  const {
    query,
    categories,
    topK = 10,
    similarityThreshold = 0.3,
    sourceTypes,
    contentTypes,
  } = options;

  const prisma = getPrisma();
  const queryEmbedding = await embedQuery(query);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  // Build WHERE clauses
  const conditions: string[] = ["embedding IS NOT NULL"];
  const params: unknown[] = [embeddingStr, topK * 3, query];
  let paramIdx = 4;

  if (categories && categories.length > 0) {
    conditions.push(`category = ANY($${paramIdx}::text[])`);
    params.push(categories);
    paramIdx++;
  }

  if (sourceTypes && sourceTypes.length > 0) {
    conditions.push(`"sourceType" = ANY($${paramIdx}::text[])`);
    params.push(sourceTypes);
    paramIdx++;
  }

  if (contentTypes && contentTypes.length > 0) {
    conditions.push(`"contentType" = ANY($${paramIdx}::text[])`);
    params.push(contentTypes);
    paramIdx++;
  }

  const whereClause = conditions.join(" AND ");

  // Hybrid search SQL:
  // 1. Vector similarity via cosine distance (1 - distance = similarity)
  // 2. Full-text ts_rank for keyword matching
  // 3. Combined score = 0.7 * similarity + 0.3 * normalized_fts_rank
  const sql = `
    WITH vector_candidates AS (
      SELECT
        id, category, title, content,
        "sourceFile", "sourceUrl", "sourceType", "contentType",
        "tokenCount", metadata,
        1 - (embedding <=> $1::vector(1536)) AS similarity,
        ts_rank(to_tsvector('english', content), plainto_tsquery('english', $3)) AS fts_rank
      FROM "KnowledgeChunk"
      WHERE ${whereClause}
      ORDER BY embedding <=> $1::vector(1536)
      LIMIT $2
    ),
    max_fts AS (
      SELECT GREATEST(MAX(fts_rank), 0.0001) AS max_rank FROM vector_candidates
    )
    SELECT
      vc.id, vc.category, vc.title, vc.content,
      vc."sourceFile", vc."sourceUrl", vc."sourceType", vc."contentType",
      vc."tokenCount", vc.metadata,
      vc.similarity,
      vc.fts_rank,
      (0.7 * vc.similarity + 0.3 * (vc.fts_rank / mf.max_rank)) AS "combinedScore"
    FROM vector_candidates vc, max_fts mf
    WHERE vc.similarity >= ${similarityThreshold}
    ORDER BY "combinedScore" DESC
    LIMIT ${topK}
  `;

  const results = await prisma.$queryRawUnsafe<RetrievedChunk[]>(
    sql,
    ...params
  );

  return results.map((r) => ({
    ...r,
    similarity: Number(r.similarity),
    ftsRank: Number(r.ftsRank),
    combinedScore: Number(r.combinedScore),
  }));
}

// --- Agent Convenience Functions ---

/**
 * Retrieve chunks for a specific agent pool.
 * Maps pool name to category list.
 */
export async function retrieveForAgent(
  agentPool: string,
  query: string,
  topK = 10
): Promise<RetrievedChunk[]> {
  const categories = AGENT_POOLS[agentPool];
  if (categories === undefined) {
    throw new Error(
      `Unknown agent pool: "${agentPool}". Valid pools: ${Object.keys(AGENT_POOLS).join(", ")}`
    );
  }
  return retrieveChunks({
    query,
    categories: categories ?? undefined,
    topK,
  });
}

/**
 * Retrieve across multiple agent pools, deduplicating by chunk ID.
 */
export async function retrieveAcrossPools(
  query: string,
  pools: string[],
  topK = 10
): Promise<RetrievedChunk[]> {
  // Collect all categories from requested pools
  const allCategories = new Set<string>();
  let searchAll = false;

  for (const pool of pools) {
    const cats = AGENT_POOLS[pool];
    if (cats === undefined) {
      throw new Error(`Unknown agent pool: "${pool}"`);
    }
    if (cats === null) {
      searchAll = true;
      break;
    }
    cats.forEach((c) => allCategories.add(c));
  }

  return retrieveChunks({
    query,
    categories: searchAll ? undefined : Array.from(allCategories),
    topK,
  });
}

// --- Page-Type & Brief Retrieval ---

/** Pool sets per page type — determines which knowledge pools to search. */
const PAGE_TYPE_POOLS: Record<string, string[]> = {
  service: ["content", "on-page", "strategy", "writing-rules"],
  location: ["content", "on-page", "local-seo", "writing-rules"],
  blog: ["content", "on-page", "strategy", "writing-rules"],
  landing: ["content", "on-page", "strategy", "writing-rules"],
};

/**
 * Retrieve chunks tailored to a specific page type.
 * Merges relevant agent pools and runs a single hybrid search across them.
 */
export async function retrieveForPageType(
  pageType: "service" | "location" | "blog" | "landing",
  query: string,
  topK?: number
): Promise<RetrievedChunk[]> {
  const pools = PAGE_TYPE_POOLS[pageType];
  if (!pools) {
    throw new Error(
      `Unknown page type: "${pageType}". Valid types: ${Object.keys(PAGE_TYPE_POOLS).join(", ")}`
    );
  }
  return retrieveAcrossPools(query, pools, topK ?? 10);
}

/**
 * Retrieve brief examples that demonstrate how specific writing-rule codes
 * (e.g. "FS", "PAA", "NER") are applied in real content briefs.
 * Searches category 19 (brief-examples) for chunks containing those rule codes.
 */
export async function retrieveRuleExamples(
  ruleCodes: string[],
  topK?: number
): Promise<RetrievedChunk[]> {
  if (ruleCodes.length === 0) return [];

  // Build a query that emphasizes the rule codes so both vector similarity
  // and full-text search surface relevant examples.
  const query = `content writing rules: ${ruleCodes.join(" ")} — brief examples applying these rules`;

  const results = await retrieveChunks({
    query,
    categories: ["19-brief-examples"],
    topK: topK ?? 10,
  });

  // Post-filter: keep only chunks whose content mentions at least one of the
  // requested rule codes (case-insensitive). This prevents false positives from
  // vector similarity alone.
  const codePatterns = ruleCodes.map((c) => new RegExp(`\\b${c}\\b`, "i"));
  return results.filter((chunk) =>
    codePatterns.some((pattern) => pattern.test(chunk.content))
  );
}

/**
 * Retrieve briefs similar to the given topic and page type from category 19
 * (brief-examples). Used as few-shot examples when generating new briefs.
 */
export async function retrieveSimilarBriefs(
  topic: string,
  pageType: string,
  topK?: number
): Promise<RetrievedChunk[]> {
  const query = `${pageType} page brief for: ${topic}`;

  return retrieveChunks({
    query,
    categories: ["19-brief-examples"],
    topK: topK ?? 5,
  });
}

# Retrieval System

## Overview

The retrieval system lives in `app/lib/retrieval.ts`. It is the single interface that all agents, chat interfaces, and tools use to search the knowledge base. It implements **hybrid search** — combining vector similarity with full-text keyword matching for better results than either alone.

## How Hybrid Search Works

```
User Query: "how to optimize title tags for semantic SEO"
                    │
                    ▼
           ┌───────────────┐
           │  embedQuery()  │ → OpenAI API → 1536-dim vector
           └───────┬───────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │  PostgreSQL: Vector Search   │
    │  ORDER BY embedding <=> $1   │
    │  LIMIT topK * 3              │  ← Fetch 3x candidates
    │  (cosine similarity)         │
    └──────────────┬───────────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │  PostgreSQL: FTS Reranking   │
    │  ts_rank(tsvector, tsquery)  │
    └──────────────┬───────────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │  Combined Score              │
    │  = 0.7 * similarity          │  ← Vector weight
    │  + 0.3 * normalized_fts_rank │  ← Keyword weight
    │                              │
    │  ORDER BY combinedScore DESC │
    │  LIMIT topK                  │
    └──────────────┬───────────────┘
                   │
                   ▼
            RetrievedChunk[]
```

**Why hybrid?**
- Vector search finds semantically similar content even with different wording
- Full-text search ensures exact keyword matches rank higher
- The 0.7/0.3 weighting gives priority to meaning while still rewarding keyword matches

## API: Three Functions

### 1. `retrieveChunks(options)` — Full control

```typescript
import { retrieveChunks } from "@/app/lib/retrieval";

const results = await retrieveChunks({
  query: "how to build topical authority",
  categories: ["02-topical-authority", "01-semantic-seo"],  // optional filter
  topK: 10,                    // max results (default 10)
  similarityThreshold: 0.3,    // min score (default 0.3)
  sourceTypes: ["web"],        // optional: "web", "youtube", "gpt-prompt", "strategy-snapshot"
  contentTypes: ["reference"], // optional: "reference", "strategic", "tool", "blueprint"
});

// Each result:
// {
//   id, category, title, content, sourceFile, sourceUrl,
//   sourceType, contentType, tokenCount, metadata,
//   similarity: 0.58,      // vector cosine score
//   ftsRank: 0.12,         // full-text rank
//   combinedScore: 0.44    // weighted hybrid score
// }
```

### 2. `retrieveForAgent(pool, query, topK?)` — Agent convenience

```typescript
import { retrieveForAgent } from "@/app/lib/retrieval";

// Search only categories relevant to a content-writing agent
const results = await retrieveForAgent("content", "service page for plumber", 10);

// Search only technical SEO categories
const results = await retrieveForAgent("technical", "crawl budget problems", 5);
```

### 3. `retrieveAcrossPools(query, pools, topK?)` — Multi-pool

```typescript
import { retrieveAcrossPools } from "@/app/lib/retrieval";

// Search content + strategy pools together, deduplicated
const results = await retrieveAcrossPools(
  "local SEO service page structure",
  ["content", "local-seo", "strategy"],
  15
);
```

## Agent Pool Mapping

Each pool name maps to specific knowledge categories:

| Pool | Categories | Use Case |
|------|-----------|----------|
| `content` | 03-content-strategy, 05-on-page-seo, 13-case-studies | Content writing, editorial planning |
| `technical` | 04-technical-seo, 06-page-speed, 15-schema, 16-web-security | Technical audits, fixes |
| `local-seo` | 07-local-seo, 12-marketing-and-growth | GMB optimization, local search |
| `on-page` | 05-on-page-seo, 01-semantic-seo, 02-topical-authority | Title tags, headings, keyword strategy |
| `off-page` | 08-off-page-and-link-building | Link building, outreach |
| `strategy` | 02-topical-authority, 17-strategy-blueprints, 13-case-studies | Site architecture, authority building |
| `all` | (no filter — searches everything) | General queries, exploration |

### Modifying pools

Edit the `AGENT_POOLS` object in `app/lib/retrieval.ts`:

```typescript
const AGENT_POOLS: Record<string, string[] | null> = {
  content: ["03-content-strategy", "05-on-page-seo", "13-case-studies"],
  // Add your own:
  "my-custom-pool": ["01-semantic-seo", "04-technical-seo"],
};
```

## HTTP API

### `GET /api/search`

```
GET /api/search?q=topical+authority&categories=01-semantic-seo,02-topical-authority&topK=5
```

**Parameters:**
| Param | Required | Description |
|-------|----------|-------------|
| `q` | Yes | Search query text |
| `categories` | No | Comma-separated category filter |
| `topK` | No | Max results (default 10) |
| `sourceTypes` | No | Comma-separated: web, youtube, gpt-prompt, strategy-snapshot |
| `contentTypes` | No | Comma-separated: reference, strategic, tool, blueprint |

**Response:**
```json
{
  "results": [
    {
      "id": "02-topical-authority--topical-map-guide--chunk-1",
      "category": "02-topical-authority",
      "title": "How to Create a Topical Map",
      "content": "A topical map is a hierarchical structure...",
      "sourceUrl": "https://www.holisticseo.digital/topical-authority/topical-map/",
      "similarity": 0.5841,
      "ftsRank": 0.0832,
      "combinedScore": 0.4339
    }
  ],
  "count": 5
}
```

## Performance

| Metric | Value |
|--------|-------|
| Query embedding time | ~200ms (OpenAI API round-trip) |
| Vector search time | ~10-50ms (IVFFlat index) |
| FTS reranking time | ~5-10ms (GIN index) |
| Total per query | ~250-300ms |

The bottleneck is the OpenAI embedding call. If latency matters, you can cache frequently-used query embeddings.

## Tuning

### Similarity threshold
Default is 0.3. Lower it to get more results (less relevant), raise it to get fewer (more precise).
- 0.2 = broad, exploratory queries
- 0.3 = balanced (default)
- 0.5 = strict, high-relevance only

### topK
Default is 10. For chat interfaces, 5-8 chunks is usually enough context. For comprehensive content generation, use 15-20.

### Vector/FTS weight balance
In `retrieval.ts`, the weights are hardcoded:
```
combinedScore = 0.7 * similarity + 0.3 * normalized_fts_rank
```
Increase FTS weight (e.g., 0.5/0.5) if keyword precision matters more. Decrease it (e.g., 0.9/0.1) if semantic similarity is all you need.

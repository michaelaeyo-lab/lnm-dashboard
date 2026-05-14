# LNM Knowledge System — Architecture

## Overview

This is a **Retrieval-Augmented Generation (RAG)** system built on top of a curated SEO knowledge base. It stores 14,130 knowledge chunks from 961 source files across 17 SEO categories, embedded as 1536-dimensional vectors in PostgreSQL via pgvector. Any AI agent or chat interface can query this system to retrieve grounded, source-backed knowledge before generating content.

The system does NOT generate content itself — it **retrieves relevant knowledge** that gets fed into an LLM prompt as context. This prevents hallucination and keeps all output grounded in Koray Tugberk Gubur's proven SEO methodology.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| App Framework | Next.js 16 (App Router) | Dashboard, API routes, server components |
| Database | PostgreSQL on Railway | Stores chunks, embeddings, user data |
| Vector Search | pgvector extension | Cosine similarity search on embeddings |
| Full-Text Search | PostgreSQL tsvector/tsquery | Keyword matching for hybrid reranking |
| ORM | Prisma 7.8 + PrismaPg adapter | Schema management, typed queries |
| Embeddings | OpenAI text-embedding-3-small | 1536-dim vectors, $0.02/1M tokens |
| Runtime | Node.js + tsx | Scripts run via `npx tsx` |

## Data Pipeline

```
Source Content (749 files)
    │
    ▼
Phase 2: Consolidation (965 files across 17 categories)
    │  scraped-content/ → consolidated-knowledge/
    │  Files routed by topic, multi-category where relevant
    │
    ▼
Phase 2.5: Chunking (14,130 chunks)
    │  consolidated-knowledge/ → lnm-dashboard/data/chunks/
    │  5 strategies: heading-split, sentence-boundary, keep-whole,
    │  section-split, structured-split
    │
    ▼
Phase 3: Embedding + Storage
    │  data/chunks/*.json → OpenAI API → PostgreSQL
    │  Each chunk gets a 1536-dim vector embedding
    │
    ▼
Retrieval Layer (app/lib/retrieval.ts)
    │  Query → embed → hybrid search → ranked results
    │
    ▼
Consumers (Phase 5+)
    Chat interface, content agents, dashboard tools
```

## System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App (lnm-dashboard/)         │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ app/api/     │  │ app/lib/     │  │ app/         │  │
│  │ search/      │  │ retrieval.ts │  │ (future UI)  │  │
│  │ route.ts     │  │ db.ts        │  │              │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘  │
│         │                 │                             │
│         └────────┬────────┘                             │
│                  │                                      │
│         ┌────────▼────────┐                             │
│         │   getPrisma()   │                             │
│         │  $queryRawUnsafe│                             │
│         └────────┬────────┘                             │
└──────────────────┼──────────────────────────────────────┘
                   │
          ┌────────▼────────┐     ┌──────────────────┐
          │  Railway Postgres│◄────│  OpenAI API      │
          │  + pgvector     │     │  (embed queries)  │
          │                 │     └──────────────────┘
          │  Tables:        │
          │  - KnowledgeChunk│ (14,130 rows + vectors)
          │  - User          │
          │  - Generation    │
          │  - Phase/Task    │
          │                 │
          │  Indexes:       │
          │  - IVFFlat      │ (vector cosine search)
          │  - GIN          │ (full-text search)
          └─────────────────┘
```

## Key Files

### Scripts (offline pipelines)
| File | Purpose |
|------|---------|
| `scripts/chunk-knowledge.ts` | Splits consolidated .md files into chunks |
| `scripts/embed-chunks.ts` | Embeds chunks via OpenAI, upserts to DB |
| `scripts/verify-embeddings.ts` | Validates embedding counts and search quality |
| `scripts/validate-phase3.ts` | Live DB status check with sample queries |
| `scripts/lib/openai.ts` | OpenAI embeddings wrapper |
| `scripts/lib/vector-db.ts` | pg Pool helpers for bulk vector operations |

### App (runtime)
| File | Purpose |
|------|---------|
| `app/lib/db.ts` | Prisma client singleton (PrismaPg adapter) |
| `app/lib/retrieval.ts` | Core retrieval functions — all agents import this |
| `app/api/search/route.ts` | HTTP search endpoint for testing/UI |
| `prisma/schema.prisma` | Database schema definition |

### Data
| File | Purpose |
|------|---------|
| `data/chunks/{category}.json` | Chunk JSON files (17 categories) |
| `data/chunks/all-chunks.json` | All chunks combined |
| `data/chunks/chunk-stats.json` | Statistics per category |

## Design Decisions

1. **pgvector over dedicated vector DB** — Railway already runs Postgres; adding pgvector avoids a separate service, reduces cost, and keeps all data in one place.

2. **Hybrid search (vector + FTS)** — Pure vector search misses keyword matches; pure FTS misses semantic similarity. Weighted combination (0.7 vector, 0.3 FTS) gives best results.

3. **IVFFlat over HNSW index** — HNSW requires more memory to build than Railway's allocation allows. IVFFlat (100 lists) provides good recall with lower memory.

4. **Agent pools** — Instead of searching all 14k chunks, each agent type searches only its relevant categories. A content agent doesn't need web-security chunks.

5. **Resumable pipeline** — The embed script checks for existing embeddings before processing. Safe to re-run after crashes or when adding new content.

6. **Deterministic chunk IDs** — Chunk IDs are generated from content hashes during chunking, not random CUIDs. This enables upsert-on-conflict and deduplication.

7. **Content truncation for embedding** — Some JSON snapshot chunks exceed OpenAI's 8192 token limit. Content is truncated to 8000 chars before embedding to stay safe.

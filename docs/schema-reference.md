# Schema Reference

## Database: PostgreSQL (Railway) with pgvector

### KnowledgeChunk Table

The core table storing all knowledge chunks and their vector embeddings.

```sql
CREATE TABLE "KnowledgeChunk" (
    id          TEXT PRIMARY KEY,          -- deterministic ID: "{category}--{filename}--chunk-{N}"
    category    TEXT NOT NULL,             -- e.g. "01-semantic-seo", "04-technical-seo"
    title       TEXT NOT NULL,             -- chunk/article title
    content     TEXT NOT NULL,             -- the actual text content
    "sourceFile" TEXT,                     -- original filename in consolidated-knowledge/
    "sourceUrl"  TEXT,                     -- original web URL or YouTube link
    "sourceType" TEXT,                     -- "web" | "youtube" | "gpt-prompt" | "strategy-snapshot"
    "contentType" TEXT,                    -- "reference" | "strategic" | "tool" | "blueprint"
    "tokenCount" INTEGER,                 -- estimated token count (tiktoken-based)
    metadata    JSONB,                     -- { headingPath: string[], chunkIndex: number, totalChunks: number }
    embedding   vector(1536),              -- OpenAI text-embedding-3-small vector
    "createdAt" TIMESTAMP DEFAULT now()
);
```

### Indexes

| Index | Type | Column(s) | Purpose |
|-------|------|-----------|---------|
| `KnowledgeChunk_pkey` | B-tree | id | Primary key lookup |
| `KnowledgeChunk_category_idx` | B-tree | category | Filter by category |
| `KnowledgeChunk_sourceType_idx` | B-tree | sourceType | Filter by source type |
| `KnowledgeChunk_contentType_idx` | B-tree | contentType | Filter by content type |
| `idx_kc_embedding` | IVFFlat | embedding | Vector cosine similarity search (100 lists) |
| `idx_kc_content_fts` | GIN | to_tsvector('english', content) | Full-text keyword search |

### Prisma Schema

```prisma
model KnowledgeChunk {
  id          String                          @id
  category    String
  title       String
  content     String
  sourceFile  String?
  sourceUrl   String?
  sourceType  String?
  contentType String?
  tokenCount  Int?
  metadata    Json?
  embedding   Unsupported("vector(1536)")?
  createdAt   DateTime                        @default(now())

  @@index([category])
  @@index([sourceType])
  @@index([contentType])
}
```

Note: The `embedding` field uses Prisma's `Unsupported` type because Prisma doesn't natively support pgvector types. All vector operations use raw SQL via `$queryRawUnsafe()`.

## Chunk JSON Format

Files in `data/chunks/{category}.json`:

```json
[
  {
    "id": "01-semantic-seo--entity-seo-guide--chunk-0",
    "category": "01-semantic-seo",
    "title": "Entity SEO: The Complete Guide",
    "content": "Entity SEO is the practice of optimizing web content...",
    "sourceFile": "www_holisticseo_digital_entity-seo.md",
    "sourceUrl": "https://www.holisticseo.digital/entity-seo/",
    "sourceType": "web",
    "contentType": "reference",
    "tokenCount": 412,
    "chunkIndex": 0,
    "totalChunks": 15,
    "headingPath": ["Entity SEO", "Introduction"]
  }
]
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Deterministic: `{category}--{slugified-filename}--chunk-{N}` |
| `category` | string | One of 17 categories (e.g. "01-semantic-seo") |
| `title` | string | Article/video title or heading |
| `content` | string | The chunk text (50-1000 tokens typically) |
| `sourceFile` | string | Filename in consolidated-knowledge/ |
| `sourceUrl` | string | Original URL (website or YouTube) |
| `sourceType` | string | How the content was acquired |
| `contentType` | string | What kind of content it is |
| `tokenCount` | number | Estimated token count |
| `chunkIndex` | number | Position within the source document (0-indexed) |
| `totalChunks` | number | Total chunks from this source document |
| `headingPath` | string[] | Heading hierarchy (e.g. ["Technical SEO", "Crawling", "Budget"]) |

### Source Types

| Value | Description | Count |
|-------|-------------|-------|
| `web` | Website articles scraped via Firecrawl/custom scraper | ~10,000+ |
| `youtube` | YouTube video transcripts | ~2,000+ |
| `gpt-prompt` | Custom GPT system prompts | 81 |
| `strategy-snapshot` | Site analysis blueprints + JSON snapshots | ~800+ |

### Content Types

| Value | Description |
|-------|-------------|
| `reference` | Informational/educational content (guides, tutorials, explanations) |
| `strategic` | Strategy documents, frameworks, methodologies |
| `tool` | GPT prompts, scripts, actionable tools |
| `blueprint` | Site structure analyses, architectural blueprints |

## Category List (17)

| Category | Files | Chunks | Avg Tokens | Topic |
|----------|-------|--------|------------|-------|
| 01-semantic-seo | 49 | 802 | 397 | Entity SEO, NLP, knowledge graphs |
| 02-topical-authority | 37 | 917 | 353 | Topic clusters, authority building |
| 03-content-strategy | 35 | 599 | 394 | Writing, content planning |
| 04-technical-seo | 265 | 2,208 | 252 | HTML, HTTP, crawling, indexing |
| 05-on-page-seo | 27 | 423 | 304 | Keywords, headings, meta, internal linking |
| 06-page-speed-and-performance | 29 | 472 | 249 | Core Web Vitals, CDN, caching |
| 07-local-seo | 11 | 313 | 337 | GMB, local search, maps |
| 08-off-page-and-link-building | 17 | 374 | 350 | Backlinks, outreach |
| 09-algorithm-updates-and-ranking | 28 | 459 | 332 | Google updates, ranking factors |
| 10-user-experience | 138 | 1,117 | 207 | ARIA, a11y, UX, CRO |
| 11-ai-and-automation | 80 | 1,234 | 350 | Python SEO, AI/ML |
| 12-marketing-and-growth | 51 | 720 | 273 | Statistics, advertising |
| 13-case-studies | 93 | 2,935 | 367 | Video + article case studies |
| 14-gpt-prompts-and-tools | 47 | 81 | 672 | Custom GPT system prompts |
| 15-schema-and-structured-data | 15 | 456 | 370 | Schema markup, JSON-LD |
| 16-web-security | 19 | 175 | 199 | CORS, CSP, HSTS |
| 17-strategy-blueprints | 24 | 845 | 455 | Site analyses, structural blueprints |
| **TOTAL** | **961** | **14,130** | **~320** | |

## RetrievedChunk Type

Returned by all retrieval functions:

```typescript
interface RetrievedChunk {
  id: string;
  category: string;
  title: string;
  content: string;
  sourceFile: string | null;
  sourceUrl: string | null;
  sourceType: string | null;
  contentType: string | null;
  tokenCount: number | null;
  metadata: {
    headingPath: string[];
    chunkIndex: number;
    totalChunks: number;
  } | null;
  similarity: number;      // cosine similarity (0-1)
  ftsRank: number;          // full-text rank
  combinedScore: number;    // 0.7 * similarity + 0.3 * normalized_fts_rank
}
```

## Other Tables

### User
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      String   @default("member")  // "admin" | "member"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Generation (for tracking AI outputs)
```prisma
model Generation {
  id          String   @id @default(cuid())
  userId      String
  agentType   String   // "content", "onpage", "technical", "local"
  inputPrompt String
  output      String
  metadata    Json?
  createdAt   DateTime @default(now())
}
```

### Phase / Task (project tracking)
```prisma
model Phase {
  id          String @id @default(cuid())
  slug        String @unique
  title       String
  description String
  sortOrder   Int    @default(0)
  tasks       Task[]
}

model Task {
  id         String  @id @default(cuid())
  phaseId    String
  title      String
  status     String  @default("pending")
  assignedTo String?
  blockedBy  String?
  sortOrder  Int     @default(0)
  phase      Phase   @relation(fields: [phaseId], references: [id])
}
```

# Embedding Pipeline

## How It Works

The embedding pipeline takes JSON chunk files and:
1. Reads each chunk's text content
2. Sends batches of 100 to OpenAI's `text-embedding-3-small` model
3. Gets back 1536-dimensional vectors
4. Upserts the chunks + vectors into PostgreSQL
5. Creates search indexes after all chunks are embedded

## Running

```bash
cd lnm-dashboard

# Full pipeline
npm run embed:chunks

# Verify results
npm run verify:embeddings
```

## Pipeline Flow

```
data/chunks/01-semantic-seo.json     ──┐
data/chunks/02-topical-authority.json ──┤
data/chunks/03-content-strategy.json  ──┤
...                                    ──┤
data/chunks/17-strategy-blueprints.json─┘
         │
         ▼
    For each category JSON:
    ┌─────────────────────────────────────┐
    │ 1. Read chunks from JSON            │
    │ 2. Query DB: which IDs already      │
    │    have embeddings? (resumability)   │
    │ 3. Filter out already-done chunks   │
    │ 4. Batch remaining in groups of 100 │
    │ 5. OpenAI: embed batch → vectors    │
    │ 6. DB: upsert chunks + vectors      │
    │ 7. Sleep 200ms (rate limiting)      │
    └─────────────────────────────────────┘
         │
         ▼
    Create indexes:
    ├─ IVFFlat (vector cosine similarity)
    └─ GIN (full-text search)
```

## Chunk JSON Format

Each file in `data/chunks/` is an array of objects:

```json
{
  "id": "01-semantic-seo--entity-seo-guide--chunk-3",
  "category": "01-semantic-seo",
  "title": "Entity SEO: The Complete Guide",
  "content": "Entity SEO focuses on optimizing for entities...",
  "sourceFile": "www_holisticseo_digital_entity-seo.md",
  "sourceUrl": "https://www.holisticseo.digital/entity-seo/",
  "sourceType": "web",
  "contentType": "reference",
  "tokenCount": 347,
  "chunkIndex": 3,
  "totalChunks": 12,
  "headingPath": ["Entity SEO", "What is an Entity?"]
}
```

## Resumability

The pipeline is designed to survive crashes and restarts:

1. Before processing a category, it queries: `SELECT id FROM KnowledgeChunk WHERE category = $1 AND embedding IS NOT NULL`
2. It filters out any chunk IDs already in that set
3. Only the remaining chunks get embedded and upserted

This means you can:
- Stop the script (Ctrl+C) and re-run — it picks up where it stopped
- Add new chunks to the JSON files and re-run — only new ones get processed
- Run it multiple times safely — already-embedded chunks are skipped instantly

## Adding New Content

### Step 1: Add source files
Place new `.md` files in the appropriate `consolidated-knowledge/{category}/` folder.

### Step 2: Re-run chunking
```bash
npm run chunk:knowledge
```
This regenerates all chunk JSON files. Existing chunk IDs are deterministic (based on category + filename + chunk index), so unchanged files produce the same IDs.

### Step 3: Re-run embedding
```bash
npm run embed:chunks
```
Only new/changed chunks get embedded. Existing ones are skipped.

### Step 4: Verify
```bash
npm run verify:embeddings
```

## Adding a New Category

1. Create the folder: `consolidated-knowledge/{NN-category-name}/`
2. Add `.md` files to it
3. Update `scripts/chunk-knowledge.ts` to include the new category in its category list
4. Update `scripts/embed-chunks.ts` CATEGORIES array
5. Update the agent pool mapping in `app/lib/retrieval.ts` if the new category should be searchable by specific agents
6. Run: `npm run chunk:knowledge && npm run embed:chunks`

## Configuration

Key constants in `scripts/embed-chunks.ts`:

| Constant | Default | Purpose |
|----------|---------|---------|
| `BATCH_SIZE` | 100 | Chunks per OpenAI API call |
| `BATCH_DELAY_MS` | 200 | Delay between batches (rate limiting) |
| `MAX_CONTENT_CHARS` | 8000 | Truncation limit for oversized chunks |

Key constants in `scripts/lib/openai.ts`:

| Constant | Value | Purpose |
|----------|-------|---------|
| `MODEL` | `text-embedding-3-small` | OpenAI embedding model |
| `DIMENSIONS` | 1536 | Vector dimensionality |

## Cost

OpenAI `text-embedding-3-small` costs $0.02 per 1M tokens.

| Metric | Value |
|--------|-------|
| Total chunks | 14,130 |
| Average tokens/chunk | ~320 |
| Total tokens | ~4.5M |
| Total cost | ~$0.09 |

Re-running after adding 100 new chunks costs fractions of a cent.

## Troubleshooting

See `docs/setup.md` for common error solutions.

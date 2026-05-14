# LNM Knowledge System — Documentation

## Quick Start

```bash
cd lnm-dashboard
npm install
# Set DATABASE_URL and OPENAI_API_KEY in .env (see docs/setup.md)
npx prisma db push
npm run embed:chunks    # embed 14,130 knowledge chunks
npm run dev             # start the app
# Test: http://localhost:3000/api/search?q=topical+authority
```

## Documentation Index

| Document | What It Covers |
|----------|---------------|
| [architecture.md](architecture.md) | System overview, tech stack, data pipeline diagram, design decisions, key files map |
| [setup.md](setup.md) | Prerequisites, env vars, install, Railway config, troubleshooting |
| [embedding-pipeline.md](embedding-pipeline.md) | How embeddings work, adding new content, resumability, costs, configuration |
| [retrieval-system.md](retrieval-system.md) | Hybrid search algorithm, 3 retrieval functions, agent pools, HTTP API, tuning |
| [integration-guide.md](integration-guide.md) | Chat interface code, multi-agent dashboard, multi-stage content generation, React components |
| [schema-reference.md](schema-reference.md) | Database tables, chunk JSON format, all 17 categories, TypeScript types |

## System at a Glance

- **14,130 knowledge chunks** from 961 SEO source files
- **17 categories** covering semantic SEO, technical SEO, content strategy, local SEO, case studies, and more
- **Hybrid search**: vector similarity (pgvector) + full-text keywords (tsvector), weighted 70/30
- **7 agent pools**: content, technical, local-seo, on-page, off-page, strategy, all
- **Railway Postgres** with pgvector extension — no separate vector DB needed
- **Resumable pipeline** — safe to re-run, only processes new chunks

## Common Tasks

| Task | Command |
|------|---------|
| Add new knowledge | Add .md to `consolidated-knowledge/{cat}/`, then `npm run chunk:knowledge && npm run embed:chunks` |
| Search the knowledge base | `GET /api/search?q=your+query&topK=10` |
| Use in code | `import { retrieveForAgent } from "@/app/lib/retrieval"` |
| Check DB status | `npx tsx scripts/validate-phase3.ts` |
| Verify embeddings | `npm run verify:embeddings` |

## For AI Agents Reading This

If you are an AI coding assistant working on this project:

1. **Read `architecture.md` first** for the full system map
2. **The retrieval layer is at `app/lib/retrieval.ts`** — import `retrieveForAgent` or `retrieveChunks` from there
3. **Never query the DB directly for knowledge** — always use the retrieval functions (they handle embedding, hybrid search, and scoring)
4. **Agent pools exist** — use them to narrow search scope instead of searching all 14k chunks
5. **The embed pipeline is resumable** — if you add new chunk files, just re-run `npm run embed:chunks`
6. **Prisma can't handle vector types natively** — all vector operations use `$queryRawUnsafe()` with raw SQL

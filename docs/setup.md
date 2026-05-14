# Setup Guide

## Prerequisites

- **Node.js** 18+ (tested with 20.x)
- **npm** 9+
- **Railway account** with a Postgres instance (or any Postgres 15+ with pgvector)
- **OpenAI API key** with access to `text-embedding-3-small`

## Environment Variables

Create `lnm-dashboard/.env`:

```env
# Railway Postgres — use PUBLIC URL for local dev, INTERNAL URL in Railway deploy
DATABASE_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway"

# OpenAI — for embeddings
OPENAI_API_KEY=sk-proj-...
```

**Finding your Railway DATABASE_URL:**
1. Go to Railway dashboard
2. Click your Postgres service
3. Click "Connect" tab
4. Copy the public URL (looks like `postgresql://postgres:xxx@trolley.proxy.rlwy.net:12345/railway`)

**Important:** The internal URL (`postgres.railway.internal`) only works from within Railway. Local scripts need the public URL.

## Install

```bash
cd lnm-dashboard
npm install
```

Key dependencies installed:
- `openai` — embedding API client
- `pg` — direct Postgres client for bulk vector operations
- `@prisma/client` + `@prisma/adapter-pg` — ORM with Postgres adapter
- `tsx` — TypeScript execution for scripts

## Database Setup

### 1. Enable pgvector extension

This happens automatically when you run the embed script, but you can also do it manually:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Push schema to database

```bash
npx prisma db push
```

This creates/updates all tables. The project uses `db push` (not migrations) for simplicity.

### 3. Generate Prisma client

```bash
npx prisma generate
```

This happens automatically during `npm install` (via `postinstall` script).

## Running the Embed Pipeline

If starting fresh or adding new content:

```bash
# 1. Chunk the knowledge base (if not already done)
npm run chunk:knowledge

# 2. Embed all chunks (resumable — skips already-done)
npm run embed:chunks

# 3. Verify everything
npm run verify:embeddings
```

## Running the App

### Local development
```bash
npm run dev
```
Opens at `http://localhost:3000`

### Production (Railway)
The `start` script handles everything:
```bash
npm start
# Runs: prisma db push && next start -H 0.0.0.0 -p ${PORT:-3000}
```

Railway sets `PORT` automatically. Make sure `DATABASE_URL` uses the internal URL in Railway's environment variables for production.

## Railway Deployment Notes

- The Railway Postgres instance must have pgvector available (most Railway Postgres templates include it)
- Set `DATABASE_URL` in Railway's environment variables to the **internal** URL for the deployed app
- Keep the **public** URL in your local `.env` for running scripts from your machine
- The embed pipeline should be run locally (it calls OpenAI and writes to the DB)
- The Next.js app reads from the DB at runtime using the Prisma client

## Troubleshooting

### "type vector does not exist"
pgvector extension not created. Run:
```bash
npm run embed:chunks
# OR manually:
# npx tsx -e "import 'dotenv/config'; import pg from 'pg'; new pg.Pool({connectionString:process.env.DATABASE_URL}).query('CREATE EXTENSION IF NOT EXISTS vector').then(()=>console.log('done'))"
```

### "memory required is X MB, maintenance_work_mem is Y MB"
Index creation needs more memory. The embed script sets `maintenance_work_mem = '256MB'` before creating indexes. If this still fails, reduce IVFFlat lists from 100 to 50 in `scripts/lib/vector-db.ts`.

### "maximum input length is 8192 tokens"
A chunk's content exceeds OpenAI's token limit. The embed script truncates content to 8000 chars. If you still hit this, lower `MAX_CONTENT_CHARS` in `scripts/embed-chunks.ts`.

### Embed script crashes mid-run
Just re-run it. The script checks which chunks already have embeddings and skips them. It picks up exactly where it left off.

### Prisma db push fails
Make sure `DATABASE_URL` in `.env` is correct and reachable. Test with:
```bash
npx tsx -e "import 'dotenv/config'; import pg from 'pg'; new pg.Pool({connectionString:process.env.DATABASE_URL}).query('SELECT 1').then(r=>console.log('connected')).catch(e=>console.error(e.message))"
```

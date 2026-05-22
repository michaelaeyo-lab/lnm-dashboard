<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LNM Dashboard — Project Context

## Recent Changes (2026-05-22)

### 1. Renamed `searchatlas.ts` → `lnm-serpdata-agent.ts`
- `app/lib/lnm-serpdata-agent.ts` — SERP & competitor data integration (SerpAPI, Firecrawl, SearchAtlas)
- Only import is in `app/lib/brief-pipeline.ts` line 24

### 2. CSV Download Button in BriefEditor
- `app/components/BriefEditor.tsx` — Download CSV button in toolbar (next to delete)
- Uses `briefToCsvString()` from `app/lib/csv-validation.ts` (no server-only guard, safe for client)
- Client-side blob download, filename: `{topic}-brief.csv`

### 3. Step 8-9 Methodology Alignment (Sardar-style contextual structures)

**Step 9** (`stepStructureAndQueryMapping` in `app/lib/brief-pipeline.ts` ~line 1729):
- System prompt now contains Sardar-style instruction templates for each pattern:
  - `purpose-summary`: "Purpose: Summarize... + vector items"
  - `explicit-definition`: "Explicit Definition: What is [X]? Use signifier, qualifier..."
  - `direct-answer`: "Direct Answer: Yes/No... under 40 words"
  - `list-definition`: "List Definition: List Intro... items... List Outro... DO NOT EXPLAIN..."
  - `reasoning-based`: "Start answering... remember more text doesn't mean more context"
  - `table-format`: "Create one table with [N] columns..."
- **Few-shot example** (user+assistant messages) from Bristol home removal gold-standard CSV forces GPT-4o to follow format
- Competitor content items and heading topics injected into user message
- Hard rules reject generic one-line descriptions

**Step 8** (`stepHierarchyAndTitle` ~line 1442):
- Programmatic heading candidate extraction from competitor H1/H2s
- Classified as REQUIRED (2+ competitors) vs SUGGESTED vs SERP GAP
- Injected into user message as heading candidates
- Post-step grounding check: warns when H2s aren't grounded in research

## Key Files
- `app/lib/brief-pipeline.ts` — 12-step brief generation pipeline (core)
- `app/lib/lnm-serpdata-agent.ts` — SERP data (SerpAPI + Firecrawl + SearchAtlas)
- `app/lib/csv-validation.ts` — CSV format validation + `briefToCsvString()` export
- `app/lib/writing-rules/structure-patterns.ts` — Structure pattern taxonomy
- `app/components/BriefEditor.tsx` — Brief editor UI with CSV download
- `scripts/test-festival-brief.ts` — Test script for festival in Bristol (Step 9 output validation)

## Gold-Standard CSVs (reference for Sardar methodology)
- `Writing Rules/Briefs Rules/Domestic Home Removal Service in Bristol.csv`
- `Writing Rules/Briefs Rules/Man and van service in bristol.csv`

## Running Test Briefs
```bash
node --require ./scripts/shim-server-only.cjs --import ./scripts/register.mjs --import tsx scripts/test-festival-brief.ts
```

## Known Issues
- Step 8 grounding check is warn-only (doesn't block), some H2s may not match competitor headings when competitor data is sparse
- Entity coverage score remains low (~10-20%) — entities extracted but not all mapped to headings

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LNM Dashboard — Project Context

## Recent Changes (2026-05-23)

### 1. Step 9 contextualRationale — FULLY WIRED
- `contextualRationale` now flows end-to-end: system prompt → Return JSON schema → few-shot example → continuation prompt → `Step9Heading` type → post-processing return
- Each heading gets 5 reasoning fields: `levelJustification`, `patternRationale`, `readerIntent`, `evidenceBasis`, `hierarchyRole`
- Few-shot assistant example (Bristol home removal) includes contextualRationale on all 4 headings with 1-2 sentence depth per field
- Continuation chunk system prompt requires contextualRationale in its JSON shape
- Verified: 38/38 headings populated with all 5 fields in test run

### 2. SERP Feature Normalization (post-processing)
- New normalization pass after the continuation loop converts spelled-out SERP features to abbreviations:
  - "Featured Snippet" → "FS", "People Also Ask" → "PAA", "Knowledge Panel" → "KP", "Local Carousel" → "LC"
- Applied to both `serpFeatures` and `ruleCodes` arrays on every heading

### 3. Contextual Hierarchy Panel (UI — VERIFIED)
- `app/components/brief/ContextualHierarchyPanel.tsx` — heading hierarchy with rationale bubbles
- "Hierarchy" tab in `BriefEditor.tsx` (between Outline and Analysis)
- `EnhancedHeading` type has optional `contextualRationale` field (backward compatible)
- Features: collapsible rows with indent guides, level/search filtering, copy-to-clipboard, SEO metadata grid
- Falls back gracefully when `contextualRationale` is missing (older briefs)
- Type-check passes clean; dev server renders correctly
- Design reference: `output/debug/design_handoff_contextual_hierarchy/`

### Previous Changes (2026-05-22)

#### Renamed `searchatlas.ts` → `lnm-serpdata-agent.ts`
- `app/lib/lnm-serpdata-agent.ts` — SERP & competitor data integration (SerpAPI, Firecrawl, SearchAtlas)
- Only import is in `app/lib/brief-pipeline.ts` line 24

#### CSV Download Button in BriefEditor
- `app/components/BriefEditor.tsx` — Download CSV button in toolbar (next to delete)
- Uses `briefToCsvString()` from `app/lib/csv-validation.ts` (no server-only guard, safe for client)
- Client-side blob download, filename: `{topic}-brief.csv`

#### Step 8-9 Methodology Alignment (Sardar-style contextual structures)

**Step 9** (`stepStructureAndQueryMapping` in `app/lib/brief-pipeline.ts` ~line 1795):
- System prompt contains Sardar-style instruction templates for each pattern:
  - `purpose-summary`, `explicit-definition`, `direct-answer`, `list-definition`, `reasoning-based`, `table-format`, `entity-template`, `exact-answer`, `suggestive-answer`
- Few-shot example (user+assistant messages) from Bristol home removal gold-standard CSV
- Competitor content items and heading topics injected into user message
- Hard rules reject generic one-line descriptions

**Step 8** (`stepHierarchyAndTitle` ~line 1443):
- Programmatic heading candidate extraction from competitor H1/H2s + H3 named entities
- Named entities from cross-competitor data injected as mandatory H3 candidates
- Question-phrased H2 methodology (PAA-derived, not topic labels)
- Post-step grounding check: warns when H2s aren't grounded in research

## Key Files
- `app/lib/brief-pipeline.ts` — 12-step brief generation pipeline (core)
- `app/lib/types.ts` — All TypeScript types (EnhancedHeading, EnhancedBrief, etc.)
- `app/lib/lnm-serpdata-agent.ts` — SERP data (SerpAPI + Firecrawl + SearchAtlas)
- `app/lib/csv-validation.ts` — CSV format validation + `briefToCsvString()` export
- `app/lib/writing-rules/structure-patterns.ts` — Structure pattern taxonomy
- `app/components/BriefEditor.tsx` — Brief editor UI with tabs (Outline, Hierarchy, Analysis, etc.)
- `app/components/brief/ContextualHierarchyPanel.tsx` — Contextual hierarchy rationale panel
- `scripts/test-festival-brief.ts` — Full pipeline test for festival in Bristol
- `scripts/test-steps-debug.ts` — Step-by-step debug test (outputs each step to `output/debug/`)

## Gold-Standard CSVs (reference for Sardar methodology)
- `Writing Rules/Briefs Rules/Domestic Home Removal Service in Bristol.csv`
- `Writing Rules/Briefs Rules/Man and van service in bristol.csv`

## Running Test Briefs
```bash
# Full pipeline test
node --require ./scripts/shim-server-only.cjs --import ./scripts/register.mjs --import tsx scripts/test-festival-brief.ts

# Step-by-step debug (outputs to output/debug/step{N}-*.json)
node --require ./scripts/shim-server-only.cjs --import ./scripts/register.mjs --import tsx scripts/test-steps-debug.ts
```

## Known Issues
- Step 8 grounding check is warn-only (doesn't block), some H2s may not match competitor headings when competitor data is sparse
- Entity coverage score remains low (~10-20%) — entities extracted but not all mapped to headings

# LNM Dashboard — Three-Task Plan

## Context

Three tasks for today's session on the LNM Dashboard (`lnm-dashboard/`):

1. **UI Redesign** — Implement Claude Design handoff (`UI Design/design_handoff_lnm_redesign/`) into the existing Next.js codebase
2. **Pipeline Restructure** — Align the 12-step brief pipeline to Sardar's process so output matches CSV gold standards
3. **Strict Rule Following** — Enforce per-content-type rules, knowledge base retrieval, and brief structure format

Tasks 2+3 are tightly coupled (same pipeline). Task 1 is independent UI work.

---

## Work Stream A: UI Redesign (Task 1)

### Current State
- Next.js 16 + React 19 + Tailwind 4 (minimal globals.css — just `#0a0a0a` dark bg)
- No shadcn/ui (no `components/ui/`, no `components.json`)
- 19 components in `app/components/` using inline Tailwind + SVG path icons
- Simple 224px zinc sidebar, no topbar, no theming

### Target State
- Full Claude Design handoff: 13 screens, dark/light theming, Geist fonts, oklch color tokens
- shadcn/ui primitives + 4 custom components (ScoreRing, StatusBadge, Chip, Empty)
- Responsive sidebar (240px → 56px icon-rail → hamburger sheet)
- Sticky topbar with breadcrumbs + command palette (Cmd+K)
- 8 redesigned pages + login

### Implementation Order (per handoff README section 18)

#### A1. Design Tokens + Globals
- **File**: `app/globals.css`
- Port full oklch color system from handoff `styles.css`
- Add `@theme` block with `--font-sans: Geist`, `--font-mono: Geist Mono`
- Dark theme default, `[data-theme='light']` override
- Semantic colors: mint, amber, coral, cyan, violet + soft variants
- Scrollbar, animation keyframes, responsive breakpoints

#### A2. Install shadcn/ui + Primitives
- Run `npx shadcn@latest init` (configure for Tailwind 4)
- Install primitives: Button, Badge, Tabs, Progress, Command, Sheet, Dialog
- Extend Button with `success` variant
- Extend Badge with `tone` variants (mint/amber/coral/cyan/violet/accent)
- **New files**: `app/components/ui/button.tsx`, `badge.tsx`, `tabs.tsx`, etc.

#### A3. Custom Primitives
- **ScoreRing** (`app/components/ui/score-ring.tsx`): SVG donut, color by threshold (>=80 mint, >=60 amber, else coral)
- **StatusBadge** (`app/components/ui/status-badge.tsx`): status→tone map (draft→default, reviewing→amber, approved→mint, etc.)
- **Chip** (`app/components/ui/chip.tsx`): Small inline tag
- **Empty** (`app/components/ui/empty.tsx`): Empty state with icon + message

#### A4. Layout Shell
- **File**: `app/(dashboard)/layout.tsx` — add Sidebar + Topbar wrapper
- **File**: `app/components/Sidebar.tsx` — full rewrite:
  - 240px default, icon-rail at <=980px, hamburger sheet at <=640px
  - Two groups: Workspace (Dashboard, Briefs, Write, Chat) + Library (Knowledge, History)
  - Brand mark (gradient "L"), user card footer, active state with accent bar
  - lucide-react icons replace SVG paths
- **New file**: `app/components/Topbar.tsx`:
  - Breadcrumbs left, Cmd+K button center, theme toggle + "New brief" right
  - Mobile hamburger trigger

#### A5. Briefs List Page
- **File**: `app/(dashboard)/briefs/page.tsx` — rewrite
- Status filter tabs (All/Draft/Review/Approved)
- Data table with columns: ID, Topic, Niche, Type, Quality (bar+number), Volume, Status, Updated
- Quality column: thin bar + colored number (mint/amber/coral)
- Search input, "New brief" primary button

#### A6. Brief Detail Page (centerpiece)
- **File**: `app/(dashboard)/briefs/[id]/page.tsx` — major rewrite
- **File**: `app/components/BriefEditor.tsx` — rewrite to match handoff `brief-detail.jsx`
- Header with metadata row, title-tag display, action buttons
- Stats strip (6 cells + ScoreRing)
- Vectors + Gaps strip (2 cards)
- 7-tab segmented control: Outline, Analysis, Entities, Topics, Links, Competitors, Validation
- Outline tab: two-pane with heading rows + sticky inspector (380px)
- Each heading row shows H-level, indented text, content-design-pattern badge, rule codes, volume
- **NEW — Sardar Brief Structure Display**:
  - Inspector shows `structurePattern` badge (e.g., "List Definition", "Direct Answer")
  - Inspector shows full Contextual Structure instructions text
  - Inspector shows per-heading Contextual Connection (linked pages)
  - Inspector shows 3 query groups with volumes (matching CSV columns)
  - Outline heading rows show structure pattern icon + abbreviated type
  - H1 row visually distinct — shows "Purpose: Summarize" label

#### A7. Writer Page
- **File**: `app/(dashboard)/write/page.tsx` + `app/components/ContentWriter.tsx`
- 3-pane layout: Outline (280px) | Editor (1fr) | Meta (280px)
- 5 writer states: streaming, paused, error, refining, done
- Section header with pattern badge, word-count target, state badge
- Footer toolbar: Pause/Resume/Refine/Accept & next

#### A8. Remaining Pages
- **Dashboard** (`app/(dashboard)/page.tsx`): Pipeline ribbon + 4-col phase grid + recent briefs/knowledge cards
- **Knowledge** (`app/(dashboard)/knowledge/page.tsx`): Search with pool tabs, result cards with similarity %
- **Chat** (`app/(dashboard)/chat/page.tsx`): Agent pool tabs, user/assistant bubbles, source citations
- **History** (`app/(dashboard)/history/page.tsx`): 4-stat row + data table
- **Login** (`app/login/page.tsx`): Centered card, brand mark, shield icon

#### A9. New Brief Flow
- Add to briefs page (modal or inline)
- 3 modes: AI Generate (recommended), Quick Form, Import Outline
- Pipeline progress state: 12-step animation with live signals panel
- Wire to existing `POST /api/briefs` SSE stream

#### A10. Command Palette + Theming
- Install shadcn Command component (cmdk)
- Global Cmd+K shortcut
- Navigate, Actions, Recent briefs, Knowledge search groups
- Theme toggle: `data-theme` attribute, localStorage persistence, FOUC prevention script

### Key Constraints
- **DO NOT modify** `app/lib/types.ts` or any `app/api/**` route schema
- Use existing API endpoints as data contract
- lucide-react for all icons (no custom SVGs)
- Geist fonts only (no Inter/Roboto)
- Thin 1px borders, no shadow-heavy cards

---

## Work Stream B: Pipeline Restructure + Rule Enforcement (Tasks 2+3)

### Current State
- 12-step pipeline in `app/lib/brief-pipeline.ts` (~850 lines, 9 GPT-4o calls)
- 56 core rules in `app/lib/writing-rules/core.ts` (flat string, applied as system prompt)
- EnhancedBrief type has fields for contextualVectors, headings, entityMap, connectionMap, etc.
- Pipeline output covers ~40% of Sardar's CSV brief structure

### Gap Analysis (Current vs CSV Gold Standard)

| CSV Column | Current Pipeline | Gap |
|---|---|---|
| Contextual Vectors | `contextualVectors: string[]` | Has field, needs richer generation |
| Contextual Hierarchy (H1-H5) | `headings[].level + text` | Covered, but H1 needs "Purpose: Summarize entire document" pattern |
| Contextual Structure | `headings[].structureInstructions` | **Major gap**: CSV uses typed patterns ("Explicit Definition", "List Definition", "Direct Answer", "Exact Answer + Expansion", "Reasoning Based", "Suggestive Answer", "Table format") with specific instructions. Current uses generic GPT text. |
| Contextual Connection | `connectionMap[]` (flat list) | **Gap**: CSV maps connections per-heading. Need `headings[].connections` |
| Queries + Volume | `headings[].targetQueries[]` | Covered, but needs 3 query groups per heading like CSV |
| Content Design Pattern | `headings[].contentDesignPattern` | Has field but values don't match Sardar's taxonomy |
| Rule codes per heading | `headings[].ruleCodes` | Has field, needs stricter rule-to-heading mapping |

### Sardar's Process (from Refined Semantic Writing Rules)
1. Agent reads ALL rules from first word to last
2. Agent confirms understanding of each rule
3. Agent reviews the heading/question/answer requirement
4. Agent writes content strictly following all rules
5. Refinement pass — cut fluff, fix logical flow, improve contextual connections

### 6 Rule Files to Enforce Per Content Type

| Rule File | Applies To | Location |
|---|---|---|
| The-Main-Writing-Rules.txt | ALL content types (22 rules) | `Writing Rules/` |
| Format-Rules-V1.txt | ALL content types (10+ rules) | `Writing Rules/` |
| Co-occurrence-rules.txt | LOCAL/SERVICE pages only | `Writing Rules/` |
| Named-Entities.txt | ALL with emphasis on local/legal (12 rules) | `Writing Rules/` |
| Perspectives.txt | Legal/service pages (12 rules) | `Writing Rules/` |
| Refined Semantic Writing Rules.md | ALL (52+ rules) — the master set | `Writing Rules/` |
| core.ts (56 rules) | ALL — already in codebase | `app/lib/writing-rules/core.ts` |

### Implementation Plan

#### B1. Restructure Rule System — Content-Type-Aware Rules
- **File**: `app/lib/writing-rules/core.ts` — extend
- Add `getRulesForPageType(pageType: string): string` function
- For ALL types: core 56 rules + format rules + main writing rules
- For SERVICE/LOCATION: add co-occurrence rules + named entities (emphasis on local)
- For LEGAL niche: add perspectives rules
- Rules returned as structured system prompt, not just flat text

#### B2. Define Sardar's Structure Instruction Taxonomy
- **File**: `app/lib/writing-rules/structure-patterns.ts` — new file
- Define typed patterns matching CSV examples:
  ```
  "purpose-summary" — H1 only: summarize entire document representatively
  "explicit-definition" — use signifier, qualifier, enriching context
  "list-definition" — list intro + items + list outro
  "direct-answer" — Yes/No + expansion
  "exact-answer" — precise answer + optional expansion
  "exact-answer-expansion" — precise answer + evidence
  "reasoning-based" — reasoning/justification answer
  "suggestive-answer" — recommendation around brand
  "table-format" — data in table
  "comparison" — compare X vs Y
  ```
- Each pattern includes: instruction template, word-count guidance, structural rules

#### B3. Refactor Pipeline Steps for Sardar's Process
- **File**: `app/lib/brief-pipeline.ts`
- Restructure step prompts to enforce:

**Step 8 (Heading Hierarchy)** — Major refactoring:
  - H1 MUST be "Purpose: Summarize entire document" with specific summary instructions
  - Each heading gets a `structurePattern` from the taxonomy (B2)
  - Structure instructions generated per Sardar's format: pattern type + specific guidance + word limits
  - Map internal connections (Contextual Connection) per-heading, not as flat list
  - Map 3 query groups per heading with volumes

**Step 7 (Contextual Vectors)** — Enhance:
  - Generate richer contextual vectors matching CSV H1 format
  - Include document-level topic summary, not just entity list

**Step 9 (Structure + Query Mapping)** — Enhance:
  - Assign structure patterns per heading based on: heading level, intent, page type
  - Generate Sardar-style structure instructions (e.g., "List Intro: when moving home... + items + List Outro")
  - Map queries with volumes to specific headings (3 groups)

**Step 10 (Internal Connections)** — Enhance:
  - Map connections to individual headings (per-heading `connections[]` field)
  - Generate anchor text and linking reasons per heading

#### B4. Enforce Multi-Pass Rule Application (Sardar's Cycle)
- **File**: `app/lib/brief-pipeline.ts` — add to construction steps
- Before generating heading content, inject ALL rules as system context
- Add post-generation validation pass checking rule compliance:
  - Co-occurrence (region+service together for local pages)
  - Entity density (min 2 per section)
  - Perspective placement (per-heading, at end)
  - No fluff, no fancy wording, factual sentence structures
- Flag non-compliant headings for auto-fix cycle (max 2 iterations per Sardar's "refinement" step)

#### B5. Update Types (backward compatible)
- **File**: `app/lib/types.ts` — extend EnhancedHeading:
  ```typescript
  // Add to EnhancedHeading
  structurePattern?: string;      // from taxonomy: "explicit-definition" | "list-definition" | etc.
  connections?: ConnectionEntry[]; // per-heading internal links
  queryGroups?: {                  // 3 query groups per heading
    group1: QueryEntry[];
    group2: QueryEntry[];
    group3: QueryEntry[];
  };
  ```
- Keep existing fields, add new ones as optional for backward compatibility

#### B6. Validate Against CSV Gold Standards
- After pipeline runs, compare output structure against CSV format:
  - Does H1 have "Purpose: Summarize" instruction?
  - Does each heading have a typed structure pattern?
  - Are connections mapped per-heading?
  - Are queries mapped per-heading with volumes?
- Log quality score for structure compliance

---

## Execution Sequence

Due to scope, recommend splitting across sessions:

### Session 1 (Today — Start)
1. **A1-A3**: Design tokens + shadcn install + custom primitives
2. **A4**: Layout shell (Sidebar + Topbar)
3. **B1-B2**: Rule system restructure + structure pattern taxonomy

### Session 2
4. **A5-A6**: Briefs list + Brief Detail page
5. **B3-B4**: Pipeline refactoring + multi-pass rule enforcement

### Session 3
6. **A7-A8**: Writer + remaining pages
7. **B5-B6**: Type updates + CSV validation

### Session 4
8. **A9-A10**: New Brief flow + Command Palette
9. Deploy to Railway, test end-to-end

---

## Verification

### UI Verification
- Open `LNM Redesign.html` side-by-side with implementation
- Check: sidebar active states, briefs table quality column, brief detail outline+inspector, writer 5 states, command palette, light mode, mobile (600px)
- `npm run build` must pass with zero TS errors

### Pipeline Verification
- Generate a test brief for "Domestic Home Removal Service in Bristol" (service page, moving niche)
- Compare output against `Writing Rules/Briefs Rules/Domestic Home Removal Service in Bristol.csv`
- Check:
  - H1 has "Purpose: Summarize entire document" instruction
  - Each heading has typed structure pattern (list-definition, direct-answer, etc.)
  - Connections mapped per-heading
  - Queries with volumes per-heading (3 groups)
  - Co-occurrence rules active for service pages
  - Entity density per section

### Deployment
- `cd lnm-dashboard && npm run build` — zero errors
- `git add && git commit` with descriptive message
- Push to Railway (auto-deploy from master)

---

## Critical Files

| File | Action | Purpose |
|---|---|---|
| `app/globals.css` | Rewrite | Design tokens, oklch colors, animations |
| `components.json` | New | shadcn/ui config |
| `app/components/ui/*.tsx` | New (10+) | shadcn + custom primitives |
| `app/components/Sidebar.tsx` | Rewrite | New sidebar design |
| `app/components/Topbar.tsx` | New | Sticky topbar |
| `app/(dashboard)/layout.tsx` | Rewrite | Sidebar + Topbar shell |
| `app/(dashboard)/briefs/page.tsx` | Rewrite | Briefs list |
| `app/(dashboard)/briefs/[id]/page.tsx` | Rewrite | Brief detail |
| `app/components/BriefEditor.tsx` | Rewrite | Brief detail tabs |
| `app/components/BriefGenerator.tsx` | Rewrite | New brief flow |
| `app/components/ContentWriter.tsx` | Rewrite | Writer 3-pane |
| `app/(dashboard)/page.tsx` | Rewrite | Dashboard |
| `app/(dashboard)/knowledge/page.tsx` | Rewrite | Knowledge browser |
| `app/(dashboard)/chat/page.tsx` | Rewrite | RAG chat |
| `app/(dashboard)/history/page.tsx` | Rewrite | Generation history |
| `app/login/page.tsx` | Rewrite | Login page |
| `app/lib/writing-rules/core.ts` | Extend | Content-type-aware rules |
| `app/lib/writing-rules/structure-patterns.ts` | New | Sardar's structure taxonomy |
| `app/lib/brief-pipeline.ts` | Refactor | Pipeline steps for Sardar's process |
| `app/lib/types.ts` | Extend | New optional fields on EnhancedHeading |

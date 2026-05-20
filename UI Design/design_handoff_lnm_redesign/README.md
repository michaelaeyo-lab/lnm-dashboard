# Handoff: LNM Platform UI/UX Redesign

> **Tech stack**: Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · shadcn/ui
> **Repo**: `michaelaeyo-lab/lnm-dashboard`
> **Branch base**: `master`

---

## 0. About the design files

The files in this bundle are **design references created in HTML/JSX** — interactive prototypes showing the intended look-and-feel, layouts, states, and interactions. **They are not production code to copy.**

Your job: **recreate these designs in the existing Next.js codebase** using:
- The existing route structure (`app/(dashboard)/`, `app/login/`)
- Existing component locations (`app/components/`)
- Existing types from `app/lib/types.ts` (do not modify the data layer)
- Tailwind 4 + shadcn/ui primitives (introduce `components/ui/*` if not present yet)

Treat the HTML/JSX as the visual + interaction spec; treat your existing API routes (`app/api/**`), DB schema, and data fetching as the contract you must not break.

---

## 1. Fidelity

**High-fidelity.** Pixel-perfect mocks with final colors, typography, spacing, and interactions. Match exactly. Where the prototype uses placeholder copy or fixture data, replace with the live data from your existing API routes — the field names and shapes are already aligned with `app/lib/types.ts`.

---

## 2. Files in this bundle

**`screenshots/`** — reference captures (13 PNGs) of each major screen at desktop width in dark mode. See `screenshots/README.md` for an index. Open `LNM Redesign.html` for the full interactive prototype — including light mode, command palette, mobile, and writer states that don't capture cleanly as stills.

| File | Purpose |
|---|---|
| `LNM Redesign.html` | Entry — open this to see the full prototype |
| `styles.css` | Complete design-token system, theme switching, responsive breakpoints |
| `primitives.jsx` | Icon set, Badge, Button, Chip, Tabs, Bar, ScoreRing, Sidebar, Topbar, Empty, StatusBadge |
| `brief-detail.jsx` | Brief Detail page (the centerpiece): outline + inspector + 7 panels |
| `pages.jsx` | Login, Dashboard, Briefs list, Knowledge, Writer (all 5 states), Chat, History |
| `extras.jsx` | NewBriefFlow (3 modes + pipeline progress), CommandPalette (⌘K), MobileSidebarSheet |
| `app.jsx` | Shell, router, tweaks integration, ⌘K shortcut |
| `data.jsx` | Realistic fixture data — useful for understanding the expected data shapes |
| `tweaks-panel.jsx` | Tweak controls — not for production, can ignore |

The prototype runs in a browser as a single SPA; in your codebase each "page" is its own `page.tsx` under `app/(dashboard)/`.

---

## 3. Design system (build these first)

### 3.1 Design tokens — port to `app/globals.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap');

@theme {
  --font-sans: 'Geist', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace;
}

:root {
  /* Dark theme (default) */
  --bg: oklch(0.165 0.005 270);
  --bg-elev: oklch(0.195 0.005 270);
  --surface: oklch(0.215 0.005 270);
  --surface-hover: oklch(0.245 0.006 270);
  --border: oklch(0.28 0.008 270);
  --border-strong: oklch(0.34 0.01 270);
  --text-1: oklch(0.965 0.005 270);
  --text-2: oklch(0.72 0.008 270);
  --text-3: oklch(0.52 0.008 270);
  --text-4: oklch(0.40 0.008 270);

  /* Accent (violet by default — see Theming) */
  --accent: oklch(0.68 0.17 290);
  --accent-soft: oklch(0.68 0.17 290 / 0.16);
  --accent-faint: oklch(0.68 0.17 290 / 0.08);
  --accent-fg: oklch(0.96 0.02 290);

  /* Semantic */
  --mint: oklch(0.78 0.13 165);
  --amber: oklch(0.80 0.14 75);
  --coral: oklch(0.70 0.18 25);
  --cyan: oklch(0.78 0.12 220);
  --violet: oklch(0.72 0.17 300);

  /* Each semantic has a -soft variant at 14% opacity */
  --mint-soft: oklch(0.78 0.13 165 / 0.14);
  --amber-soft: oklch(0.80 0.14 75 / 0.14);
  --coral-soft: oklch(0.70 0.18 25 / 0.14);
  --cyan-soft: oklch(0.78 0.12 220 / 0.14);
  --violet-soft: oklch(0.72 0.17 300 / 0.14);

  --radius: 6px;
  --radius-lg: 10px;
}

[data-theme='light'] {
  --bg: oklch(0.98 0.003 270);
  --bg-elev: oklch(0.995 0.002 270);
  --surface: oklch(0.97 0.003 270);
  --surface-hover: oklch(0.94 0.004 270);
  --border: oklch(0.91 0.005 270);
  --border-strong: oklch(0.85 0.006 270);
  --text-1: oklch(0.18 0.01 270);
  --text-2: oklch(0.42 0.01 270);
  --text-3: oklch(0.58 0.008 270);
  --text-4: oklch(0.70 0.006 270);
}
```

The full `styles.css` in this bundle has everything (scrollbars, animations, responsive, etc.) — use it as the source of truth and translate to your Tailwind 4 setup.

### 3.2 Typography

- **Geist Sans** — UI text, all sizes
- **Geist Mono** — numerics, IDs, codes, timestamps, scores, badges with codes, brief IDs
- Type scale (px):

| Token | Size | Weight | Usage |
|---|---|---|---|
| h1 | 22 (26 on brief detail) | 600 | Page titles |
| h2 | 17 | 600 | Section titles |
| h3 | 13 | 600 | Card titles |
| base | 14 | 400 | Body |
| sm | 12.5 | 400 | Secondary |
| xs | 11 | 400 | Meta |
| eyebrow | 10 | 500 mono, 0.1em letter-spacing, uppercase | Labels |

Body line-height: 1.45 · letter-spacing: -0.005em · font-feature-settings: 'ss01', 'cv11'

### 3.3 shadcn/ui primitives — map prototype components to shadcn

| Prototype (`primitives.jsx`) | shadcn equivalent | Notes |
|---|---|---|
| `<Button variant="primary\|ghost\|success" size="sm\|md\|lg">` | `<Button>` | Add a `success` variant to shadcn defaults |
| `<Badge tone="default\|mint\|amber\|coral\|cyan\|violet\|accent">` | `<Badge>` | Add tone variants; always mono font for default badges |
| `<StatusBadge status="draft\|reviewing\|approved\|done\|in-progress\|blocked">` | Composition over `<Badge>` | Status→tone map: draft→default, reviewing→amber, approved/done→mint, in-progress→amber, blocked→coral |
| `<Tabs>` (segmented) | `<Tabs>` | Linear-style segmented control, **not** underline tabs |
| `<Chip>` | New primitive | Small inline tag |
| `<Bar value={0-100} tone>` | `<Progress>` | thin (4–6px) |
| `<ScoreRing score={0-100} size>` | New primitive | SVG donut; color: ≥80 mint, ≥60 amber, else coral |
| `<Icon name="…" size>` | `lucide-react` | All icons in prototype map to lucide names: dashboard→`LayoutDashboard`, briefs→`FileText`, write→`PenLine`, chat→`MessageSquare`, history→`Clock`, knowledge→`BookOpen`, sparkles→`Sparkles`, etc. |
| `<Sidebar>` | New component | See section 5 |
| `<Topbar>` | New component | See section 5 |
| `<CommandPalette>` | `<Command>` from shadcn | ⌘K wired globally |
| `<Empty>` | New primitive | Empty state |

### 3.4 Spacing & layout
- Base unit: 4px
- Card padding: 16–18px (`p-4`/`p-5`)
- Row vertical padding: 12px (default), 8px (compact), 16px (spacious)
- Card border-radius: 10px (`--radius-lg`)
- Button border-radius: 6px (`--radius`)
- Sidebar default width: 240px

---

## 4. Routes / page mapping

| Route | Prototype component (in `pages.jsx`/`brief-detail.jsx`) | Existing file |
|---|---|---|
| `/login` | `LoginPage` | `app/login/page.tsx` |
| `/` | `Dashboard` | `app/(dashboard)/page.tsx` |
| `/briefs` | `BriefsList` | `app/(dashboard)/briefs/page.tsx` |
| `/briefs/new` (or modal) | `NewBriefFlow` from `extras.jsx` | Add to briefs page |
| `/briefs/[id]` | `BriefDetail` | `app/(dashboard)/briefs/[id]/page.tsx` |
| `/knowledge` | `Knowledge` | `app/(dashboard)/knowledge/page.tsx` |
| `/write` | `Write` | `app/(dashboard)/write/page.tsx` |
| `/chat` | `Chat` | `app/(dashboard)/chat/page.tsx` |
| `/history` | `History` | `app/(dashboard)/history/page.tsx` |

---

## 5. Sidebar + layout shell (`app/(dashboard)/layout.tsx`)

**Structure**: 240px sidebar (CSS var `--sidebar-w`) + main column with sticky 52px topbar.

**Sidebar sections** — two groups separated by section labels:

1. **Workspace** group
   - Dashboard (`LayoutDashboard` icon, href `/`)
   - Briefs (`FileText`, `/briefs`) — count badge for in-review briefs
   - Write (`PenLine`, `/write`)
   - Chat (`MessageSquare`, `/chat`)
2. **Library** group
   - Knowledge (`BookOpen`, `/knowledge`) — count "14k"
   - History (`Clock`, `/history`)

**Brand mark**: 26×26 rounded-md gradient (accent → violet-dark), white "L" 12px/700.

**Active nav item**: background `var(--surface)` + 2px accent bar on the left edge (positioned absolutely, offset `-8px`). Icon swaps from `text-3` to `text-1` color.

**Footer**: user card with 28px circular avatar (initial), name + email below in mono. Click → logout (`POST /api/auth/logout`).

**Topbar**: breadcrumbs left (e.g. `LNM / Briefs / br_8a1f9`), ⌘K search button in the middle (collapses to icon-only ≤980px, hidden ≤640px), theme toggle + "New brief" button right. On mobile (≤640px) shows a hamburger that opens a slide-in sheet of the sidebar.

**Responsive**:
- ≤980px: sidebar collapses to 56px icon-rail (hide labels)
- ≤640px: hamburger menu replaces sidebar; sheet uses overlay + slide-in animation

---

## 6. Brief Detail page (the centerpiece — `app/(dashboard)/briefs/[id]/page.tsx`)

This is **the most complex page**. Refer to `brief-detail.jsx` for the full implementation.

### 6.1 Header
- Back button → `/briefs`
- Metadata row: niche badge · pageType badge · `<StatusBadge>` · `v{version}` (mono) · "updated {timestamp}"
- H1: `brief.topic` at 26px/600
- Title-tag row: `<Badge tone="cyan">title tag</Badge>` + `data.titleTag.titleTag` in cyan
- Action group right: Delete (ghost) · Export (ghost) · Approve · **Go to Writer** (primary, with arrow)

### 6.2 Stats strip
Horizontal card with 6 vertical-divider cells + score ring on the right:

| Cell | Icon | Label | Value |
|---|---|---|---|
| 1 | layers | Headings | `data.headings.length` |
| 2 | target | Entities | `data.entityMap.length` |
| 3 | link | Internal links | `data.connectionMap.length` |
| 4 | search | Total volume | `{sum/1000}k` searches/mo |
| 5 | map | Topics | `data.topicalMap.length` |
| 6 | bolt | Competitors | `data.competitors.length` |

Right side: "Quality / 5-dim composite" + 62px ScoreRing of `qualityReport.overallScore`.

Values: 22px/600 mono tabular-nums.

### 6.3 Vectors + Gaps strip (2-col)
Two cards side-by-side:
- **Contextual Vectors** — chips (`<Chip>`) for each
- **Knowledge Gaps** — coral-dotted list, eyebrow label in coral color, alert icon

### 6.4 Tabs (segmented control)
7 tabs: **Outline** (default) · Analysis · Entities · Topics · Links · Competitors · Validation

Right of the tabs: "Show/Hide inspector" toggle (only on Outline tab).

### 6.5 Outline tab — the data-dense view
**Two-pane**: left = outline list (1fr), right = sticky inspector (380px).

**Heading row** (`HeadingRow` in `brief-detail.jsx`):
- Grid: `34px | 1fr | auto`
- Column 1: `H{level}` in mono text-3
- Column 2: heading text, indented by `(level-1) * 18px`. Indentation lines (1px vertical) on H2+
- Column 3: meta badges — content-design-pattern (icon+text, color-toned), FS/PAA target badges, rule codes, total volume (mono right-aligned)

**Heading row tone mapping**:
- paragraph → default, table → cyan, list → amber, comparison → violet, visual → mint

**Inspector** (when a row is clicked):
- H{level} · {idx+1}/{total} eyebrow + heading text
- Pattern badge + FS/PAA badges + rule code chips
- "Structure Instructions" textarea (editable)
- 2-col: Intent input + Word Count Target input (mono)
- Target Queries table — each row: query · intent badge · volume (mono right-aligned)
- SERP Features chips (cyan with check icon)

### 6.6 Analysis tab
Two cards:
- **Query intent** card — 3-col grid of KV pairs: Search intent (accent), Query type, Business model, Depth required (cyan), Freshness (amber), Completeness (mint or coral). Below: Missing Qualifiers chips (if incomplete) + Audience Segments chips (primary in accent).
- **SERP signals** card — top-right "AI overview live" badge if `aiOverviewPresence`. 2-col grid: Gaps (mint, opportunities) | Compression (coral, avoid). Below: Consensus coverage chips.
- **Featured snippet opportunities** card — list of {query, currentFormat badge, strategy text}.

### 6.7 Entities tab
Group by relevance (`primary` accent / `secondary` cyan / `contextual` default). Each group is a card with entity chips in a `grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))` grid.

### 6.8 Topics tab
Card with 4 sections (root / supporting / adjacent / downstream). Each section: header pill with relationship name + description + count, then chips for each topic in the matching tone. Pill tones:
- root → accent
- supporting → mint
- adjacent → amber
- downstream → violet

### 6.9 Links tab
Card with row list. Each row: `link` icon + anchor text + arrow + target page (mono). Below in muted text: "from {fromHeading} — {reason}".

### 6.10 Competitors tab
- **Gap keywords** card at top — mint chips
- **SERP competitors** card — rows with: rank badge (mint if ≤3) + title/URL + word count (mono right). When deep-analysis exists, 2-col: Strengths (mint) / Weaknesses (coral) bulleted lists.

### 6.11 Validation tab
Three cards stacked:
1. **Overall quality** — 92px ScoreRing + description + breakdown bars (200px label + bar + score mono). Bar tone: ≥80 mint, ≥60 amber, else coral.
2. **Heading validation** — list of issues with severity badges (high coral / medium amber / low default), issue type (mono), heading text. Below: description + suggested fix in accent-faint box.
3. **Recommendations** — sparkles icon + each recommendation in a surface row.

---

## 7. New Brief flow (`NewBriefFlow` in `extras.jsx`)

**Three modes**, each as a selectable card:
1. **AI Generate** (recommended badge) — topic input + page-type/niche selects + location + advanced options (client, domain, CSV keyword upload). On submit → simulated 12-step pipeline animation.
2. **Quick form** — manual heading builder with H1–H4 selects, drag-rearrangeable headings, intent per heading.
3. **Import outline** — paste markdown / numbered list, "Parse" button shows parsed outline preview.

### Pipeline progress state (12 steps)
Sequenced steps from `app/components/BriefGenerator.tsx`:
1. Researching keywords & SERP data
2. Retrieving knowledge base
3. Collecting competitor data
4. Analyzing query intent & audience
5. Analyzing SERP patterns
6. Analyzing competitors in depth
7. Mapping contextual vectors & entities
8. Building heading hierarchy & title
9. Generating structure & mapping queries
10. Mapping internal connections
11. Validating heading quality
12. Scoring brief quality

Two-pane:
- **Left**: progress bar + step list. Each step shows status circle (done=mint-check, active=pulse-dot accent, pending=mono number).
- **Right (sticky)**: "Live signals" panel — checkpoints that light up as steps complete (SERP fetched, Knowledge chunks, Competitors mapped, Audience segments, Entity map, Headings drafted, Internal links, Quality score).

**Connect to existing API**: `POST /api/briefs` with the SSE stream — the existing route already emits `{ step, label, progress }` events. Just adapt the UI rather than the API.

---

## 8. Briefs list (`/briefs`)

- Page head: title + "AI-generated briefs with heading hierarchy, entity mapping, and SERP rules." subtitle
- Action group right: Filter (ghost) · Import (ghost) · **New brief** (primary, sparkles icon)
- Status tabs row: All · Draft · Review · Approved (with counts)
- Search input right (with search icon prefix)
- **Data table** with horizontal scroll when narrow. Columns: ID (mono) · Topic · Niche · Type (badge) · Quality (bar + mono number) · Volume (mono) · Status (StatusBadge) · Updated (mono) · `⋯` overflow
- Row click → `/briefs/[id]`
- Quality column: thin bar + colored number (mint/amber/coral by threshold)
- "has writer session" indicator under the topic for briefs with `sessionId`

---

## 9. Writer (`/write`)

**3-pane layout** (collapses to 2-pane ≤1240px, 1-pane ≤980px):
1. **Outline** (280px sticky) — section list with H{n} prefix + drafted/active/error indicators. Drafted = strike-through + check. Active section = accent left-border.
2. **Editor** (1fr center) — section header (H{n} · section X/Y · pattern badge · word-count target · live state badge), H2 title, body content with streaming cursor, footer toolbar (Pause/Resume/Refine/Accept & next).
3. **Meta** (280px sticky right) — Target Queries · Rule Codes · Structure Instructions cards.

### 5 writer states (all wired to your API endpoints):
| State | Trigger | UI |
|---|---|---|
| `streaming` | section being generated | pulse cursor + "Pause" button + streaming badge cyan |
| `paused` | user clicked pause | "Resume" button + amber badge + ellipsis after last token |
| `error` | API returned non-200 | Coral banner with retry button; preserves partial draft |
| `refining` | user clicked Refine | Inline textarea + "Apply refinement" button (violet badge) |
| `done` | "Accept & next" clicked | Section text strikethrough in outline; mint check badge |

Wire to existing endpoints: `POST /api/content/generate` (SSE) and `POST /api/content/refine` (SSE).

---

## 10. Chat (`/chat`)

- Page head as standard
- **Agent pool tabs** (segmented): All knowledge · Content · Technical · Local SEO · On-page · Strategy
- Messages area:
  - User bubbles: right-aligned, accent-colored, 70% max-width, bottom-right radius 4px
  - Assistant bubbles: left-aligned with 28px gradient avatar (sparkles icon), surface bg + border
  - Source citations under assistant bubbles: small mono pills with file icon and title
  - Streaming indicator: 3 pulsing dots in an assistant bubble
- Input area: card with metadata row (retrieving · top 8 from {pool} · ⌘↵ to send) + textarea + Send button

Wire to existing `POST /api/chat` SSE endpoint.

---

## 11. Knowledge (`/knowledge`)

- Header card: search input (with prefix search icon) + Search button (primary, sparkles icon). Below: pool tabs (all + 6 named pools) + Top K input (mono, 60px wide).
- Results row meta: "{n} results · 38ms · embedding model · text-embedding-3-large" in mono muted
- Result cards: 44px accent-tinted icon square (file icon) + title + category/source/content-type badges + token count, **similarity %** large mono accent right-aligned + "similarity" eyebrow. Body text below in `--text-2`.

Wire to existing `GET /api/search?q=…&topK=…&categories=…`.

---

## 12. Dashboard (`/`)

- Page head: "Q1 Content Sprint" + "Vector Industries · 11 weeks · 8 pillar pieces"
- Action group: Export · Add phase · **New brief** (primary)
- **Pipeline ribbon** card:
  - Status legend row (done/active/blocked/pending counts with colored dots)
  - 4-step pipeline: Discovery → Briefing → Writing → Publishing. Each step has label, completed/total count (mono), and a thin Bar with appropriate tone. Chevron arrows between steps.
  - Footer row: ScoreRing of overall % + "Overall progress · {pct}%" + remaining-time text + status badges
- **4-column phase grid** — each phase is a card:
  - Header: title + edit-icon button + description + count + thin progress bar
  - Tasks list: each task is a row with colored dot (mint/amber/coral/text-4 by status), title (strikethrough if done), and trailing icon (bolt for in-progress, alert for blocked)
  - Footer: "+ Add task" dashed-border row
- **Recent briefs + Knowledge stats** row (2-col):
  - Recent briefs card: 4 most-recent briefs as compact rows (ID + topic + status + quality score + date)
  - Knowledge base card: large "14,130 chunks indexed" + breakdown list + "Browse knowledge" button

---

## 13. History (`/history`)

- 4-stat row: 7-day generations · Tokens used (with usage bar) · Avg quality (mint number) · Briefs published
- Data table: Kind (colored badge with icon) · Topic · Agent (mono) · Tokens (mono right) · When (mono right)

Wire to existing `GET /api/generations`.

---

## 14. Login (`/login`)

- Centered card (380px max-width) on dark canvas
- Top: 40px brand mark + "LNM Platform" + "multi-agent · seo" mono
- Card: "Sign in" h2 + subtitle + Email + Password (with "Forgot?" link) + "Continue →" primary button (full-width, lg)
- Below: shield icon + "Two-user agency account · Vector Industries"

Wire to existing `POST /api/auth/login`.

---

## 15. Command Palette (⌘K)

Global keyboard shortcut. Modal with backdrop blur. Build using shadcn's `<Command>` component (cmdk under the hood).

**Item groups**:
1. **Navigate** — go to each route with `G {letter}` shortcuts shown as kbd
2. **Actions** — New brief (`N B`), New chat (`N C`), Toggle theme (`⇧ T`)
3. **Recent briefs** — last 8 briefs with status badge + niche/version hint
4. **Knowledge search** — type → live filter into knowledge items

Keyboard: `↑↓` navigate, `↵` select, `esc` close. Footer shows these hints + result count.

---

## 16. Theming

**Default**: dark mode. Toggle via topbar sun/moon button.

**Implementation**: `data-theme="light"` on `<html>` swaps the CSS variables. Persist to localStorage. Initialize before first paint to avoid FOUC (script in `<head>` reading localStorage).

**Accent color**: app-level setting (default violet). Stored in localStorage / user preferences. Apply via JS:

```js
const a = ACCENTS[accent].base;  // oklch value
root.style.setProperty('--accent', a);
root.style.setProperty('--accent-soft', `color-mix(in oklab, ${a} 18%, transparent)`);
root.style.setProperty('--accent-faint', `color-mix(in oklab, ${a} 10%, transparent)`);
```

Available accents: violet, mint, amber, cyan, graphite. Don't expose this as a per-user setting unless requested — just bake violet in for now.

---

## 17. Data layer — do not change

These types and endpoints are stable. The UI reads from them; the UI must not require schema changes:

- `EnhancedBrief`, `EnhancedHeading`, `QueryPreAnalysis`, `SerpAnalysis`, `DeepCompetitorAnalysisResult`, `TopicalMapEntry`, `HeadingValidation`, `BriefQualityReport` — from `app/lib/types.ts`
- API routes under `app/api/**` are the source of truth for data fetching

The prototype's `data.jsx` fixture exists only to populate the prototype — it mirrors the existing types so you can see expected shapes.

---

## 18. Implementation order (recommended)

1. **Tokens + globals** — port `styles.css` design tokens to `app/globals.css` with `@theme`
2. **shadcn primitives** — install/extend Button, Badge (with tones), Tabs (segmented), Progress, Command, Sheet, Dialog
3. **Custom primitives** — ScoreRing, StatusBadge, Chip, Empty
4. **Layout shell** — Sidebar + Topbar in `app/(dashboard)/layout.tsx`
5. **Briefs list** — simplest data table to validate the system
6. **Brief Detail** — the big one; build it in this order: Outline tab → Analysis → Validation → others
7. **Writer** — section editor states
8. **Dashboard, Knowledge, Chat, History, Login** — remaining routes
9. **New Brief flow** — including pipeline progress
10. **Command palette + ⌘K** — last, wires everything together

---

## 19. Things to keep that the prototype skips

- Real keyboard shortcuts beyond ⌘K (e.g. `G B` to go to briefs) — implement with [`react-hotkeys-hook`](https://github.com/JohannesKlauss/react-hotkeys-hook) or similar
- Light mode FOUC prevention script in `<head>`
- Loading skeletons (prototype uses static fixture data)
- Optimistic updates (e.g. status changes on the brief detail header)
- Error boundaries
- Real CSV upload parsing for keyword data

---

## 20. Things explicitly NOT to do

- **Do not** use shadow-y rounded cards everywhere — use thin 1px borders + subtle elevation only
- **Do not** add emoji (the brand doesn't use them)
- **Do not** invent new icons in SVG — use lucide-react
- **Do not** use Inter or Roboto — Geist is the brand
- **Do not** modify `app/lib/types.ts` or any API route schema
- **Do not** copy the prototype's class names (`btn`, `card`, etc.) — use Tailwind utilities and shadcn primitives

---

## 21. Verifying you got it right

Open `LNM Redesign.html` in a browser side-by-side with your implementation. Cycle through these screens:
- Sidebar layout + active states
- Briefs list table (especially the quality column)
- Brief Detail → Outline tab → click any heading row
- Brief Detail → Validation tab
- Writer page in each of 5 states (toggle via Tweaks panel in the prototype)
- New brief flow → mode selector → click Generate
- Command palette (⌘K)
- Light mode toggle
- 600px-wide window (mobile)

If those match, you're done.

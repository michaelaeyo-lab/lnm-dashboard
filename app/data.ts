export type TaskStatus = "done" | "in-progress" | "pending" | "blocked";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  blockedBy?: string;
}

export interface Phase {
  id: string;
  title: string;
  description: string;
  tasks: Task[];
}

export const phases: Phase[] = [
  {
    id: "extraction",
    title: "Extraction (Phase 1)",
    description: "Collect all raw knowledge from Koray's resources, YouTube, GPTs, and client projects",
    tasks: [
      { id: "e1", title: "Scrape all website articles (~699)", status: "done" },
      { id: "e2", title: "Extract YouTube transcripts (~53)", status: "done" },
      { id: "e3", title: "Generate strategy snapshots (12 sites)", status: "done" },
      { id: "e4", title: "Extract Custom GPT prompts (47)", status: "done" },
      { id: "e5", title: "Ingest Content Rules Doc (100-200pg)", status: "blocked", blockedBy: "Waiting on Sardar" },
      { id: "e6", title: "Ingest 40-50+ additional Custom GPTs", status: "blocked", blockedBy: "Waiting on Sardar" },
      { id: "e7", title: "Ingest structure/layout doc", status: "blocked", blockedBy: "Waiting on Sardar" },
      { id: "e8", title: "Ingest 10-15 local business projects", status: "blocked", blockedBy: "Waiting on Sardar" },
    ],
  },
  {
    id: "consolidation",
    title: "Knowledge Consolidation",
    description: "Organize all sources into the final category structure for agent pools",
    tasks: [
      { id: "c1", title: "Define final category taxonomy (agent pools)", status: "pending" },
      { id: "c2", title: "Reorganize files into new category structure", status: "pending" },
      { id: "c3", title: "Deduplicate content across categories", status: "pending" },
      { id: "c4", title: "Tag reference content vs strategic content", status: "pending" },
      { id: "c5", title: "Validate file counts + coverage per category", status: "pending" },
    ],
  },
  {
    id: "chunking",
    title: "Chunking Pipeline (Phase 2)",
    description: "Split raw files into semantic chunks with metadata for vector retrieval",
    tasks: [
      { id: "ch1", title: "Build article chunker (H2/H3 heading-based)", status: "pending" },
      { id: "ch2", title: "Process all articles through chunker", status: "pending" },
      { id: "ch3", title: "Build transcript chunker (LLM topic detection)", status: "pending" },
      { id: "ch4", title: "Process all transcripts", status: "pending" },
      { id: "ch5", title: "Process strategy snapshots + GPT prompts", status: "pending" },
      { id: "ch6", title: "Build metadata enrichment (topic extraction)", status: "pending" },
      { id: "ch7", title: "Assign agent_pool labels to all chunks", status: "pending" },
      { id: "ch8", title: "Validate chunk quality + size distribution", status: "pending" },
    ],
  },
  {
    id: "database",
    title: "Database & Embeddings (Phase 3)",
    description: "Set up Supabase pgvector, embed all chunks, and verify retrieval",
    tasks: [
      { id: "d1", title: "Set up Supabase project", status: "pending" },
      { id: "d2", title: "Create chunks table + indexes", status: "pending" },
      { id: "d3", title: "Configure Row-Level Security", status: "pending" },
      { id: "d4", title: "Build embedding pipeline (OpenAI batch)", status: "pending" },
      { id: "d5", title: "Run embeddings on all chunks (~5K-8K)", status: "pending" },
      { id: "d6", title: "Upload to Supabase (bulk insert)", status: "pending" },
      { id: "d7", title: "Validate upload completeness", status: "pending" },
      { id: "d8", title: "Test hybrid search (vector + BM25)", status: "pending" },
      { id: "d9", title: "Set up backup/export procedures", status: "pending" },
    ],
  },
  {
    id: "agents-core",
    title: "Core Agent Development",
    description: "Build the specialist agent layer with shared patterns",
    tasks: [
      { id: "a1", title: "Build agent base class (retrieval + validation)", status: "pending" },
      { id: "a2", title: "Build Content Agent (service/blog/location pages)", status: "pending" },
      { id: "a3", title: "Build On-Page Agent (H-tags, meta, linking)", status: "pending" },
      { id: "a4", title: "Build Technical SEO Agent (schema, crawl, indexing)", status: "pending" },
      { id: "a5", title: "Build Local SEO Agent (GMB, citations, reviews)", status: "pending" },
      { id: "a6", title: "Build Strategy Agent (architecture, topical maps)", status: "pending" },
      { id: "a7", title: "Build Off-Page Agent (backlinks, outreach)", status: "pending" },
      { id: "a8", title: "Build Audit Agent (cross-pool analysis)", status: "pending" },
      { id: "a9", title: "Build Orchestrator (multi-agent routing)", status: "pending" },
    ],
  },
  {
    id: "sub-agents",
    title: "Sub-Agents (Granular Tasks)",
    description: "Purpose-built micro-agents for specific deliverables",
    tasks: [
      { id: "s1", title: "Schema markup generator", status: "pending" },
      { id: "s2", title: "FAQ generator", status: "pending" },
      { id: "s3", title: "Meta tag writer", status: "pending" },
      { id: "s4", title: "Internal link mapper", status: "pending" },
      { id: "s5", title: "Content brief builder", status: "pending" },
      { id: "s6", title: "GMB post writer", status: "pending" },
      { id: "s7", title: "Review response generator", status: "pending" },
      { id: "s8", title: "Location page builder", status: "pending" },
      { id: "s9", title: "Blog outline generator", status: "pending" },
      { id: "s10", title: "Outreach email drafter", status: "pending" },
      { id: "s11", title: "Topical map builder", status: "pending" },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard & UI",
    description: "Web interface for tracking progress, browsing knowledge, and interacting with agents",
    tasks: [
      { id: "ui1", title: "Progress tracking dashboard", status: "in-progress" },
      { id: "ui2", title: "Deploy to Vercel", status: "pending" },
      { id: "ui3", title: "Knowledge browser UI", status: "pending" },
      { id: "ui4", title: "Agent interaction interface", status: "pending" },
      { id: "ui5", title: "Generation history + export", status: "pending" },
      { id: "ui6", title: "Supabase Auth (Michael + Sardar)", status: "pending" },
      { id: "ui7", title: "Admin panel (add knowledge, re-embed)", status: "pending" },
    ],
  },
  {
    id: "refinement",
    title: "Continuous Improvement",
    description: "Ongoing enhancement based on real usage and new inputs",
    tasks: [
      { id: "r1", title: "Add new client projects as case studies", status: "pending" },
      { id: "r2", title: "Refine agent outputs from real usage feedback", status: "pending" },
      { id: "r3", title: "Add new SOPs as discovered", status: "pending" },
      { id: "r4", title: "Benchmark outputs vs SearchAtlas", status: "pending" },
      { id: "r5", title: "Agent specialization tuning per niche", status: "pending" },
    ],
  },
];

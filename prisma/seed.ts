import { PrismaClient } from "../app/generated/prisma";

const prisma = new PrismaClient();

const phases = [
  {
    slug: "extraction",
    title: "Extraction (Phase 1)",
    description: "Collect all raw knowledge from Koray's resources, YouTube, GPTs, and client projects",
    sortOrder: 0,
    tasks: [
      { title: "Scrape all website articles (~699)", status: "done", sortOrder: 0 },
      { title: "Extract YouTube transcripts (~53)", status: "done", sortOrder: 1 },
      { title: "Generate strategy snapshots (12 sites)", status: "done", sortOrder: 2 },
      { title: "Extract Custom GPT prompts (47)", status: "done", sortOrder: 3 },
      { title: "Ingest Content Rules Doc (100-200pg)", status: "blocked", blockedBy: "Waiting on Sardar", sortOrder: 4 },
      { title: "Ingest 40-50+ additional Custom GPTs", status: "blocked", blockedBy: "Waiting on Sardar", sortOrder: 5 },
      { title: "Ingest structure/layout doc", status: "blocked", blockedBy: "Waiting on Sardar", sortOrder: 6 },
      { title: "Ingest 10-15 local business projects", status: "blocked", blockedBy: "Waiting on Sardar", sortOrder: 7 },
    ],
  },
  {
    slug: "consolidation",
    title: "Knowledge Consolidation",
    description: "Organize all sources into the final category structure for agent pools",
    sortOrder: 1,
    tasks: [
      { title: "Define final category taxonomy (agent pools)", status: "pending", sortOrder: 0 },
      { title: "Reorganize files into new category structure", status: "pending", sortOrder: 1 },
      { title: "Deduplicate content across categories", status: "pending", sortOrder: 2 },
      { title: "Tag reference content vs strategic content", status: "pending", sortOrder: 3 },
      { title: "Validate file counts + coverage per category", status: "pending", sortOrder: 4 },
    ],
  },
  {
    slug: "chunking",
    title: "Chunking Pipeline (Phase 2)",
    description: "Split raw files into semantic chunks with metadata for vector retrieval",
    sortOrder: 2,
    tasks: [
      { title: "Build article chunker (H2/H3 heading-based)", status: "pending", sortOrder: 0 },
      { title: "Process all articles through chunker", status: "pending", sortOrder: 1 },
      { title: "Build transcript chunker (LLM topic detection)", status: "pending", sortOrder: 2 },
      { title: "Process all transcripts", status: "pending", sortOrder: 3 },
      { title: "Process strategy snapshots + GPT prompts", status: "pending", sortOrder: 4 },
      { title: "Build metadata enrichment (topic extraction)", status: "pending", sortOrder: 5 },
      { title: "Assign agent_pool labels to all chunks", status: "pending", sortOrder: 6 },
      { title: "Validate chunk quality + size distribution", status: "pending", sortOrder: 7 },
    ],
  },
  {
    slug: "database",
    title: "Database & Embeddings (Phase 3)",
    description: "Set up Supabase pgvector, embed all chunks, and verify retrieval",
    sortOrder: 3,
    tasks: [
      { title: "Set up Supabase project", status: "pending", sortOrder: 0 },
      { title: "Create chunks table + indexes", status: "pending", sortOrder: 1 },
      { title: "Configure Row-Level Security", status: "pending", sortOrder: 2 },
      { title: "Build embedding pipeline (OpenAI batch)", status: "pending", sortOrder: 3 },
      { title: "Run embeddings on all chunks (~5K-8K)", status: "pending", sortOrder: 4 },
      { title: "Upload to Supabase (bulk insert)", status: "pending", sortOrder: 5 },
      { title: "Validate upload completeness", status: "pending", sortOrder: 6 },
      { title: "Test hybrid search (vector + BM25)", status: "pending", sortOrder: 7 },
      { title: "Set up backup/export procedures", status: "pending", sortOrder: 8 },
    ],
  },
  {
    slug: "agents-core",
    title: "Core Agent Development",
    description: "Build the specialist agent layer with shared patterns",
    sortOrder: 4,
    tasks: [
      { title: "Build agent base class (retrieval + validation)", status: "pending", sortOrder: 0 },
      { title: "Build Content Agent (service/blog/location pages)", status: "pending", sortOrder: 1 },
      { title: "Build On-Page Agent (H-tags, meta, linking)", status: "pending", sortOrder: 2 },
      { title: "Build Technical SEO Agent (schema, crawl, indexing)", status: "pending", sortOrder: 3 },
      { title: "Build Local SEO Agent (GMB, citations, reviews)", status: "pending", sortOrder: 4 },
      { title: "Build Strategy Agent (architecture, topical maps)", status: "pending", sortOrder: 5 },
      { title: "Build Off-Page Agent (backlinks, outreach)", status: "pending", sortOrder: 6 },
      { title: "Build Audit Agent (cross-pool analysis)", status: "pending", sortOrder: 7 },
      { title: "Build Orchestrator (multi-agent routing)", status: "pending", sortOrder: 8 },
    ],
  },
  {
    slug: "sub-agents",
    title: "Sub-Agents (Granular Tasks)",
    description: "Purpose-built micro-agents for specific deliverables",
    sortOrder: 5,
    tasks: [
      { title: "Schema markup generator", status: "pending", sortOrder: 0 },
      { title: "FAQ generator", status: "pending", sortOrder: 1 },
      { title: "Meta tag writer", status: "pending", sortOrder: 2 },
      { title: "Internal link mapper", status: "pending", sortOrder: 3 },
      { title: "Content brief builder", status: "pending", sortOrder: 4 },
      { title: "GMB post writer", status: "pending", sortOrder: 5 },
      { title: "Review response generator", status: "pending", sortOrder: 6 },
      { title: "Location page builder", status: "pending", sortOrder: 7 },
      { title: "Blog outline generator", status: "pending", sortOrder: 8 },
      { title: "Outreach email drafter", status: "pending", sortOrder: 9 },
      { title: "Topical map builder", status: "pending", sortOrder: 10 },
    ],
  },
  {
    slug: "dashboard",
    title: "Dashboard & UI",
    description: "Web interface for tracking progress, browsing knowledge, and interacting with agents",
    sortOrder: 6,
    tasks: [
      { title: "Progress tracking dashboard", status: "done", sortOrder: 0 },
      { title: "Deploy to Railway", status: "in-progress", sortOrder: 1 },
      { title: "Knowledge browser UI", status: "pending", sortOrder: 2 },
      { title: "Agent interaction interface", status: "pending", sortOrder: 3 },
      { title: "Generation history + export", status: "pending", sortOrder: 4 },
      { title: "Auth (Michael + Sardar)", status: "pending", sortOrder: 5 },
      { title: "Admin panel (add knowledge, re-embed)", status: "pending", sortOrder: 6 },
    ],
  },
  {
    slug: "refinement",
    title: "Continuous Improvement",
    description: "Ongoing enhancement based on real usage and new inputs",
    sortOrder: 7,
    tasks: [
      { title: "Add new client projects as case studies", status: "pending", sortOrder: 0 },
      { title: "Refine agent outputs from real usage feedback", status: "pending", sortOrder: 1 },
      { title: "Add new SOPs as discovered", status: "pending", sortOrder: 2 },
      { title: "Benchmark outputs vs SearchAtlas", status: "pending", sortOrder: 3 },
      { title: "Agent specialization tuning per niche", status: "pending", sortOrder: 4 },
    ],
  },
];

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.task.deleteMany();
  await prisma.phase.deleteMany();

  for (const phase of phases) {
    const { tasks, ...phaseData } = phase;
    await prisma.phase.create({
      data: {
        ...phaseData,
        tasks: {
          create: tasks,
        },
      },
    });
    console.log(`  Created phase: ${phase.title} (${tasks.length} tasks)`);
  }

  // Create default users
  await prisma.user.deleteMany();
  await prisma.user.createMany({
    data: [
      { email: "michael@latenightmillionaires.com", name: "Michael", role: "admin" },
      { email: "786hopefrbest@gmail.com", name: "Sardar", role: "member" },
    ],
  });
  console.log("  Created users: Michael (admin), Sardar (member)");

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

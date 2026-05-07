import { NextResponse } from "next/server";
import { getPrisma } from "../../lib/db";
import { hashPassword } from "../../lib/auth";

const phases = [
  {
    slug: "extraction",
    title: "Phase 1: Extraction",
    description: "Collect raw knowledge from Koray's resources, YouTube, GPTs, and client projects",
    sortOrder: 0,
    tasks: [
      { title: "Scrape all website articles (~699)", status: "done", assignedTo: "Michael", sortOrder: 0 },
      { title: "Extract YouTube transcripts (~53)", status: "done", assignedTo: "Michael", sortOrder: 1 },
      { title: "Build custom scraper tool", status: "done", assignedTo: "Michael", sortOrder: 2 },
      { title: "Extract Custom GPT prompts (47)", status: "done", assignedTo: "Michael", sortOrder: 3 },
      { title: "Build Strategy Snapshot tool", status: "done", assignedTo: "Michael", sortOrder: 4 },
      { title: "Run snapshots on Koray's 10 projects", status: "done", assignedTo: "Michael", sortOrder: 5 },
      { title: "Receive 40-50+ Custom GPTs from Sardar", status: "blocked", assignedTo: "Sardar", blockedBy: "Sardar sending via WhatsApp", sortOrder: 6 },
      { title: "Receive Content Rules Google Doc", status: "blocked", assignedTo: "Sardar", blockedBy: "Sardar sending doc", sortOrder: 7 },
      { title: "Receive structure/layout examples doc", status: "blocked", assignedTo: "Sardar", blockedBy: "Sardar sending doc", sortOrder: 8 },
    ],
  },
  {
    slug: "strategy-snapshots",
    title: "Phase 1.5: Strategy Snapshots",
    description: "Crawl project sites and extract structural blueprints",
    sortOrder: 1,
    tasks: [
      { title: "Build Strategy Snapshot tool", status: "done", assignedTo: "Michael", sortOrder: 0 },
      { title: "Get 10 project URLs from Sardar", status: "done", assignedTo: "Sardar", sortOrder: 1 },
      { title: "Run snapshots on all 10 projects", status: "done", assignedTo: "Michael", sortOrder: 2 },
      { title: "Review blueprints for completeness", status: "pending", assignedTo: "Michael", sortOrder: 3 },
    ],
  },
  {
    slug: "consolidation",
    title: "Phase 2: Knowledge Consolidation",
    description: "Organize 749 source files into 17-topic knowledge base (965 files)",
    sortOrder: 2,
    tasks: [
      { title: "Define topic taxonomy (17 categories)", status: "done", assignedTo: "Michael", sortOrder: 0 },
      { title: "Create consolidated-knowledge/ folder structure", status: "done", assignedTo: "Michael", sortOrder: 1 },
      { title: "Route all 749 files to topic folders", status: "done", assignedTo: "Michael", sortOrder: 2 },
      { title: "Fix sparse folders with content-level search", status: "done", assignedTo: "Michael", sortOrder: 3 },
      { title: "Create INDEX.md master catalog", status: "done", assignedTo: "Michael", sortOrder: 4 },
      { title: "Validate coverage (749 → 965 routed copies)", status: "done", assignedTo: "Michael", sortOrder: 5 },
    ],
  },
  {
    slug: "chunking",
    title: "Phase 2.5: Chunking Pipeline",
    description: "Split consolidated files into 200-1000 token retrievable units with metadata",
    sortOrder: 3,
    tasks: [
      { title: "Design chunking strategy per content type", status: "done", sortOrder: 0 },
      { title: "Build chunking pipeline script", status: "done", sortOrder: 1 },
      { title: "Define metadata schema", status: "done", sortOrder: 2 },
      { title: "Process website articles into chunks", status: "done", sortOrder: 3 },
      { title: "Process video transcripts into chunks", status: "done", sortOrder: 4 },
      { title: "Process GPT prompts + strategy blueprints", status: "done", sortOrder: 5 },
      { title: "Validate chunk quality", status: "done", sortOrder: 6 },
    ],
  },
  {
    slug: "database",
    title: "Phase 3: Vector Database & RAG",
    description: "Store embeddings, build retrieval pipeline for agent knowledge",
    sortOrder: 4,
    tasks: [
      { title: "Choose vector DB (Railway Postgres + pgvector)", status: "done", sortOrder: 0 },
      { title: "Update Prisma schema with vector fields", status: "done", sortOrder: 1 },
      { title: "Generate embeddings for all 14,130 chunks", status: "done", sortOrder: 2 },
      { title: "Build hybrid retrieval function", status: "done", sortOrder: 3 },
      { title: "Build search API endpoint", status: "done", sortOrder: 4 },
      { title: "Test retrieval accuracy", status: "done", sortOrder: 5 },
    ],
  },
  {
    slug: "dashboard",
    title: "Phase 4: Dashboard & Auth",
    description: "Web interface with auth, knowledge browser, RAG chat, generation history",
    sortOrder: 5,
    tasks: [
      { title: "Deploy progress tracker to Railway", status: "done", assignedTo: "Michael", sortOrder: 0 },
      { title: "Add dashboard editing (CRUD)", status: "done", assignedTo: "Michael", sortOrder: 1 },
      { title: "JWT auth (Michael + Sardar logins)", status: "done", assignedTo: "Michael", sortOrder: 2 },
      { title: "Knowledge browser UI", status: "done", assignedTo: "Michael", sortOrder: 3 },
      { title: "RAG chat interface (streaming)", status: "done", assignedTo: "Michael", sortOrder: 4 },
      { title: "Generation history", status: "done", assignedTo: "Michael", sortOrder: 5 },
    ],
  },
  {
    slug: "content-tool",
    title: "Phase 5: Content Writing Tool",
    description: "AI content writer trained on Koray's proven projects and knowledge",
    sortOrder: 6,
    tasks: [
      { title: "Define content types (service, blog, location page)", status: "pending", sortOrder: 0 },
      { title: "Build brief generation stage", status: "pending", sortOrder: 1 },
      { title: "Build content generation stage", status: "pending", sortOrder: 2 },
      { title: "Build self-check/validation stage", status: "pending", sortOrder: 3 },
      { title: "Train on Koray's 60-70 projects", status: "pending", sortOrder: 4 },
      { title: "Separate commercial vs educational training", status: "pending", sortOrder: 5 },
      { title: "Test and iterate on output quality", status: "pending", sortOrder: 6 },
    ],
  },
  {
    slug: "gmb-tool",
    title: "Phase 6: GMB Optimization Tool",
    description: "Local SEO tool with SOP-based task execution",
    sortOrder: 7,
    tasks: [
      { title: "Define 10-15 standardized GMB tasks from SOPs", status: "pending", sortOrder: 0 },
      { title: "Build task execution system", status: "pending", sortOrder: 1 },
      { title: "Integrate with existing audit tool (Purpler API)", status: "pending", sortOrder: 2 },
      { title: "Add local outreach layer", status: "pending", sortOrder: 3 },
      { title: "Industry/niche auto-detection", status: "pending", sortOrder: 4 },
      { title: "Get 20-30 local business projects for training", status: "pending", assignedTo: "Sardar", sortOrder: 5 },
      { title: "Test with real client end-to-end", status: "pending", sortOrder: 6 },
    ],
  },
  {
    slug: "scaling",
    title: "Phase 7: Scaling & Iteration",
    description: "Ongoing improvement, new knowledge sources, additional tools",
    sortOrder: 8,
    tasks: [
      { title: "Add new client projects as case studies", status: "pending", sortOrder: 0 },
      { title: "Build additional specialized tools", status: "pending", sortOrder: 1 },
      { title: "Benchmark outputs vs competitors", status: "pending", sortOrder: 2 },
      { title: "Scale to team use (role-based access)", status: "pending", sortOrder: 3 },
    ],
  },
];

export async function POST() {
  try {
    const prisma = getPrisma();

    await prisma.task.deleteMany();
    await prisma.phase.deleteMany();

    const results = [];
    for (const phase of phases) {
      const { tasks, ...phaseData } = phase;
      const created = await prisma.phase.create({
        data: {
          ...phaseData,
          tasks: { create: tasks },
        },
      });
      results.push(`${phase.title}: ${tasks.length} tasks`);
    }

    // Hash passwords
    const michaelHash = await hashPassword(
      process.env.MICHAEL_PASSWORD || "lnm-michael-2026"
    );
    const sardarHash = await hashPassword(
      process.env.SARDAR_PASSWORD || "lnm-sardar-2026"
    );

    await prisma.user.deleteMany();
    await prisma.user.createMany({
      data: [
        {
          email: "michael@latenightmillionaires.com",
          name: "Michael",
          role: "admin",
          passwordHash: michaelHash,
        },
        {
          email: "786hopefrbest@gmail.com",
          name: "Sardar",
          role: "member",
          passwordHash: sardarHash,
        },
      ],
    });
    results.push("Users: Michael (admin), Sardar (member) — with password hashes");

    return NextResponse.json({ success: true, seeded: results });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Compare generated Bristol brief against gold-standard CSV.
 *
 * Run:
 *   npx tsx scripts/compare-bristol.ts
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// ---------- CSV Parser (handles quoted multi-line cells) ----------

function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuote = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inQuote) {
      if (ch === '"' && raw[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuote = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ",") {
        row.push(cell);
        cell = "";
      } else if (ch === "\n") {
        row.push(cell);
        cell = "";
        rows.push(row);
        row = [];
      } else if (ch === "\r") {
        // skip
      } else {
        cell += ch;
      }
    }
  }
  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

// ---------- Gold-standard extraction ----------

interface GoldHeading {
  text: string;
  level: number;
  structure: string;
  connection: string;
  queries: { query: string; volume: number }[];
}

function extractGoldStandard(csvPath: string) {
  const raw = readFileSync(csvPath, "utf-8");
  const rows = parseCsv(raw);

  // Row 0 = header. Headings are rows where column B matches H\d.
  const headings: GoldHeading[] = [];
  const allKeywords: { query: string; volume: number }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const text = (r[0] || "").trim();
    const hier = (r[1] || "").trim().toUpperCase();
    const structure = (r[2] || "").trim();
    const connection = (r[3] || "").trim();

    // Collect keywords from columns E-J (3 query/volume pairs)
    for (let col = 4; col <= 8; col += 2) {
      const q = (r[col] || "").trim();
      const v = parseInt(r[col + 1] || "0", 10) || 0;
      if (q) allKeywords.push({ query: q, volume: v });
    }

    // If hierarchy column matches H1-H6, it's a heading row
    const levelMatch = hier.match(/^H(\d)$/);
    if (levelMatch && text) {
      const level = parseInt(levelMatch[1], 10);
      const queries: { query: string; volume: number }[] = [];
      for (let col = 4; col <= 8; col += 2) {
        const q = (r[col] || "").trim();
        const v = parseInt(r[col + 1] || "0", 10) || 0;
        if (q) queries.push({ query: q, volume: v });
      }
      headings.push({ text, level, structure, connection, queries });
    }
  }

  // Dedupe keywords
  const seen = new Set<string>();
  const uniqueKw = allKeywords.filter((k) => {
    const key = k.query.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { headings, allKeywords: uniqueKw };
}

// ---------- Generated brief loader ----------

interface GeneratedBrief {
  contextualVectors: string[];
  headings: {
    level: number;
    text: string;
    structureInstructions: string;
    targetQueries: { query: string; volume: number; intent: string }[];
    ruleCodes: string[];
    intent: string;
    wordCountTarget?: number;
    structurePattern?: string;
    contentDesignPattern?: string;
    connections?: { fromHeading: string; toPage: string; anchorText: string; reason: string }[];
  }[];
  entityMap: { entity: string; type: string; relevance: string }[];
  connectionMap: { fromHeading: string; toPage: string; anchorText: string; reason: string }[];
  qualityReport?: {
    overallScore: number;
    breakdown: Record<string, number>;
    knowledgeGaps: string[];
    recommendations: string[];
  };
  headingValidation?: { score: number; issues: unknown[] };
}

// ---------- Comparison dimensions ----------

function compareHeadingCount(gold: GoldHeading[], gen: GeneratedBrief): { score: number; detail: string } {
  const gTotal = gold.length; // 17
  const gGen = gen.headings.length;

  // Perfect = same count. Slight penalty for minor differences.
  // Service pages: 15-35 is acceptable range.
  const diff = Math.abs(gTotal - gGen);
  let score: number;
  if (diff === 0) score = 20;
  else if (diff <= 3) score = 18;
  else if (diff <= 6) score = 14;
  else if (diff <= 10) score = 10;
  else score = 5;

  // Level breakdown comparison
  const goldLevels: Record<string, number> = {};
  const genLevels: Record<string, number> = {};
  for (const h of gold) goldLevels[`H${h.level}`] = (goldLevels[`H${h.level}`] || 0) + 1;
  for (const h of gen.headings) genLevels[`H${h.level}`] = (genLevels[`H${h.level}`] || 0) + 1;

  const goldStr = Object.entries(goldLevels).sort().map(([k, v]) => `${k}:${v}`).join(" ");
  const genStr = Object.entries(genLevels).sort().map(([k, v]) => `${k}:${v}`).join(" ");

  return {
    score,
    detail: `Gold: ${gTotal} headings (${goldStr}) | Generated: ${gGen} headings (${genStr}) | Diff: ${diff}`,
  };
}

function compareH1Pattern(gold: GoldHeading[], gen: GeneratedBrief): { score: number; detail: string } {
  const goldH1 = gold.find((h) => h.level === 1);
  const genH1 = gen.headings.find((h) => h.level === 1);

  if (!genH1) return { score: 0, detail: "No H1 in generated brief" };
  if (!goldH1) return { score: 15, detail: "No H1 in gold standard (unexpected)" };

  let score = 0;
  const notes: string[] = [];

  // 1. H1 exists and is first heading (5 pts)
  if (gen.headings[0]?.level === 1) {
    score += 5;
    notes.push("H1 is first heading");
  } else {
    notes.push("H1 is NOT first heading");
  }

  // 2. H1 follows purpose-summary pattern (5 pts)
  const pattern = genH1.structurePattern || genH1.contentDesignPattern || "";
  if (pattern === "purpose-summary") {
    score += 5;
    notes.push("purpose-summary pattern assigned");
  } else {
    notes.push(`pattern is "${pattern}" (expected purpose-summary)`);
  }

  // 3. H1 structure instructions mention summary/representative (5 pts)
  const instr = (genH1.structureInstructions || "").toLowerCase();
  if (instr.includes("summar") || instr.includes("represent") || instr.includes("purpose")) {
    score += 5;
    notes.push("instructions mention summary/representative");
  } else {
    notes.push("instructions lack summary/representative language");
  }

  // 4. H1 contains location keyword (5 pts for local service page)
  if (genH1.text.toLowerCase().includes("bristol")) {
    score += 5;
    notes.push("H1 contains 'Bristol'");
  } else {
    notes.push("H1 missing 'Bristol'");
  }

  return {
    score,
    detail: `Gold H1: "${goldH1.text.slice(0, 60)}..."\nGen  H1: "${genH1.text.slice(0, 60)}..."\n${notes.join(" | ")}`,
  };
}

function compareStructureInstructions(gold: GoldHeading[], gen: GeneratedBrief): { score: number; detail: string } {
  // Check what fraction of generated headings have meaningful structure instructions
  const genWithInstr = gen.headings.filter(
    (h) => h.structureInstructions && h.structureInstructions.trim().length >= 15
  );
  const goldWithInstr = gold.filter((h) => h.structure.length >= 15);

  const genPct = gen.headings.length > 0 ? genWithInstr.length / gen.headings.length : 0;
  const goldPct = gold.length > 0 ? goldWithInstr.length / gold.length : 0;

  // Check structure pattern diversity
  const patterns = new Set(
    gen.headings
      .map((h) => h.structurePattern || h.contentDesignPattern)
      .filter(Boolean)
  );

  let score = 0;

  // Coverage (10 pts)
  if (genPct >= 0.9) score += 10;
  else if (genPct >= 0.7) score += 7;
  else if (genPct >= 0.5) score += 5;
  else score += 2;

  // Pattern diversity (5 pts): gold uses purpose-summary, explicit-definition, list-definition, direct-answer
  if (patterns.size >= 4) score += 5;
  else if (patterns.size >= 3) score += 4;
  else if (patterns.size >= 2) score += 3;
  else score += 1;

  // Rule code assignment (5 pts)
  const withRules = gen.headings.filter((h) => h.ruleCodes && h.ruleCodes.length > 0);
  const rulesPct = gen.headings.length > 0 ? withRules.length / gen.headings.length : 0;
  if (rulesPct >= 0.9) score += 5;
  else if (rulesPct >= 0.7) score += 4;
  else if (rulesPct >= 0.5) score += 3;
  else score += 1;

  return {
    score,
    detail: `Gold: ${goldWithInstr.length}/${gold.length} (${(goldPct * 100).toFixed(0)}%) with instructions | Gen: ${genWithInstr.length}/${gen.headings.length} (${(genPct * 100).toFixed(0)}%) | Patterns: ${[...patterns].join(", ")} | Rules assigned: ${withRules.length}/${gen.headings.length}`,
  };
}

function compareQueryCoverage(gold: GoldHeading[], gen: GeneratedBrief, allGoldKw: { query: string; volume: number }[]): { score: number; detail: string } {
  // Primary keywords (mapped to headings in gold standard)
  const goldPrimaryKw = new Set(
    gold.flatMap((h) => h.queries.map((q) => q.query.toLowerCase()))
  );

  // Generated keywords mapped to headings
  const genMappedKw = new Set(
    gen.headings.flatMap((h) => (h.targetQueries || []).map((q) => q.query.toLowerCase()))
  );

  // How many gold primary keywords are covered by generated brief?
  let primaryHits = 0;
  for (const kw of goldPrimaryKw) {
    // Check if any generated query contains or matches the gold keyword
    for (const gq of genMappedKw) {
      if (gq.includes(kw) || kw.includes(gq)) {
        primaryHits++;
        break;
      }
    }
  }

  const primaryCoverage = goldPrimaryKw.size > 0 ? primaryHits / goldPrimaryKw.size : 0;

  // Total keywords mapped in generated brief
  const totalGenKw = genMappedKw.size;

  let score = 0;

  // Primary keyword coverage (12 pts)
  if (primaryCoverage >= 0.8) score += 12;
  else if (primaryCoverage >= 0.6) score += 9;
  else if (primaryCoverage >= 0.4) score += 6;
  else score += 3;

  // Per-heading query density (8 pts): gold has ~1 keyword per heading
  const headingsWithQueries = gen.headings.filter(
    (h) => h.targetQueries && h.targetQueries.length > 0
  );
  const queryDensity = gen.headings.length > 0
    ? headingsWithQueries.length / gen.headings.length
    : 0;

  if (queryDensity >= 0.7) score += 8;
  else if (queryDensity >= 0.5) score += 6;
  else if (queryDensity >= 0.3) score += 4;
  else score += 2;

  return {
    score,
    detail: `Gold primary KW: ${goldPrimaryKw.size} | Matched: ${primaryHits} (${(primaryCoverage * 100).toFixed(0)}%) | Gen mapped KW: ${totalGenKw} | Headings with queries: ${headingsWithQueries.length}/${gen.headings.length} (${(queryDensity * 100).toFixed(0)}%)`,
  };
}

function compareHierarchy(gold: GoldHeading[], gen: GeneratedBrief): { score: number; detail: string } {
  let score = 0;
  const notes: string[] = [];

  // 1. Starts with H1 (5 pts)
  if (gen.headings.length > 0 && gen.headings[0].level === 1) {
    score += 5;
    notes.push("starts with H1");
  } else {
    notes.push("does NOT start with H1");
  }

  // 2. Exactly 1 H1 (3 pts)
  const h1Count = gen.headings.filter((h) => h.level === 1).length;
  if (h1Count === 1) {
    score += 3;
    notes.push("exactly 1 H1");
  } else {
    notes.push(`${h1Count} H1s`);
  }

  // 3. No level skipping (5 pts)
  let skips = 0;
  for (let i = 1; i < gen.headings.length; i++) {
    if (gen.headings[i].level > gen.headings[i - 1].level + 1) {
      skips++;
    }
  }
  if (skips === 0) {
    score += 5;
    notes.push("no level skips");
  } else {
    score += Math.max(0, 5 - skips * 2);
    notes.push(`${skips} level skip(s)`);
  }

  // 4. Sufficient H2 count (4 pts): gold has 5 H2s
  const h2Count = gen.headings.filter((h) => h.level === 2).length;
  if (h2Count >= 4 && h2Count <= 12) {
    score += 4;
    notes.push(`${h2Count} H2s (good range)`);
  } else if (h2Count >= 2) {
    score += 2;
    notes.push(`${h2Count} H2s (sparse)`);
  } else {
    notes.push(`${h2Count} H2s (too few)`);
  }

  // 5. Has sub-headings under H2s (3 pts)
  const h3Count = gen.headings.filter((h) => h.level === 3).length;
  if (h3Count >= 3) {
    score += 3;
    notes.push(`${h3Count} H3s`);
  } else if (h3Count >= 1) {
    score += 2;
    notes.push(`${h3Count} H3s (few)`);
  } else {
    notes.push("no H3s");
  }

  return {
    score,
    detail: notes.join(" | "),
  };
}

// ---------- Main ----------

function main() {
  const goldPath = resolve(
    process.cwd(),
    "../Writing Rules/Briefs Rules/Domestic Home Removal Service in Bristol.csv"
  );
  const genPath = resolve(process.cwd(), "output/bristol-brief-generated.json");

  if (!existsSync(goldPath)) {
    console.error(`Gold standard CSV not found: ${goldPath}`);
    process.exit(1);
  }
  if (!existsSync(genPath)) {
    console.error(`Generated brief not found: ${genPath}. Run test-bristol-brief.ts first.`);
    process.exit(1);
  }

  const { headings: goldHeadings, allKeywords: goldKeywords } = extractGoldStandard(goldPath);
  const gen: GeneratedBrief = JSON.parse(readFileSync(genPath, "utf-8"));

  console.log("=== Bristol Brief Comparison: Generated vs Gold Standard ===\n");
  console.log(`Gold standard: ${goldHeadings.length} headings, ${goldKeywords.length} unique keywords`);
  console.log(`Generated:     ${gen.headings.length} headings, ${gen.headings.reduce((n, h) => n + (h.targetQueries?.length || 0), 0)} mapped keywords`);
  console.log("");

  // Run comparisons
  const dims: { name: string; maxScore: number; result: { score: number; detail: string } }[] = [
    { name: "Heading Count & Levels", maxScore: 20, result: compareHeadingCount(goldHeadings, gen) },
    { name: "H1 Purpose-Summary", maxScore: 20, result: compareH1Pattern(goldHeadings, gen) },
    { name: "Structure Instructions", maxScore: 20, result: compareStructureInstructions(goldHeadings, gen) },
    { name: "Query Coverage", maxScore: 20, result: compareQueryCoverage(goldHeadings, gen, goldKeywords) },
    { name: "Hierarchy Quality", maxScore: 20, result: compareHierarchy(goldHeadings, gen) },
  ];

  let total = 0;
  for (const d of dims) {
    total += d.result.score;
    const bar = "█".repeat(d.result.score) + "░".repeat(d.maxScore - d.result.score);
    console.log(`--- ${d.name} (${d.result.score}/${d.maxScore}) ${bar}`);
    console.log(`    ${d.result.detail}\n`);
  }

  console.log("=".repeat(60));
  console.log(`TOTAL SCORE: ${total}/100`);
  console.log("=".repeat(60));

  if (total >= 75) {
    console.log("\nVERDICT: PASS — brief pipeline meets gold-standard bar.");
  } else if (total >= 60) {
    console.log("\nVERDICT: MARGINAL — pipeline needs prompt tuning in low-scoring areas.");
  } else {
    console.log("\nVERDICT: FAIL — significant gaps. Review pipeline steps for the lowest dimensions.");
  }

  // Identify weakest dimensions
  const sorted = [...dims].sort((a, b) => a.result.score - b.result.score);
  if (total < 75) {
    console.log("\nWeakest areas (tune these pipeline steps first):");
    for (const d of sorted.slice(0, 2)) {
      console.log(`  - ${d.name}: ${d.result.score}/${d.maxScore}`);
    }
  }

  // Show pipeline quality report if available
  if (gen.qualityReport) {
    console.log("\n--- Pipeline Self-Assessment ---");
    console.log(`Overall: ${gen.qualityReport.overallScore}/100`);
    for (const [k, v] of Object.entries(gen.qualityReport.breakdown)) {
      console.log(`  ${k}: ${v}`);
    }
    if (gen.qualityReport.knowledgeGaps.length > 0) {
      console.log(`Knowledge Gaps: ${gen.qualityReport.knowledgeGaps.join(", ")}`);
    }
  }
}

main();

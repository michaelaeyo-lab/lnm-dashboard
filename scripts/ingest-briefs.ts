/**
 * Ingest 112 CSV brief files from Writing Rules/Briefs Rules/
 * into consolidated-knowledge/19-brief-examples/ as structured markdown.
 *
 * Usage: npx tsx scripts/ingest-briefs.ts
 */

import fs from "fs";
import path from "path";

const BRIEFS_DIR = path.resolve(
  __dirname,
  "../../Writing Rules/Briefs Rules"
);
const OUTPUT_DIR = path.resolve(
  __dirname,
  "../../consolidated-knowledge/19-brief-examples"
);

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsv(content: string): { headers: string[]; rows: string[][] } {
  // Split on newlines but respect quoted fields with newlines
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const ch of content) {
    if (ch === '"') inQuotes = !inQuotes;
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (current.trim()) lines.push(current);
      current = "";
    } else if (ch !== "\r") {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);
  return { headers, rows };
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 100);
}

function inferPageType(filename: string, content: string): string {
  const lower = (filename + " " + content).toLowerCase();
  if (lower.includes("homepage") || lower.includes("home page")) return "homepage";
  if (lower.includes("service") || lower.includes("removal") || lower.includes("clearance") || lower.includes("packing") || lower.includes("man and van") || lower.includes("rental")) return "service";
  if (lower.includes("bristol") || lower.includes("bath") || lower.includes("gloucester") || lower.includes("neighborhood")) return "location";
  if (lower.includes("how to") || lower.includes("tips") || lower.includes("guide") || lower.includes("what is")) return "blog";
  return "informational";
}

function convertBriefToMarkdown(
  filename: string,
  headers: string[],
  rows: string[][]
): string {
  const topic = filename.replace(/\.csv$/i, "");
  const pageType = inferPageType(filename, rows.map(r => r.join(" ")).join(" "));

  let md = `# ${topic} — Content Brief\n\n`;
  md += `**Page Type:** ${pageType}\n`;
  md += `**Source:** Sardar's Brief Sheet\n`;
  md += `**Total Rows:** ${rows.length}\n\n`;
  md += `---\n\n## Heading Structure\n\n`;

  // Find column indices
  const colMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    const lower = h.toLowerCase().trim();
    if (lower.includes("vector")) colMap.vectors = i;
    if (lower.includes("hierarchy")) colMap.hierarchy = i;
    if (lower.includes("structure")) colMap.structure = i;
    if (lower.includes("connection")) colMap.connection = i;
    if (lower.includes("quer") && !lower.includes("volume") && !lower.includes("freq")) {
      if (colMap.queries1 === undefined) colMap.queries1 = i;
      else if (colMap.queries2 === undefined) colMap.queries2 = i;
      else if (colMap.queries3 === undefined) colMap.queries3 = i;
    }
    if (lower.includes("volume")) {
      if (colMap.volume1 === undefined) colMap.volume1 = i;
      else if (colMap.volume2 === undefined) colMap.volume2 = i;
      else if (colMap.volume3 === undefined) colMap.volume3 = i;
    }
    if (lower.includes("freq")) colMap.frequency = i;
    if (lower.includes("linking") || lower.includes("internal")) colMap.linking = i;
    if (lower.includes("definition")) colMap.definition = i;
    if (lower.includes("image")) colMap.image = i;
    if (lower.includes("alt")) colMap.alt = i;
  });

  for (const row of rows) {
    const vectors = row[colMap.vectors] || "";
    const hierarchy = row[colMap.hierarchy] || "";
    const structure = row[colMap.structure] || "";
    const connection = row[colMap.connection] || "";

    // Skip empty rows
    if (!vectors && !hierarchy && !structure) continue;

    // Determine heading level
    let headingLevel = "";
    const hMatch = hierarchy.match(/^H([1-4])/i);
    if (hMatch) {
      headingLevel = `H${hMatch[1]}`;
    }

    const prefix = headingLevel ? `${headingLevel}: ` : "";
    const mdHeading = headingLevel === "H1" ? "###" :
                      headingLevel === "H2" ? "###" :
                      headingLevel === "H3" ? "####" :
                      headingLevel === "H4" ? "#####" : "###";

    md += `${mdHeading} ${prefix}${vectors}\n\n`;

    if (structure) {
      md += `**Structure Instructions:**\n${structure}\n\n`;
    }

    if (connection) {
      md += `**Internal Linking:** ${connection}\n\n`;
    }

    // Collect queries + volumes
    const queries: string[] = [];
    const qCols = [colMap.queries1, colMap.queries2, colMap.queries3];
    const vCols = [colMap.volume1, colMap.volume2, colMap.volume3];
    for (let i = 0; i < qCols.length; i++) {
      const q = qCols[i] !== undefined ? (row[qCols[i]] || "").trim() : "";
      const v = vCols[i] !== undefined ? (row[vCols[i]] || "").trim() : "";
      if (q) queries.push(v ? `${q} (${v})` : q);
    }
    if (queries.length > 0) {
      md += `**Target Queries:** ${queries.join(", ")}\n\n`;
    }

    md += `---\n\n`;
  }

  return md;
}

function convertRulesToMarkdown(headers: string[], rows: string[][]): string {
  let md = `# Koray's 56 Semantic Writing Rules — Reference\n\n`;
  md += `**Source:** Rules.csv from Sardar's Brief Sheet\n`;
  md += `**Total Rules:** ${rows.length}\n\n`;
  md += `---\n\n`;

  for (const row of rows) {
    const ruleNum = row[0] || "";
    const code = row[1] || "";
    const description = row[2] || "";
    const reminder = row[3] || "";

    if (!ruleNum && !code) continue;

    md += `### Rule ${ruleNum}: ${code}\n\n`;
    md += `${description}\n\n`;
    if (reminder) {
      md += `**Reminder:** ${reminder}\n\n`;
    }
    md += `---\n\n`;
  }

  return md;
}

// Main
function main() {
  if (!fs.existsSync(BRIEFS_DIR)) {
    console.error(`Briefs directory not found: ${BRIEFS_DIR}`);
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const csvFiles = fs.readdirSync(BRIEFS_DIR).filter(f => f.toLowerCase().endsWith(".csv"));
  console.log(`Found ${csvFiles.length} CSV files in ${BRIEFS_DIR}`);

  let processed = 0;
  let skipped = 0;

  for (const file of csvFiles) {
    const content = fs.readFileSync(path.join(BRIEFS_DIR, file), "utf-8");
    const { headers, rows } = parseCsv(content);

    // Skip files with fewer than 3 data rows
    if (rows.length < 3) {
      console.log(`  SKIP: ${file} (${rows.length} rows — too few)`);
      skipped++;
      continue;
    }

    let markdown: string;
    const safeName = sanitizeFilename(file.replace(/\.csv$/i, ""));

    if (file.toLowerCase() === "rules.csv") {
      markdown = convertRulesToMarkdown(headers, rows);
      fs.writeFileSync(path.join(OUTPUT_DIR, "00-writing-rules-reference.md"), markdown, "utf-8");
      console.log(`  OK: Rules.csv → 00-writing-rules-reference.md (${rows.length} rules)`);
    } else {
      markdown = convertBriefToMarkdown(file, headers, rows);
      fs.writeFileSync(path.join(OUTPUT_DIR, `${safeName}.md`), markdown, "utf-8");
      console.log(`  OK: ${file} → ${safeName}.md (${rows.length} rows)`);
    }

    processed++;
  }

  console.log(`\nDone: ${processed} processed, ${skipped} skipped`);
}

main();

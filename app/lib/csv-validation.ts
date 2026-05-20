/**
 * CSV validation — compares pipeline brief output against Sardar's gold-standard CSV format.
 *
 * Gold-standard CSV columns:
 *   Contextual Vectors | Contextual Hierarchy | Contextual Structure |
 *   Contextual Connection | Queries 1 | Volume | Queries .2 | Volume | Queries.3 | Volume
 *
 * This module checks that a generated EnhancedBrief can be faithfully exported to that
 * format and that the pipeline output matches the structural expectations.
 */

import type {
  EnhancedBrief,
  EnhancedHeading,
  ConnectionEntry,
  QueryEntry,
} from "./types";

// ── Types ───────────────────────────────────────────────────────

export interface CsvValidationIssue {
  severity: "error" | "warning" | "info";
  heading?: string;
  field: string;
  message: string;
}

export interface CsvValidationResult {
  valid: boolean;
  score: number; // 0-100
  issues: CsvValidationIssue[];
  csvPreview: string[][]; // the brief as CSV rows for inspection
}

// ── Core validation ─────────────────────────────────────────────

export function validateBriefAgainstCsvFormat(brief: EnhancedBrief): CsvValidationResult {
  const issues: CsvValidationIssue[] = [];
  const csvRows: string[][] = [];

  // Header row
  csvRows.push([
    "Contextual Vectors",
    "Contextual Hierarchy",
    "Contextual Structure",
    "Contextual Connection",
    "Queries 1",
    "Volume",
    "Queries .2",
    "Volume",
    "Queries.3",
    "Volume",
  ]);

  const headings = brief.headings || [];

  // 1. H1 must exist and use purpose-summary pattern
  const h1 = headings.find((h) => h.level === 1);
  if (!h1) {
    issues.push({
      severity: "error",
      field: "Contextual Vectors",
      message: "No H1 heading found — CSV requires H1 as the first data row representing all contextual vectors.",
    });
  } else {
    const pattern = h1.structurePattern || h1.contentDesignPattern;
    if (pattern !== "purpose-summary") {
      issues.push({
        severity: "warning",
        heading: h1.text,
        field: "Contextual Structure",
        message: `H1 should use "purpose-summary" pattern (found: "${pattern || "none"}"). CSV gold standard requires H1 to summarize all contextual vectors.`,
      });
    }
  }

  // 2. Check each heading maps to a valid CSV row
  for (const heading of headings) {
    const row: string[] = [];

    // Col A: Contextual Vectors (heading text)
    row.push(heading.text);

    // Col B: Contextual Hierarchy (H-level)
    row.push(`H${heading.level}`);

    // Col C: Contextual Structure (structureInstructions)
    if (!heading.structureInstructions || heading.structureInstructions.trim().length < 10) {
      issues.push({
        severity: "warning",
        heading: heading.text,
        field: "Contextual Structure",
        message: "Structure instructions too short or missing — CSV gold standard has detailed writing instructions per heading.",
      });
    }
    row.push(heading.structureInstructions || "");

    // Col D: Contextual Connection (per-heading connections)
    const headingConnections = heading.connections || [];
    const briefConnections = (brief.connectionMap || []).filter(
      (c) => c.fromHeading === heading.text
    );
    const connections = headingConnections.length > 0 ? headingConnections : briefConnections;

    if (connections.length === 0 && heading.level <= 2) {
      issues.push({
        severity: "info",
        heading: heading.text,
        field: "Contextual Connection",
        message: "No internal links mapped for this H1/H2 heading.",
      });
    }
    row.push(
      connections
        .map((c) => `${c.anchorText} → ${c.toPage}`)
        .join("; ")
    );

    // Cols E-J: Up to 3 query groups (query, volume pairs)
    const queries = heading.targetQueries || [];
    const groups = heading.queryGroups;

    const q1 = groups?.group1?.[0] || queries[0];
    const q2 = groups?.group2?.[0] || queries[1];
    const q3 = groups?.group3?.[0] || queries[2];

    row.push(q1?.query || "", q1 ? String(q1.volume) : "");
    row.push(q2?.query || "", q2 ? String(q2.volume) : "");
    row.push(q3?.query || "", q3 ? String(q3.volume) : "");

    // Check query coverage
    if (queries.length === 0 && heading.level <= 2) {
      issues.push({
        severity: "warning",
        heading: heading.text,
        field: "Queries",
        message: "No target queries assigned — CSV gold standard has 1-3 queries per heading.",
      });
    }

    csvRows.push(row);
  }

  // 3. Global checks
  if (!brief.contextualVectors || brief.contextualVectors.length === 0) {
    issues.push({
      severity: "error",
      field: "Contextual Vectors",
      message: "No contextual vectors found — these form the semantic backbone of the brief.",
    });
  }

  if (!brief.connectionMap || brief.connectionMap.length === 0) {
    issues.push({
      severity: "warning",
      field: "Contextual Connection",
      message: "No internal links in the brief — CSV gold standard includes per-heading connections.",
    });
  }

  // 4. Heading hierarchy check
  const levels = headings.map((h) => h.level);
  if (levels[0] !== 1) {
    issues.push({
      severity: "error",
      field: "Contextual Hierarchy",
      message: "First heading must be H1.",
    });
  }

  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      issues.push({
        severity: "warning",
        heading: headings[i].text,
        field: "Contextual Hierarchy",
        message: `Level skip: H${levels[i - 1]} → H${levels[i]}. CSV expects proper nesting.`,
      });
    }
  }

  // 5. Score calculation
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;
  const score = Math.max(0, 100 - errorCount * 20 - warnCount * 5);

  return {
    valid: errorCount === 0,
    score,
    issues,
    csvPreview: csvRows,
  };
}

// ── CSV export helper ───────────────────────────────────────────

export function briefToCsvString(brief: EnhancedBrief): string {
  const result = validateBriefAgainstCsvFormat(brief);
  return result.csvPreview
    .map((row) =>
      row.map((cell) => {
        const escaped = cell.replace(/"/g, '""');
        return cell.includes(",") || cell.includes('"') || cell.includes("\n")
          ? `"${escaped}"`
          : escaped;
      }).join(",")
    )
    .join("\n");
}

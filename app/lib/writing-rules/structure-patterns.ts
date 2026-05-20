/**
 * Structure Pattern Taxonomy
 *
 * Encodes Sardar's content brief structure instructions as typed patterns.
 * Each pattern maps to the "Contextual Structure" column in the CSV briefs
 * and drives the `structureInstructions` field in heading data.
 *
 * Patterns derived from:
 * - "Domestic Home Removal Service in Bristol.csv"
 * - "best month to move.csv"
 * - Design handoff contentDesignPattern values
 */

export type StructurePatternId =
  | "purpose-summary"
  | "explicit-definition"
  | "list-definition"
  | "direct-answer"
  | "exact-answer"
  | "reasoning-based"
  | "suggestive-answer"
  | "table-format"
  | "comparison"
  | "paragraph"
  | "visual";

export interface StructurePattern {
  id: StructurePatternId;
  label: string;
  description: string;
  /** Heading levels this pattern typically applies to */
  typicalLevels: number[];
  /** Template instruction inserted into the brief heading's structureInstructions field */
  instructionTemplate: string;
  /** Suggested word count range [min, max] */
  wordCountRange: [number, number];
  /** Structural rules specific to this pattern */
  structuralRules: string[];
  /** Design handoff icon key (maps to lucide icon name) */
  iconKey: string;
  /** Design handoff tone key */
  toneKey: string;
}

export const STRUCTURE_PATTERNS: Record<StructurePatternId, StructurePattern> = {
  "purpose-summary": {
    id: "purpose-summary",
    label: "Purpose Summary",
    description:
      "H1-level summary that represents all contextual vectors of the page in heading order. Uses paragraph format with implicit definitions.",
    typicalLevels: [1],
    instructionTemplate:
      "Summarize the entire document's contextual vectors in a representative manner using the same order. Use paragraph format. Include implicit definition of the main topic, key considerations, steps involved, cost indicators, and brand service context.",
    wordCountRange: [180, 280],
    structuralRules: [
      "Represent all contextual vectors in heading order",
      "Use implicit (not explicit) definitions",
      "Paragraph format only — no lists",
      "First sentence is a definitive positioning statement",
      "Include brand/service mention naturally",
    ],
    iconKey: "paragraph",
    toneKey: "default",
  },

  "explicit-definition": {
    id: "explicit-definition",
    label: "Explicit Definition",
    description:
      "Uses signifier, qualifier, and enriching context terms to define a concept. Context-rich, accurate, and clear.",
    typicalLevels: [2, 3],
    instructionTemplate:
      "Explicit definition using signifier, qualifier, and enriching context terms. The answer is context-rich, accurate, and clear. Include a direct yes/no answer if the heading implies a boolean question.",
    wordCountRange: [100, 160],
    structuralRules: [
      "Lead with the signifier (what the thing IS)",
      "Follow with qualifier (what distinguishes it)",
      "Enrich with context terms (related concepts, attributes)",
      "Direct yes/no answer if heading is boolean",
      "No analogies — factual definition only",
    ],
    iconKey: "paragraph",
    toneKey: "default",
  },

  "list-definition": {
    id: "list-definition",
    label: "List Definition",
    description:
      "List-style content with a structured intro sentence followed by enumerated items. Each item gets a one-sentence explanation.",
    typicalLevels: [2, 3],
    instructionTemplate:
      "List definition format. Start with a structured intro sentence: 'When [topic], [context]...'. Follow with enumerated items. Each item gets a 1-sentence factual explanation. Bold the list item term, not the search term.",
    wordCountRange: [200, 400],
    structuralRules: [
      "Intro sentence sets the list context",
      "Each list item is a single factual term or phrase",
      "Each item gets exactly 1 explanatory sentence",
      "Use the same part-of-speech tag for first word of each item",
      "Include counts: 'X items to consider'",
    ],
    iconKey: "list",
    toneKey: "amber",
  },

  "direct-answer": {
    id: "direct-answer",
    label: "Direct Answer",
    description:
      "First sentence is the definitive answer. Evidence follows. Optimized for featured snippet capture at 40-word limit.",
    typicalLevels: [2, 3, 4],
    instructionTemplate:
      "Direct answer format. First sentence is the definitive answer (40-word target for snippet optimization). Evidence and supporting data follow. Do not delay the answer. Bold the answer term, not the query term.",
    wordCountRange: [80, 180],
    structuralRules: [
      "First sentence = definitive answer (40-word snippet target)",
      "Evidence immediately follows",
      "No hedging language (avoid: may, might, could, generally)",
      "Include numeric values where applicable",
      "Subordinate text first sentence matches heading structure",
    ],
    iconKey: "paragraph",
    toneKey: "default",
  },

  "exact-answer": {
    id: "exact-answer",
    label: "Exact Answer",
    description:
      "Numeric or boolean answer with precise data. Uses specific numbers, percentages, or categorical counts.",
    typicalLevels: [3, 4],
    instructionTemplate:
      "Exact answer format. Lead with the precise number, percentage, or boolean. Follow with source attribution and date. Include data breakdowns if available.",
    wordCountRange: [60, 120],
    structuralRules: [
      "First word or phrase is the exact value",
      "Source attribution with year in second sentence",
      "Include data breakdown or range if applicable",
      "Use tabular-nums formatting for numbers",
      "Factual declarations only — no opinion modifiers",
    ],
    iconKey: "paragraph",
    toneKey: "cyan",
  },

  "reasoning-based": {
    id: "reasoning-based",
    label: "Reasoning-Based",
    description:
      "Explains why/how with logical chain. Walks through cause-effect relationships with evidence at each step.",
    typicalLevels: [2, 3],
    instructionTemplate:
      "Reasoning-based answer. Walk through the cause-effect chain with evidence at each step. Start with the conclusion, then present the reasoning. Each reasoning step gets its own sentence with a supporting data point.",
    wordCountRange: [140, 260],
    structuralRules: [
      "Conclusion first, reasoning follows",
      "Each step in the chain has a data point or source",
      "Use causal connectors: 'because', 'as a result', 'due to'",
      "Avoid speculative language",
      "End with practical implication",
    ],
    iconKey: "paragraph",
    toneKey: "default",
  },

  "suggestive-answer": {
    id: "suggestive-answer",
    label: "Suggestive Answer",
    description:
      "Provides a recommendation based on evidence and conditions. Uses conditional framing: 'X is optimal, if Y applies.'",
    typicalLevels: [2, 3],
    instructionTemplate:
      "Suggestive answer format. State the recommendation first, then the conditions under which it applies. Use 'X is optimal, if Y' structure — conditions come second. Include evidence for the recommendation.",
    wordCountRange: [100, 200],
    structuralRules: [
      "Recommendation statement first",
      "Conditions placed after the declaration",
      "Evidence supports the recommendation",
      "Include alternative if conditions don't apply",
      "No promotional language",
    ],
    iconKey: "paragraph",
    toneKey: "default",
  },

  "table-format": {
    id: "table-format",
    label: "Table Format",
    description:
      "Data presented in structured table with defined columns. Used for comparisons, pricing, feature matrices.",
    typicalLevels: [2, 3],
    instructionTemplate:
      "Table format. Define columns based on the comparison dimensions most relevant to the query. Each row is a distinct entity. Include a 1-2 sentence intro before the table and a 1-sentence synthesis after.",
    wordCountRange: [60, 120],
    structuralRules: [
      "1-2 sentence intro contextualizes the table",
      "Column headers are descriptive nouns, not questions",
      "Each cell contains factual data — no opinion",
      "Include source attribution for data",
      "1-sentence synthesis follows the table",
    ],
    iconKey: "table",
    toneKey: "cyan",
  },

  comparison: {
    id: "comparison",
    label: "Comparison",
    description:
      "Side-by-side comparison of two or more entities. Bullets only, no narrative. Each side anchored with named entity.",
    typicalLevels: [3, 4],
    instructionTemplate:
      "Two-column comparison format. Bullets only, no narrative prose. Anchor each side with one named vendor/entity. Match comparison dimensions across both sides.",
    wordCountRange: [80, 150],
    structuralRules: [
      "Two-column or side-by-side structure",
      "Bullets only — no paragraph narrative",
      "Same comparison dimensions on both sides",
      "Each side anchored by a named entity",
      "Include at least one quantitative differentiator",
    ],
    iconKey: "layers",
    toneKey: "violet",
  },

  paragraph: {
    id: "paragraph",
    label: "Paragraph",
    description:
      "Standard paragraph prose. Entity-driven, factual, short sentences. Default pattern when no specialized structure applies.",
    typicalLevels: [1, 2, 3, 4],
    instructionTemplate:
      "Paragraph format. Short, factual sentences. Entity-driven writing with specific data points. First sentence is the direct answer. Evidence follows.",
    wordCountRange: [100, 220],
    structuralRules: [
      "Short sentences (under 30 words preferred)",
      "Entity-driven: include entities, attributes, values",
      "First sentence answers the heading directly",
      "Include at least one numeric data point per paragraph",
      "Consistent terminology throughout",
    ],
    iconKey: "paragraph",
    toneKey: "default",
  },

  visual: {
    id: "visual",
    label: "Visual",
    description:
      "Content designed around a visual element (image, diagram, infographic). Text supports and contextualizes the visual.",
    typicalLevels: [2, 3],
    instructionTemplate:
      "Visual-centric section. Write supporting text that contextualizes the visual element. Include alt-text description, caption guidance, and surrounding paragraph that references the visual by name.",
    wordCountRange: [60, 120],
    structuralRules: [
      "Reference the visual element by descriptive name",
      "Provide alt-text description",
      "Surrounding text contextualizes what the visual shows",
      "Include a source attribution for the visual data",
      "Do not repeat in text what the visual already shows",
    ],
    iconKey: "image",
    toneKey: "mint",
  },
};

/**
 * Returns the structure pattern for a given ID, falling back to 'paragraph'.
 */
export function getStructurePattern(id: string): StructurePattern {
  return STRUCTURE_PATTERNS[id as StructurePatternId] ?? STRUCTURE_PATTERNS.paragraph;
}

/**
 * Returns all structure patterns as an array for selection UIs.
 */
export function listStructurePatterns(): StructurePattern[] {
  return Object.values(STRUCTURE_PATTERNS);
}

/**
 * Suggests structure patterns appropriate for a given heading level.
 */
export function suggestPatternsForLevel(level: number): StructurePattern[] {
  return Object.values(STRUCTURE_PATTERNS).filter((p) =>
    p.typicalLevels.includes(level)
  );
}

/**
 * Generates the structure instruction string for a heading
 * by combining the pattern template with any custom overrides.
 */
export function buildStructureInstruction(
  patternId: StructurePatternId,
  overrides?: string
): string {
  const pattern = getStructurePattern(patternId);
  const parts = [pattern.instructionTemplate];
  if (overrides) {
    parts.push(overrides);
  }
  return parts.join(" ");
}

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
  | "visual"
  | "entity-template";

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

export const STRUCTURE_PATTERNS: Record<StructurePatternId, StructurePattern> & Record<string, StructurePattern> = {
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

  "entity-template": {
    id: "entity-template",
    label: "Entity Template",
    description:
      "Named entity section (festival, place, service, product) under a list-definition H2. Uses numbered sub-section template written in paragraph format.",
    typicalLevels: [3],
    instructionTemplate: "",
    wordCountRange: [180, 250],
    structuralRules: [
      "Write all sub-sections in paragraph format, not as sub-headings",
      "Cover all template points sequentially",
      "Each sub-section is 2-3 sentences",
      "Conclude with why the reader should care about this entity",
      "Include at least one specific data point (date, price, location, statistic)",
    ],
    iconKey: "shield-check",
    toneKey: "violet",
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

// ============================================================================
// PROGRAMMATIC INSTRUCTION BUILDER
// Replaces LLM-generated structureInstructions with deterministic templates
// filled with heading-specific data (children, entities, topic, competitors).
// ============================================================================

// --- Heading Tree ---

export interface HeadingNode {
  index: number;
  level: 1 | 2 | 3 | 4;
  text: string;
  children: HeadingNode[];
  parent: HeadingNode | null;
  patternId?: StructurePatternId;
  structureInstructions?: string;
  wordCountTarget?: number;
  contentDesignPattern?: string;
  snippetTarget?: boolean;
  paaTarget?: boolean;
}

export function buildHeadingTree(
  rawHeadings: Array<{ level: number; text: string }>
): HeadingNode[] {
  const roots: HeadingNode[] = [];
  const stack: HeadingNode[] = [];

  for (let i = 0; i < rawHeadings.length; i++) {
    const h = rawHeadings[i];
    const node: HeadingNode = {
      index: i,
      level: Math.min(Math.max(h.level, 1), 4) as 1 | 2 | 3 | 4,
      text: h.text,
      children: [],
      parent: null,
    };

    // Walk up stack until we find a parent with lower level
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    if (stack.length > 0) {
      node.parent = stack[stack.length - 1];
      stack[stack.length - 1].children.push(node);
    } else {
      roots.push(node);
    }

    stack.push(node);
  }

  return roots;
}

// --- Regex Heading Classifiers ---

function isYesNoQuestion(text: string): boolean {
  return /^(is|are|can|does|do|has|have|was|were|will|should)\s/i.test(text)
    && text.trim().endsWith("?");
}

function isListQuestion(text: string): boolean {
  return /^what\s+are\s+the\s+(most|best|top|main|popular|common|different|various|key|major|biggest|largest|important)\b/i.test(text)
    || /^(what\s+are\s+the\s+types?\s+of|list\s+of|types?\s+of|kinds?\s+of)\b/i.test(text)
    || /^(how\s+many|what\s+are\s+some)\b/i.test(text);
}

function isDefinitionQuestion(text: string): boolean {
  return /^what\s+is\s+(a|an|the)?\s*/i.test(text) && !isListQuestion(text);
}

function isCostQuestion(text: string): boolean {
  return /\b(cost|price|pricing|how\s+much|rates?|fees?|charges?|budget|afford)\b/i.test(text);
}

function isProcessQuestion(text: string): boolean {
  return /^(how\s+to|how\s+do|how\s+does|how\s+can|what\s+are\s+the\s+steps)/i.test(text)
    || /\b(process|procedure|steps?\s+involved|guide\s+to|method)\b/i.test(text);
}

function isSuggestiveQuestion(text: string): boolean {
  return /^(why\s+should|when\s+should|who\s+is\s+the\s+best|which\s+is\s+better)\b/i.test(text)
    || /\b(recommend|best\s+choice|best\s+option|worth\s+it|should\s+you\s+choose)\b/i.test(text);
}

function isComparisonQuestion(text: string): boolean {
  return /\b(vs\.?|versus|compared?\s+to|difference\s+between|same\s+as)\b/i.test(text);
}

function isChecklistQuestion(text: string): boolean {
  return /^what\s+(should|do)\s+(you|i|we)\s+(know|check|confirm|need|consider|look\s+for|prepare)\b/i.test(text)
    || /^(things?\s+to\s+(know|check|consider)|tips?\s+for)\b/i.test(text);
}

function isNamedEntity(text: string, entities: string[]): boolean {
  const normalized = text.toLowerCase().replace(/^\d+\.\s*/, "").trim();
  // Check against known cross-competitor entities
  const matchesEntity = entities.some((e) => {
    const en = e.toLowerCase().trim();
    if (en.length < 3) return false;
    return normalized === en
      || normalized.includes(en)
      || en.includes(normalized);
  });
  if (matchesEntity) return true;
  // Non-question text that looks like a proper noun / name
  const cleaned = text.replace(/^\d+\.\s*/, "").trim();
  return !text.includes("?")
    && /^[A-Z]/.test(cleaned)
    && cleaned.split(/\s+/).length >= 2
    && cleaned.split(/\s+/).length <= 10;
}

// --- Pattern Classification ---

export function classifyHeadingPattern(
  node: HeadingNode,
  crossCompetitorEntities: string[],
  paaQuestions: string[]
): StructurePatternId {
  const text = node.text;
  const level = node.level;
  const parentPattern = node.parent?.patternId;

  // H1 always purpose-summary
  if (level === 1) return "purpose-summary";

  // H3+ child of list-definition parent → entity-template if it's a named entity
  if (parentPattern === "list-definition" && level >= 3) {
    if (!text.includes("?") && isNamedEntity(text, crossCompetitorEntities)) {
      return "entity-template";
    }
  }

  // Comparison / difference between
  if (isComparisonQuestion(text)) return "comparison";

  // Yes/No questions
  if (isYesNoQuestion(text)) return "direct-answer";

  // List questions ("What are the best/most/top X?")
  if (isListQuestion(text)) return "list-definition";

  // Definition questions ("What is X?")
  if (isDefinitionQuestion(text)) return "explicit-definition";

  // Cost/price questions
  if (isCostQuestion(text)) return level <= 2 ? "table-format" : "exact-answer";

  // Process/how-to questions
  if (isProcessQuestion(text)) return "reasoning-based";

  // Suggestion/recommendation questions
  if (isSuggestiveQuestion(text)) return "suggestive-answer";

  // Checklist questions ("What should you know/check/confirm")
  if (isChecklistQuestion(text)) return "list-definition";

  // H4+ default to direct-answer (concise)
  if (level >= 4) return "direct-answer";

  // H3 under non-list parent: paragraph or exact-answer for factual
  if (level === 3) {
    if (text.includes("?") && /^(what|when|where|who|which|how\s+(many|much|long|often|far))\b/i.test(text)) {
      return "exact-answer";
    }
    // Named entities without a list-definition parent still get entity-template
    if (!text.includes("?") && isNamedEntity(text, crossCompetitorEntities)) {
      return "entity-template";
    }
    return "paragraph";
  }

  return "paragraph";
}

// --- Niche-Specific Entity Templates ---

const ENTITY_TEMPLATES: Record<string, string[]> = {
  festival: [
    "1. Introduction",
    "2. Key Features",
    "3. Audience",
    "4. Dates, Location & Ticket Information",
    "5. History",
    "6. Things to Do",
    "7. Why You Should Attend",
    "8. Tips for Attendees",
    "9. Accessibility",
    "10. Reviews or Testimonials",
    "11. Conclusion",
  ],
  neighborhood: [
    "1. Introduction (location, atmosphere, what makes it notable)",
    "2. Who Lives Here and Why (families, professionals, students)",
    "3. Housing and Rent (property types, average rent, market trends)",
    "4. Amenities and Lifestyle (shopping, green spaces, cafes, transport)",
    "5. Challenges or Considerations (noise, traffic, parking, high rents)",
    "6. Summary: Who Should Live Here",
  ],
  park: [
    "1. Introduction (atmosphere, appeal)",
    "2. Best For (families, students, visitors)",
    "3. Activities (walking, cycling, sightseeing, events)",
    "4. Facilities (toilets, cafes, play areas, seating, dog-friendly)",
    "5. Access (public transport, parking, wheelchair/stroller accessible)",
    "6. Unique Feature (scenic view, historical structure, wildlife)",
    "7. Best Time to Visit",
  ],
  service: [
    "1. Introduction",
    "2. What It Includes",
    "3. Who It's For",
    "4. Pricing",
    "5. Process",
    "6. Benefits",
    "7. Considerations",
    "8. How to Book",
  ],
  place: [
    "1. Introduction",
    "2. Location",
    "3. Key Attractions",
    "4. Best Time to Visit",
    "5. Getting There",
    "6. Tips",
    "7. Reviews",
  ],
  product: [
    "1. Introduction",
    "2. Key Features",
    "3. Who It's For",
    "4. Pricing and Availability",
    "5. Pros and Cons",
    "6. How to Use",
    "7. Alternatives",
    "8. Conclusion",
  ],
  default: [
    "1. Introduction",
    "2. Key Features",
    "3. Audience",
    "4. Details and Specifications",
    "5. Benefits",
    "6. Tips",
    "7. Conclusion",
  ],
};

function inferEntityType(niche: string, topic: string, headingText: string): string {
  const combined = `${niche} ${topic} ${headingText}`.toLowerCase();
  if (/festival|event|carnival|concert|show|fete|fair\b/i.test(combined)) return "festival";
  if (/neighbo[u]?rhood|area|district|suburb|quarter|ward/i.test(combined)) return "neighborhood";
  if (/park|garden|green\s+space|nature\s+reserve/i.test(combined)) return "park";
  if (/service|company|provider|hire|rental|agency|firm/i.test(combined)) return "service";
  if (/restaurant|cafe|pub|bar|nightclub|cinema|museum|gallery|attraction/i.test(combined)) return "place";
  if (/product|equipment|tool|software|app|device/i.test(combined)) return "product";
  return "default";
}

function inferEntityTypeLabel(children: HeadingNode[], niche: string): string {
  const sample = children.slice(0, 5).map((c) => c.text).join(" ").toLowerCase();
  if (/fest|carnival|event/i.test(sample)) return "festivals";
  if (/park|garden/i.test(sample)) return "parks";
  if (/area|neighbo/i.test(sample)) return "areas";
  if (/street|road/i.test(sample)) return "streets";
  if (/service|company/i.test(sample)) return "services";
  // Fallback: use niche
  if (niche) return niche;
  return "items";
}

// --- Instruction Builders (one per pattern) ---

export interface InstructionContext {
  topic: string;
  pageType: string;
  niche: string;
  location?: string;
  clientName?: string;
  contextualVectors: string[];
  crossCompetitorEntities: string[];
  competitorStrengths: string[];
  paaQuestions: string[];
  relatedKeywords: string[];
  gapKeywords: string[];
}

function extractTopicFromQuestion(text: string): string {
  return text
    .replace(/^(what|how|why|when|where|who|which|is|are|can|does|do|has|have|will|should)\s+/i, "")
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/\?$/, "")
    .trim();
}

function findRelatedPaa(subject: string, paaQuestions: string[]): string[] {
  const words = subject.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  if (words.length === 0) return [];
  return paaQuestions.filter((q) => {
    const qLower = q.toLowerCase();
    const matchCount = words.filter((w) => qLower.includes(w)).length;
    return matchCount >= Math.ceil(words.length * 0.3);
  }).slice(0, 2);
}

function findRelevantCompetitorItems(headingText: string, items: string[]): string[] {
  const words = headingText.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  if (words.length === 0) return items.slice(0, 3);
  return items.filter((item) => {
    const iLower = item.toLowerCase();
    return words.some((w) => iLower.includes(w));
  }).slice(0, 5);
}

function buildPurposeSummaryInstruction(node: HeadingNode, ctx: InstructionContext): string {
  const lines: string[] = [];
  lines.push("Purpose: Summarize the entire document (contextual vectors) in a representative manner using the same order.");
  lines.push(`Instructions: implicit definition of ${ctx.topic} in a (representative way).`);

  // Find all H2 children
  const h2Children = node.children.filter((c) => c.level === 2);

  // Find list-definition H2 and its entity children
  const listH2 = h2Children.find((c) => c.patternId === "list-definition" && c.children.length > 0);
  if (listH2) {
    lines.push(`+ ${listH2.text}`);
    const entityH3s = listH2.children.filter((c) => c.patternId === "entity-template");
    const first5 = entityH3s.slice(0, 5);
    first5.forEach((e, i) => {
      lines.push(`${i + 1}. ${e.text} (30 to 50 words)`);
    });
    if (first5.length > 0) {
      lines.push(`Just process these ${first5.length} without depth detailed explanation,`);
    }
  }

  // List remaining H2s as "+" items
  for (const h2 of h2Children) {
    if (h2 === listH2) continue;
    lines.push(`+ ${h2.text}`);
  }

  lines.push("");
  lines.push(
    "All information for H1 should be processed in a representative way using paragraph format but if somewhere you feel like a short list is needed, then go ahead but use paragraph format; this is just a summary of the entire document, so do not dive deep into any of the above-mentioned headings; we just need an overview for every section."
  );
  lines.push(
    "Keep in mind every paragraph, sentence, phrase, or word should be connected to its next part in a logical way while containing natural flow between wording. Less words more quality is our main aim. Use Micro semantic and implement Term frequency and inverse document frequency to optimize H1 as much as we can."
  );

  if (ctx.clientName) {
    lines.push(`Reference "${ctx.clientName}" naturally in the summary.`);
  }

  return lines.join("\n");
}

function buildListDefinitionInstruction(node: HeadingNode, ctx: InstructionContext): string {
  const entityChildren = node.children.filter((c) => c.level === node.level + 1);
  const entityType = inferEntityTypeLabel(entityChildren, ctx.niche);
  const count = entityChildren.length;

  const lines: string[] = [];
  lines.push("List + List Definition");
  lines.push(
    `List Intro: start answer with repeating at least five words from question............. these ${count} are most popular ${entityType} in ${ctx.location || ctx.topic}...............`
  );
  lines.push(
    `list + List Description=> Each description write around 30 to 40 words for detail explanation we will process each ${entityType} separately after this section..`
  );
  lines.push("");

  for (const child of entityChildren) {
    lines.push(`+ ${child.text}`);
  }

  lines.push("");
  lines.push(`Short outro and introduce detailed description for each ${entityType} below....`);
  lines.push("DO NOT EXPLAIN THAT MUCH JUST FOR COVERAGE PURPOSE");

  return lines.join("\n");
}

function buildEntityTemplateInstruction(node: HeadingNode, ctx: InstructionContext): string {
  const entityType = inferEntityType(ctx.niche, ctx.topic, node.text);
  const template = ENTITY_TEMPLATES[entityType] || ENTITY_TEMPLATES.default;

  const lines: string[] = [];
  lines.push(node.text);
  for (const item of template) {
    lines.push(item);
  }
  lines.push("");
  lines.push("Following Template Write in a Paragraph Format");

  return lines.join("\n");
}

function buildExplicitDefinitionInstruction(node: HeadingNode, ctx: InstructionContext): string {
  const subject = extractTopicFromQuestion(node.text);

  const lines: string[] = [];
  lines.push(
    `Explicit Definition of ${node.text.replace(/\?$/, "")}: use signifier, qualifier, and enriching context terms.`
  );
  lines.push("The answer should be context-rich, accurate and clear.");

  // Find related PAA sub-question
  const relatedPaa = findRelatedPaa(subject, ctx.paaQuestions);
  if (relatedPaa.length > 0) {
    lines.push("");
    lines.push(relatedPaa[0]);
    if (isYesNoQuestion(relatedPaa[0])) {
      lines.push("");
      lines.push("Direct Answer: Yes or No");
    }
  }

  return lines.join("\n");
}

function buildDirectAnswerInstruction(node: HeadingNode, ctx: InstructionContext): string {
  const topicPhrase = extractTopicFromQuestion(node.text);
  const lines: string[] = [];

  if (isYesNoQuestion(node.text)) {
    // If heading mentions client, answer is likely "Yes"
    const answer =
      ctx.clientName && node.text.toLowerCase().includes(ctx.clientName.toLowerCase())
        ? "Yes"
        : "Yes/No";
    lines.push(
      `Direct Answer: ${answer}, ${topicPhrase}... then reason or justification why.`
    );
    lines.push("Answer should be accurate, clear and context-rich. Under 40 words or 220 characters.");
  } else {
    lines.push(`Direct Answer: ${topicPhrase}...`);
    lines.push("Answer should be accurate, clear and context-rich. Under 40 words or 220 characters.");
  }

  const relevant = findRelevantCompetitorItems(node.text, ctx.competitorStrengths);
  if (relevant.length > 0) {
    lines.push("");
    lines.push("Include: " + relevant.slice(0, 3).join("; "));
  }

  return lines.join("\n");
}

function buildExactAnswerInstruction(node: HeadingNode, ctx: InstructionContext): string {
  const lines: string[] = [];
  lines.push("Exact Answer: State the precise value, number, or boolean.");
  lines.push("Then source attribution and data breakdown.");
  lines.push("Under 40 words or 220 characters.");

  const relevant = findRelevantCompetitorItems(node.text, ctx.competitorStrengths);
  if (relevant.length > 0) {
    lines.push("");
    lines.push("Include: " + relevant.slice(0, 3).join("; "));
  }

  return lines.join("\n");
}

function buildReasoningBasedInstruction(node: HeadingNode, ctx: InstructionContext): string {
  const subject = extractTopicFromQuestion(node.text);
  const lines: string[] = [];

  lines.push(`Start answering: ${subject}...`);

  // Use child headings as step items, or competitor items
  if (node.children.length > 0) {
    for (const child of node.children) {
      lines.push(child.text);
    }
  } else {
    const items = findRelevantCompetitorItems(node.text, ctx.competitorStrengths);
    for (const item of items.slice(0, 7)) {
      lines.push(item);
    }
  }

  lines.push("");
  lines.push("Please write correct accurate and context rich answer in paragraph format.");
  lines.push("Remember more text doesn't mean more context");

  return lines.join("\n");
}

function buildTableFormatInstruction(node: HeadingNode, ctx: InstructionContext): string {
  const subject = extractTopicFromQuestion(node.text);
  const lines: string[] = [];

  lines.push(`Start answering: The ${subject}... mention approximate and minimum.`);
  lines.push("");
  lines.push("The data can vary significantly based on several factors:");

  const items = findRelevantCompetitorItems(node.text, ctx.competitorStrengths);
  if (items.length > 0) {
    for (const item of items.slice(0, 8)) {
      lines.push(item);
    }
  }

  lines.push("");
  lines.push("Include these additional information as well in the form of table.");
  lines.push("Table outro: final words with context-rich terms.");

  return lines.join("\n");
}

function buildSuggestiveAnswerInstruction(node: HeadingNode, ctx: InstructionContext): string {
  const subject = extractTopicFromQuestion(node.text);
  const lines: string[] = [];

  lines.push(`Start answering: ${subject}... state the recommendation first, then the conditions under which it applies.`);
  lines.push("Use 'X is optimal, if Y' structure — conditions come second.");
  lines.push("Include evidence for the recommendation.");

  const relevant = findRelevantCompetitorItems(node.text, ctx.competitorStrengths);
  if (relevant.length > 0) {
    lines.push("");
    lines.push("Include: " + relevant.slice(0, 3).join("; "));
  }

  if (ctx.clientName) {
    lines.push(`Reference "${ctx.clientName}" naturally if relevant.`);
  }

  return lines.join("\n");
}

function buildComparisonInstruction(node: HeadingNode, ctx: InstructionContext): string {
  const lines: string[] = [];

  lines.push(`Start answering with the difference between the compared items precisely.`);
  lines.push("Highlight: exact difference with context-rich format.");
  lines.push("Include unique and important N-grams for both entities.");
  lines.push("Use two-column or side-by-side structure if applicable. Bullets only, no narrative prose.");

  return lines.join("\n");
}

function buildParagraphInstruction(node: HeadingNode, ctx: InstructionContext): string {
  const lines: string[] = [];

  lines.push("Paragraph format. Short, factual sentences. Entity-driven writing with specific data points.");
  lines.push("First sentence answers the heading directly. Evidence follows.");

  const relevant = findRelevantCompetitorItems(node.text, ctx.competitorStrengths);
  if (relevant.length > 0) {
    lines.push("");
    lines.push("Include: " + relevant.slice(0, 3).join("; "));
  }

  lines.push("Remember more text doesn't mean more context");

  return lines.join("\n");
}

function buildVisualInstruction(node: HeadingNode, _ctx: InstructionContext): string {
  return [
    "Visual-centric section. Write supporting text that contextualizes the visual element.",
    "Include alt-text description, caption guidance, and surrounding paragraph that references the visual by name.",
    "Do not repeat in text what the visual already shows.",
  ].join("\n");
}

// --- Instruction Dispatch ---

function buildInstructionForHeading(node: HeadingNode, ctx: InstructionContext): string {
  switch (node.patternId) {
    case "purpose-summary":
      return buildPurposeSummaryInstruction(node, ctx);
    case "list-definition":
      return buildListDefinitionInstruction(node, ctx);
    case "entity-template":
      return buildEntityTemplateInstruction(node, ctx);
    case "explicit-definition":
      return buildExplicitDefinitionInstruction(node, ctx);
    case "direct-answer":
      return buildDirectAnswerInstruction(node, ctx);
    case "exact-answer":
      return buildExactAnswerInstruction(node, ctx);
    case "reasoning-based":
      return buildReasoningBasedInstruction(node, ctx);
    case "table-format":
      return buildTableFormatInstruction(node, ctx);
    case "suggestive-answer":
      return buildSuggestiveAnswerInstruction(node, ctx);
    case "comparison":
      return buildComparisonInstruction(node, ctx);
    case "visual":
      return buildVisualInstruction(node, ctx);
    case "paragraph":
    default:
      return buildParagraphInstruction(node, ctx);
  }
}

function inferContentDesignPattern(patternId: StructurePatternId): string {
  switch (patternId) {
    case "table-format":
      return "table";
    case "comparison":
      return "comparison";
    case "list-definition":
      return "list";
    case "visual":
      return "visual";
    default:
      return "paragraph";
  }
}

// --- Orchestrator ---

export interface ProgrammaticHeading {
  level: number;
  text: string;
  structurePattern: StructurePatternId;
  structureInstructions: string;
  wordCountTarget: number;
  contentDesignPattern: string;
  snippetTarget: boolean;
  paaTarget: boolean;
}

/**
 * Deterministic pattern assignment + instruction generation.
 * Call this BEFORE the LLM — it replaces all template/instruction work.
 * The LLM only needs to handle query mapping, intent, and contextualRationale.
 */
export function assignPatternsAndInstructions(
  rawHeadings: Array<{ level: number; text: string }>,
  ctx: InstructionContext
): ProgrammaticHeading[] {
  // 1. Build tree
  const roots = buildHeadingTree(rawHeadings);

  // 2. Classify patterns top-down (parents first so children can check parentPattern)
  function classifyTree(nodes: HeadingNode[]) {
    for (const node of nodes) {
      node.patternId = classifyHeadingPattern(
        node,
        ctx.crossCompetitorEntities,
        ctx.paaQuestions
      );
      classifyTree(node.children);
    }
  }
  classifyTree(roots);

  // 3. Build instructions + assign metadata
  function annotateTree(nodes: HeadingNode[]) {
    for (const node of nodes) {
      node.structureInstructions = buildInstructionForHeading(node, ctx);

      const pattern = STRUCTURE_PATTERNS[node.patternId!];
      node.wordCountTarget = pattern
        ? Math.round((pattern.wordCountRange[0] + pattern.wordCountRange[1]) / 2)
        : 150;

      node.contentDesignPattern = inferContentDesignPattern(node.patternId!);

      node.snippetTarget = [
        "direct-answer",
        "exact-answer",
        "list-definition",
        "purpose-summary",
      ].includes(node.patternId!);

      const topicWords = extractTopicFromQuestion(node.text).toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      node.paaTarget = ctx.paaQuestions.some((q) => {
        const qLower = q.toLowerCase();
        return topicWords.some((w) => qLower.includes(w));
      });

      annotateTree(node.children);
    }
  }
  annotateTree(roots);

  // 4. Flatten back to ordered array
  const result: ProgrammaticHeading[] = [];
  function flatten(nodes: HeadingNode[]) {
    for (const node of nodes) {
      result.push({
        level: node.level,
        text: node.text,
        structurePattern: node.patternId!,
        structureInstructions: node.structureInstructions!,
        wordCountTarget: node.wordCountTarget!,
        contentDesignPattern: node.contentDesignPattern!,
        snippetTarget: node.snippetTarget!,
        paaTarget: node.paaTarget!,
      });
      flatten(node.children);
    }
  }
  flatten(roots);

  return result;
}

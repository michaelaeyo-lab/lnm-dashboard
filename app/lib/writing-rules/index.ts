/**
 * Writing Rules Registry
 *
 * Central registry for all writing rule sets. Composes core semantic rules
 * with niche-specific rules into complete system prompts for content generation.
 */

import { getCoreRules } from "./core";
import { getLegalNicheRules } from "./niches/legal";

export interface NicheInfo {
  name: string;
  label: string;
  description: string;
  pageTypes: string[];
}

// --- Niche Registry ---

const NICHE_REGISTRY: Record<string, { info: NicheInfo; getRules: () => string }> = {
  general: {
    info: {
      name: "general",
      label: "General",
      description: "Universal semantic writing rules without niche-specific constraints. Suitable for any topic.",
      pageTypes: ["service", "location", "blog", "landing"],
    },
    getRules: () => "",
  },
  legal: {
    info: {
      name: "legal",
      label: "Legal Services",
      description: "Personal injury, car accident, motor vehicle accident pages. Includes entity, perspective, co-occurrence, and legal context rules.",
      pageTypes: ["service", "location", "landing"],
    },
    getRules: getLegalNicheRules,
  },
};

/**
 * List all available niches with their metadata.
 */
export function listNiches(): NicheInfo[] {
  return Object.values(NICHE_REGISTRY).map((entry) => entry.info);
}

/**
 * Get niche-specific rules for a given niche name.
 * Returns empty string for "general" niche (core rules only).
 */
export function getNicheRules(niche: string): string {
  const entry = NICHE_REGISTRY[niche];
  if (!entry) {
    return NICHE_REGISTRY.general.getRules();
  }
  return entry.getRules();
}

/**
 * Check if a niche exists in the registry.
 */
export function nicheExists(niche: string): boolean {
  return niche in NICHE_REGISTRY;
}

/**
 * Hard output constraints that override default GPT behavior.
 * These match the manual prompting approach that produces
 * entity-driven, zero-fluff, Koray-methodology content.
 */
const OUTPUT_CONSTRAINTS = `## MANDATORY OUTPUT CONSTRAINTS

You MUST follow these output rules. Violations make the content unusable.

### Format Rules
- Write in PARAGRAPH FORMAT ONLY. No bullet points. No numbered lists. No dashes.
- NEVER use markdown bold (**text**). NEVER use markdown italic (*text*).
- NEVER use markdown headings (#) in your output. Output body text only.
- Use ordered/unordered lists ONLY when the heading explicitly requests a list structure.
- Do not use colons to introduce categories. Integrate information into sentence flow.

### Language Rules
- NEVER use modal verbs: will, should, need to, have to, must, can, could, would, may, might.
- NEVER use everyday language or conversational tone.
- NEVER use analogies or metaphors.
- NEVER give opinions. Every statement is a factual declaration.
- NEVER use filler phrases: "it is important to note", "it is worth mentioning", "in today's world", "when it comes to".
- NEVER start sentences with "There are", "It is", "This is" unless defining something.
- NEVER use promotional language in informational content.

### Structure Rules
- Prefer 40-word sentences for snippet optimization.
- Use short sentences. If a sentence exceeds 30 words, split it.
- Use factual sentence structures: "X does Y" not "X is known for doing Y".
- First sentence under any heading is the direct answer. Evidence follows.
- Place conditions after the main clause: "X happens, if Y occurs" not "If Y occurs, X happens".
- Use consistent terminology. Do not alternate between synonyms for the same concept.
- Every word must carry contextual relevance. Delete words that add nothing to meaning.
- Use entity-driven writing: include entities, attributes, and their values.
- Include specific numbers, percentages, data points. Experts are specific.

### Two-Pass Rule
Before writing, internally process ALL 56 semantic writing rules. Then write content that implements every applicable rule. This is not optional.`;

/**
 * Build the complete writing system prompt by composing:
 * 1. Role + hard output constraints
 * 2. Page context
 * 3. Core semantic rules (56 rules, universal)
 * 4. Niche-specific rules (if any)
 * 5. Previously written sections (for continuity)
 */
export function buildWritingSystemPrompt(params: {
  niche: string;
  pageType: string;
  topic: string;
  location?: string;
  clientName?: string;
  targetAudience?: string;
  additionalInstructions?: string;
  previousSections?: { heading: string; content: string }[];
}): string {
  const coreRules = getCoreRules();
  const nicheRules = getNicheRules(params.niche);

  const parts: string[] = [
    `You are a semantic content writer trained on Koray Tugberk Gubur's methodology. You produce entity-driven, zero-fluff, factual content by strictly implementing ALL writing rules below. Every sentence must maximize information density per word. No exceptions.`,
    ``,
    OUTPUT_CONSTRAINTS,
    ``,
    `## Page Context`,
    `- Page type: ${params.pageType}`,
    `- Niche: ${params.niche}`,
    `- Topic: ${params.topic}`,
  ];

  if (params.location) {
    parts.push(`- Location: ${params.location}`);
  }
  if (params.clientName) {
    parts.push(`- Client/Brand: ${params.clientName}`);
  }
  if (params.targetAudience) {
    parts.push(`- Target audience: ${params.targetAudience}`);
  }

  parts.push("", coreRules);

  if (nicheRules) {
    parts.push("", nicheRules);
  }

  if (params.additionalInstructions) {
    parts.push("", `## Additional Instructions`, params.additionalInstructions);
  }

  if (params.previousSections && params.previousSections.length > 0) {
    parts.push("", `## Previously Written Sections (for context continuity)`);
    for (const section of params.previousSections) {
      parts.push("", `### ${section.heading}`, section.content);
    }
    parts.push("", `Maintain contextual continuity with the above sections. Do not repeat information already covered.`);
  }

  return parts.join("\n");
}

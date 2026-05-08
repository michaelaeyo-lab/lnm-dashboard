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
 * Build the complete writing system prompt by composing:
 * 1. Core semantic rules (universal)
 * 2. Niche-specific rules (if any)
 * 3. Generation context (page info, previous sections)
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
    `You are a semantic content writer. You produce high-quality, SEO-optimized content by strictly following the writing rules provided below.`,
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

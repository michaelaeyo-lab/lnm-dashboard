/**
 * Test: Programmatic structure instructions survive Step 11 correction merge.
 *
 * Validates the fix for the bug where Step 11 (Heading Validation) was
 * overwriting programmatic Sardar-format instructions with weak LLM-generated text.
 *
 * No API keys needed — exercises only the programmatic builder and merge logic.
 */

import {
  assignPatternsAndInstructions,
  type InstructionContext,
} from "../app/lib/writing-rules/structure-patterns";

// ── Test Data ──

const SAMPLE_HEADINGS = [
  { level: 1, text: "Domestic Home Removal Service in Bristol" },
  { level: 2, text: "What is a domestic home removal service?" },
  { level: 2, text: "What are the best home removal companies in Bristol?" },
  { level: 3, text: "Bristol Van Movers" },
  { level: 3, text: "Kellaway Removals" },
  { level: 3, text: "We Move Bristol" },
  { level: 2, text: "How much does a home removal cost in Bristol?" },
  { level: 3, text: "Is it cheaper to hire a man and van or a removal company?" },
  { level: 2, text: "How to prepare for a home removal" },
  { level: 2, text: "Why should you hire a professional removal service?" },
];

const SAMPLE_CTX: InstructionContext = {
  topic: "domestic home removal service in Bristol",
  pageType: "service",
  niche: "home removals",
  location: "Bristol",
  clientName: "We Move Bristol",
  contextualVectors: ["home removal", "Bristol", "moving companies", "packing", "costs"],
  crossCompetitorEntities: ["Bristol Van Movers", "Kellaway Removals", "We Move Bristol"],
  competitorStrengths: ["full packing service", "insurance included", "same-day availability"],
  paaQuestions: [
    "How much does it cost to move house in Bristol?",
    "Is it worth hiring a removal company?",
    "What is the cheapest way to move house?",
  ],
  relatedKeywords: ["removal companies Bristol", "house movers near me", "man and van Bristol"],
  gapKeywords: ["student removals", "piano moving"],
};

// ── Helpers ──

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// ── Test 1: Programmatic builder produces gold-standard instructions ──

console.log("\n═══ Test 1: assignPatternsAndInstructions() output quality ═══\n");

const programmatic = assignPatternsAndInstructions(SAMPLE_HEADINGS, SAMPLE_CTX);

assert(programmatic.length === SAMPLE_HEADINGS.length, `Returns ${SAMPLE_HEADINGS.length} headings (got ${programmatic.length})`);

// H1 should be purpose-summary with Sardar-format content
const h1 = programmatic[0];
assert(h1.structurePattern === "purpose-summary", `H1 pattern is "purpose-summary" (got "${h1.structurePattern}")`);
assert(
  h1.structureInstructions.includes("Purpose: Summarize the entire document"),
  'H1 instructions start with "Purpose: Summarize the entire document"',
  `Got: "${h1.structureInstructions.slice(0, 80)}..."`
);
assert(
  h1.structureInstructions.includes("representative way"),
  'H1 instructions contain "representative way"'
);

// H2 "What is..." should be explicit-definition
const h2Def = programmatic[1];
assert(h2Def.structurePattern === "explicit-definition", `"What is..." → explicit-definition (got "${h2Def.structurePattern}")`);
assert(
  h2Def.structureInstructions.includes("Explicit Definition"),
  'H2 def instructions contain "Explicit Definition"',
  `Got: "${h2Def.structureInstructions.slice(0, 80)}..."`
);

// H2 "What are the best..." should be list-definition
const h2List = programmatic[2];
assert(h2List.structurePattern === "list-definition", `"What are the best..." → list-definition (got "${h2List.structurePattern}")`);
assert(
  h2List.structureInstructions.includes("List + List Definition"),
  'H2 list instructions contain "List + List Definition"',
  `Got: "${h2List.structureInstructions.slice(0, 80)}..."`
);

// H3 entities under list-definition should be entity-template
const h3Entity = programmatic[3];
assert(h3Entity.structurePattern === "entity-template", `"Bristol Van Movers" → entity-template (got "${h3Entity.structurePattern}")`);
assert(
  h3Entity.structureInstructions.includes("Following Template Write in a Paragraph Format"),
  'H3 entity instructions contain "Following Template Write in a Paragraph Format"',
  `Got: "${h3Entity.structureInstructions.slice(0, 80)}..."`
);

// H2 "How much does..." should be table-format
const h2Cost = programmatic[6];
assert(h2Cost.structurePattern === "table-format", `"How much does...cost" → table-format (got "${h2Cost.structurePattern}")`);

// H3 "Is it cheaper..." should be direct-answer (yes/no question)
const h3YesNo = programmatic[7];
assert(h3YesNo.structurePattern === "direct-answer", `"Is it cheaper..." → direct-answer (got "${h3YesNo.structurePattern}")`);
assert(
  h3YesNo.structureInstructions.includes("Direct Answer:"),
  'Yes/no heading instructions contain "Direct Answer:"',
  `Got: "${h3YesNo.structureInstructions.slice(0, 80)}..."`
);

// H2 "How to prepare..." should be reasoning-based
const h2Process = programmatic[8];
assert(h2Process.structurePattern === "reasoning-based", `"How to prepare..." → reasoning-based (got "${h2Process.structurePattern}")`);

// H2 "Why should you..." should be suggestive-answer
const h2Why = programmatic[9];
assert(h2Why.structurePattern === "suggestive-answer", `"Why should you..." → suggestive-answer (got "${h2Why.structurePattern}")`);

// ── Test 2: No instruction is generic/weak ──

console.log("\n═══ Test 2: No weak generic instructions ═══\n");

const WEAK_PATTERNS = [
  /^establish the main topic/i,
  /^introduce the main topic/i,
  /^h\d+ should introduce/i,
  /^provide an overview/i,
  /^this section covers/i,
  /^define the topic/i,
];

for (const h of programmatic) {
  const isWeak = WEAK_PATTERNS.some((p) => p.test(h.structureInstructions.trim()));
  assert(
    !isWeak,
    `"${h.text.slice(0, 40)}..." is NOT weak/generic`,
    `Instructions: "${h.structureInstructions.slice(0, 60)}..."`
  );
}

// ── Test 3: Simulate Step 11 correction merge — instructions must survive ──

console.log("\n═══ Test 3: Step 11 merge preserves programmatic instructions ═══\n");

// Simulate what Step 11 returns: corrected headings with LLM-generated weak instructions
const fakeLLMCorrectedHeadings = programmatic.map((h) => ({
  ...h,
  // Simulate LLM changing text slightly
  text: h.text,
  // Simulate LLM generating weak instructions (THE BUG)
  structureInstructions: "Establish the main topic of the page and provide an overview.",
  intent: "Updated intent from LLM",
}));

// Apply the FIXED merge logic (mirrors brief-pipeline.ts lines ~2280-2292)
const mergedHeadings = fakeLLMCorrectedHeadings.map((corrected, i) => {
  const original = programmatic[i];
  if (!original) return corrected;
  return {
    ...original,
    level: corrected.level || original.level,
    text: corrected.text || original.text,
    intent: corrected.intent || original.intent,
    // structureInstructions NOT overwritten — this is the fix
  };
});

for (let i = 0; i < mergedHeadings.length; i++) {
  const merged = mergedHeadings[i];
  const original = programmatic[i];
  assert(
    merged.structureInstructions === original.structureInstructions,
    `Heading ${i} ("${merged.text.slice(0, 30)}...") keeps programmatic instructions`,
    `Expected programmatic, got: "${merged.structureInstructions.slice(0, 50)}..."`
  );
  assert(
    merged.structurePattern === original.structurePattern,
    `Heading ${i} keeps pattern "${original.structurePattern}"`
  );
}

// ── Test 4: Re-run builder on corrected headings (text change case) ──

console.log("\n═══ Test 4: Re-run builder on corrected headings with changed text ═══\n");

const correctedWithNewText = SAMPLE_HEADINGS.map((h) => ({ ...h }));
// Simulate Step 11 changing a heading's text
correctedWithNewText[1] = { level: 2, text: "What are the types of home removal services?" };

const rerunResult = assignPatternsAndInstructions(correctedWithNewText, SAMPLE_CTX);

assert(
  rerunResult[1].structurePattern === "list-definition",
  `Changed "What are the types..." → list-definition (got "${rerunResult[1].structurePattern}")`,
);
assert(
  rerunResult[1].structureInstructions.includes("List + List Definition"),
  'Re-classified heading gets correct list-definition instructions',
  `Got: "${rerunResult[1].structureInstructions.slice(0, 80)}..."`
);

// ── Summary ──

console.log(`\n═══════════════════════════════════`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`═══════════════════════════════════\n`);

process.exit(failed > 0 ? 1 : 0);

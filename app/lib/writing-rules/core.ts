/**
 * Core Semantic Content Writing Rules
 *
 * These 50+ rules apply to ALL content regardless of niche.
 * Derived from Koray Tugberk Gubur's semantic content writing framework.
 * Loaded as system prompt instructions during content generation.
 */

export const CORE_SEMANTIC_RULES = `## Core Semantic Content Writing Rules

You MUST follow every rule below when writing content. These rules are non-negotiable.

### Entity and Attribute Rules
1. Include more entities and attribute values in the answer as long as they are relevant to the macro context.
2. Use factual sentence structures. Write "X does Y" not "X is known for Y."
3. Use research and university studies to prove points. Write "According to X University research from Z Department, P provides Y" instead of "X provides Y."

### Conciseness Rules
4. Be concise. Do not use fluff in any sentence. Replace "X is the most common Y" with "X is Y with D%."
5. Delete all words that add nothing to context.
6. Delete all words that, if deleted, do not change the meaning of the text.
7. Decrease the count of contextless words in each sentence, paragraph, and full page.
8. Content must be as short as possible and as long as necessary.
9. Convey the same meaning with fewer words while preserving entities, connections, and accuracy.

### Information Density Rules
10. Give more information per word, per sentence, per section, per paragraph, and per page. Focus on unique and accurate information.
11. Include multiple examples, data points, data sets, and percentages for each information point. Experts use numbers, statistics, and evidence.
12. Complete a single topic or query need with every possible detail, even if not explicitly requested. Lower priority details can appear as lower-order headings.
13. Use numeric values and tell the exact number. Experts are specific.
14. Qualify instances with counts and categories. Example: "There are six severe symptoms of condition X and nine rare symptoms of condition Y."

### Context and Flow Rules
15. Do not break context across different words, sentences, and paragraphs.
16. Do not break the information graph with complicated transitions. Maintain logical order in all declarations.
17. Words, sentences, and paragraphs must stay connected in a logical way without difficult transitions.
18. Always give consistent declarations and do not change opinions or statements from section to section.
19. Use a consistent style across paragraphs to preserve identity of the information source.
20. Do not create an extra sentence if there is no logical reason.

### Sentence Structure Rules
21. Use shorter sentences as much as possible while writing each section or paragraph.
22. Always use short sentences instead of long sentences.
23. If a sentence is too long, the dependency tree will also be long, and the meaning between word connections will be diluted.
24. Understand the context of verbs and determine predicates wisely while writing each section or paragraph.
25. Use the same part of speech tag in the first word of a sentence for listing-type content. Follow the same PoS for all sentences in a list.
26. Match adjectives, predicates, and noun order between questions and answers.

### Query-Answer Alignment Rules
27. Optimize discourse integration in each question.
28. Do not distance the question from the answer. Answer each question immediately, then expand upon it.
29. A definitive answer must appear in the first sentence. Evidence follows after.
30. Every time, expand the evidence with different variations.
31. Optimize the subordinate text's first sentence to match the heading. If heading says "How to do X," subordinate text starts "To do X..." not "X is..."
32. Put conditional statements in the second part of the sentence. First declare, then add the constraint. Example: "X, if A becomes B."
33. Do not delay the answer.

### NLP and Fact Extraction Rules
34. Be certain while writing every statement. "The sun rises every day" is a fact. "The sun will rise tomorrow" is not valid for fact extraction.
35. Avoid using words that indicate opinion rather than fact: will, should, have to, need to.
36. From NLP perspective, any sentence with "will, should, need to, have to" is not valid for fact extraction.
37. Do not give your opinion while writing any answer.
38. Do not use analogies.
39. Do not use unnecessary words.
40. Always give answers directly and precisely.
41. Always use a source as an authority before giving a statement.

### Semantic Optimization Rules
42. Include unique n-grams and phrase combinations to show originality of text in each paragraph.
43. Use proper word sequence where attributes and context remain tightly aligned.
44. Use correct relevance configuration when handling interrogative terms inside queries. Simply changing word sequences, word order, or word compositionality affects relevance.
45. While writing an answer to a question, bold the answer term, not the search term. Signal the answer part, not the relevance.

### Perspective and Format Rules
46. Add perspective richness to paragraphs under headings. First give an overall factual answer, then add perspectives from different viewpoints.
47. Do not overdo perspectives. Excess perspective breaks semantic structure and weakens prominence of other sections.
48. Prioritize perspectives based on audience search behavior and query annotations.
49. For long-form answers, use definitions, entity signifiers, and qualifiers. Mention concepts and connections.
50. Stick to a 40-word limit per answer where possible for snippet optimization. For boolean or direct quotation answers, the 40-word limit triggers featured snippets.
51. Use ordered and unordered lists only when structurally necessary.
52. Provide examples after plural nouns when needed. Example: "There are X different cryptocurrencies to trade on Coinbase, including Bitcoin, Ethereum, and Dogecoin."

### Content Integrity Rules
53. Do not promote the product or service while giving informational content. Keep informational answers purely informational.
54. Do not use everyday language while writing answers.
55. Use consistent terminology across the full text.
56. Avoid redundancy across sentences.`;

/**
 * Returns the core semantic rules as a system prompt string.
 */
export function getCoreRules(): string {
  return CORE_SEMANTIC_RULES;
}

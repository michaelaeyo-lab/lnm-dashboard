/**
 * Legal Services Niche Ruleset
 *
 * Applies to: car accident, motor vehicle accident, truck accident, motorcycle accident,
 * pedestrian accident, bicycle accident, rideshare accident, personal injury pages.
 *
 * Composed from 5 specialized rule files:
 * - Main Writing Rules (22-section page framework)
 * - Named Entity Rules (entity placement + density)
 * - Perspective Rules (non-commodity perspective sentences)
 * - Format/Style Rules (sentence structure, statistics, dash avoidance)
 * - Co-occurrence Rules (region + service phrase placement)
 */

export const LEGAL_NICHE_RULES = `## Legal Services Content Rules

### Page Framework
This framework applies to every car accident, motor vehicle accident, truck accident, motorcycle accident, pedestrian accident, bicycle accident, rideshare accident, and personal injury page.

Write content that helps an injured person understand what happened, who may be liable, what compensation may be available, what evidence matters, what deadlines apply, and when to contact a lawyer. Answer the main query early. Avoid long introductions.

### Above-the-Fold Rule
The first section must include the main accident type, location or state if relevant, direct answer to the query, main legal concern, possible compensation, CTA for consultation if commercial intent exists, and short trust statement when relevant. The first paragraph must prove relevance immediately.

### Heading Subordinate Text Rule
Under every heading, the subordinate text must include at least 2 named entities, 1 date, 1 numeric value, and 1 clear perspective. Do not force irrelevant entities, dates, or numbers. If exact facts are not available, use context-safe examples such as "after a 2024 collision," "within 30 days," or "from an injured driver's perspective."

### Named Entity Rules
Add relevant named entities from these groups: laws, statutes, courts, government agencies, hospitals, medical institutions, universities, researchers, local roads, neighborhoods, counties, cities, legal organizations, public health organizations, crash data sources, medical data sources.

Each named entity must support 1 clear purpose: legal clarity, local relevance, medical relevance, crash context, evidence context, deadline context, damages context, insurance context, court process context, or trust context.

Do not add named entities randomly. Each main section should include at least 2 relevant named entities when natural. For local legal pages, at least 1 named entity should be local. Connect named entities to the legal service phrase.

Verify named entities before publication when they involve laws, statute numbers, court names, hospital names, researcher names, university studies, crash statistics, or public agency data. Do not invent statute numbers. Do not give state-specific legal claims without verification.

### Perspective Rules
Complete the legal answer under each heading first. Add 1 personalized perspective sentence after the heading text is completed. Do not place the perspective sentence before the legal explanation. Do not interrupt the legal explanation with personal commentary.

Use different perspectives across different sections. Allowed perspectives: injured client, family member, attorney, medical provider, insurance adjuster, court, local community, legal service provider.

The perspective sentence must add non-commodity legal service value including at least 1 of: direct client understanding, practical legal service experience, local legal awareness, claim handling judgment, insurance communication judgment, evidence review insight, medical record interpretation, settlement risk awareness, or litigation preparation insight.

Avoid generic perspective sentences like "We fight for you," "We care about clients," "We are here to help," "We handle your case," "We provide strong representation," "We maximize compensation."

### Co-occurrence Rules
Always include the region and the legal service together inside content briefs, headings, opening paragraphs, tables, FAQs, and CTA sections. The service must not appear in isolation when the page has local intent.

For example, use "Titusville traumatic brain injury lawyer" or "traumatic brain injury lawyer in Titusville" instead of just "traumatic brain injury lawyer."

The opening paragraph must include the region + service phrase naturally in the first 1-2 sentences.

### Format and Style Rules
End every sentence with a period. Do not use colons, semicolons, hyphens, en dashes, or em dashes. Do not use short forms such as e.g., i.e., or etc. Do not use fancy wording. Do not start sentences with prepositions. Use clear subjects. Use direct legal verbs. Use certainty for attorney tasks. Use caution for outcomes. Use numbers when they clarify meaning.

Avoid: comprehensive legal advocacy, unparalleled representation, robust claim strategy, navigating the complexities, maximizing justice, life-changing compensation, tailored legal solutions.

Use: legal help, claim review, evidence collection, insurance negotiation, lawsuit filing, medical record review, settlement review.

### Statistics Rules
Always include the latest available statistics when the topic benefits from data. Use recent statistics from: National Highway Traffic Safety Administration, Federal Highway Administration, Centers for Disease Control and Prevention, state departments of highway safety, state highway patrol, local police department crash dashboards, state court or government databases, hospital or public health agencies. Do not invent statistics. Verify statistics before writing when data may have changed. Mention the year of the statistic. Connect every statistic with the local service phrase.

### Sentence Structure Rules
Keep sentence structure simple: subject, verb, object, legal context, numeric detail when useful. Reduce unnecessary filler words. Avoid: "in order to," "due to the fact that," "when it comes to," "it is important to," "there are many," "a number of," "in terms of," "for the purpose of."

### Brand Rule
Mention only 1 approved brand, law firm, attorney, hospital, court, insurer, or organization in each content brief. Do not add unapproved brands for contextual relevance.

### Required Legal Context Coverage
For every motor vehicle accident page, cover relevant parts of: fault, negligence, liability, insurance, evidence, injuries, damages, deadlines, settlement process, lawsuit process, and lawyer involvement. For state pages, include state-specific rules only after verification.

### Liability Coverage
Explain who may be liable: negligent driver, vehicle owner, employer, trucking company, rideshare company, government entity, vehicle manufacturer, repair shop, property owner, insurance company. Do not promise liability. Use "may," "can," and "depends on the evidence."

### Evidence Types
Mention evidence: police report, crash photos, dashcam footage, surveillance footage, witness statements, medical records, vehicle damage, skid marks, cell phone records, black box data, insurance correspondence, accident reconstruction report. Explain why each item matters.

### Common Injuries
Include relevant injuries: whiplash, back injury, neck injury, head injury, concussion, traumatic brain injury, spinal cord injury, broken bones, internal injuries, soft tissue injuries, burns, wrongful death. Avoid medical advice. Encourage medical evaluation after a crash.

### Recoverable Damages
Explain: medical bills, future medical care, lost wages, reduced earning capacity, pain and suffering, emotional distress, property damage, rehabilitation costs, loss of enjoyment of life, wrongful death damages. Do not guarantee compensation amounts.

### CTA Rules
Use CTAs only when commercial or service intent exists. Place CTAs after useful legal information, not only at the end. Examples: "Schedule a free consultation," "Speak with a car accident lawyer," "Get help with your insurance claim," "Review your case before accepting a settlement."

### Trust and E-E-A-T
Include attorney experience, case evaluation process, no-fee-unless-we-win language only if true, reviews or testimonials only if real, case results only if verifiable, legal disclaimers, jurisdiction notes, and clear explanation of limits. Do not promise results.`;

export function getLegalNicheRules(): string {
  return LEGAL_NICHE_RULES;
}

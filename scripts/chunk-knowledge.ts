/**
 * Phase 2.5: Knowledge Chunking Pipeline
 *
 * Reads 965 files across 17 category folders in consolidated-knowledge/
 * and produces chunked JSON files in data/chunks/ for Phase 3 vectorization.
 *
 * Usage: npx tsx scripts/chunk-knowledge.ts
 */

import * as fs from "fs";
import * as path from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Chunk {
  id: string;
  category: string;
  title: string;
  content: string;
  sourceFile: string;
  sourceUrl: string;
  sourceType: string;
  contentType: string;
  tokenCount: number;
  chunkIndex: number;
  totalChunks: number;
  headingPath: string[];
}

interface IndexEntry {
  source: string; // "web" | "youtube" | "gpt-prompt" | "strategy-snapshot"
  type: string; // "reference" | "strategic" | "tool" | "blueprint"
}

interface ChunkStats {
  totalChunks: number;
  totalFilesProcessed: number;
  totalFilesExpected: number;
  categories: Record<
    string,
    {
      files: number;
      chunks: number;
      minTokens: number;
      maxTokens: number;
      avgTokens: number;
      medianTokens: number;
    }
  >;
  tokenDistribution: {
    under100: number;
    t100to300: number;
    t300to500: number;
    t500to800: number;
    t800to1000: number;
    over1000: number;
  };
}

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "../..");
const KNOWLEDGE_DIR = path.join(ROOT, "consolidated-knowledge");
const OUTPUT_DIR = path.join(ROOT, "lnm-dashboard/data/chunks");
const INDEX_PATH = path.join(KNOWLEDGE_DIR, "INDEX.md");

const MIN_TOKENS = 50;
const MAX_TOKENS = 1000;
const OVERLAP_TOKENS = 50;

const CATEGORIES = [
  "01-semantic-seo",
  "02-topical-authority",
  "03-content-strategy",
  "04-technical-seo",
  "05-on-page-seo",
  "06-page-speed-and-performance",
  "07-local-seo",
  "08-off-page-and-link-building",
  "09-algorithm-updates-and-ranking",
  "10-user-experience",
  "11-ai-and-automation",
  "12-marketing-and-growth",
  "13-case-studies",
  "14-gpt-prompts-and-tools",
  "15-schema-and-structured-data",
  "16-web-security",
  "17-strategy-blueprints",
  "18-content-writing-rules",
  "19-brief-examples",
  "20-brief-methodology",
];

// ─── Utilities ───────────────────────────────────────────────────────────────

function estimateTokens(text: string): number {
  // ~1.3 tokens per word is a good approximation for English text
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  return Math.round(words.length * 1.3);
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Strip TOC links, image markdown, skip-to-content links, and nav cruft */
function cleanContent(text: string): string {
  let cleaned = text;

  // Remove skip-to-content links
  cleaned = cleaned.replace(
    /\[Skip to content\]\([^)]*\)\s*/gi,
    ""
  );

  // Remove image markdown ![alt](url)
  cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]*\)/g, "");

  // Remove TOC anchor links like [1.Title](url#anchor)
  // But preserve the text — only strip ones that look like TOC entries
  cleaned = cleaned.replace(
    /^\s*\d+\.\s*\[[\d.]*([^\]]*)\]\([^)]*#[^)]*\)\s*$/gm,
    ""
  );

  // Remove "Contents of the Article" lines and [show] links
  cleaned = cleaned.replace(
    /\*\*Contents of the Article\*\*\[show\]\([^)]*\)\s*/gi,
    ""
  );

  // Remove horizontal rules used as separators
  cleaned = cleaned.replace(/^---+\s*$/gm, "");

  // Collapse multiple blank lines into one
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

/** Extract source URL from web article filename */
function filenameToUrl(filename: string): string {
  if (!filename.startsWith("www_")) return "";
  // www_holisticseo_digital_theoretical-seo_semantic-search_.md
  // → https://www.holisticseo.digital/theoretical-seo/semantic-search/
  const withoutExt = filename.replace(/\.md$/, "");
  const parts = withoutExt.split("_");
  // Reconstruct: www.domain.tld/path/segments/
  // First 3 parts are typically www, domain, tld
  // But some have more complex domains
  const urlPath = parts.join("/").replace(/\/$/, "") + "/";
  return "https://" + urlPath.replace(/_$/, "");
}

/** Extract URL from file header metadata lines */
function extractUrlFromHeader(content: string): string {
  // Match **Source:** url or **Source URL:** url
  const match = content.match(
    /\*\*Source(?:\s*URL)?:\*\*\s*(https?:\/\/[^\s\n]+)/i
  );
  return match ? match[1] : "";
}

/** Extract speaker/channel from YouTube header */
function extractYouTubeMetadata(content: string): {
  url: string;
  channel: string;
} {
  const url = extractUrlFromHeader(content) || "";
  const channelMatch = content.match(/\*\*Channel:\*\*\s*(.+)/);
  return {
    url,
    channel: channelMatch ? channelMatch[1].trim() : "",
  };
}

// ─── INDEX.md Parser ─────────────────────────────────────────────────────────

function parseIndex(): Map<string, IndexEntry> {
  const indexContent = fs.readFileSync(INDEX_PATH, "utf8");
  const lookup = new Map<string, IndexEntry>();

  // Match lines like: - `filename.md` -- source: web | type: reference
  const lineRegex =
    /^-\s*`([^`]+)`\s*--\s*source:\s*(\S+)\s*\|\s*type:\s*(\S+)/gm;
  let match: RegExpExecArray | null;
  while ((match = lineRegex.exec(indexContent)) !== null) {
    lookup.set(match[1], {
      source: match[2],
      type: match[3],
    });
  }

  return lookup;
}

// ─── Content Type Detection ──────────────────────────────────────────────────

type ContentKind =
  | "web-article"
  | "youtube-transcript"
  | "gpt-prompt"
  | "blueprint-md"
  | "snapshot-json"
  | "brief-example";

function detectContentKind(
  filename: string,
  category: string,
  indexEntry?: IndexEntry
): ContentKind {
  // Brief examples (category 19)
  if (category === "19-brief-examples") return "brief-example";

  // JSON snapshots
  if (filename.endsWith(".json")) return "snapshot-json";

  // Blueprint markdown
  if (filename.endsWith("_blueprint.md") && category === "17-strategy-blueprints")
    return "blueprint-md";

  // GPT prompts: by index source or by folder
  if (indexEntry?.source === "gpt-prompt") return "gpt-prompt";
  if (
    category === "14-gpt-prompts-and-tools" &&
    !filename.startsWith("www_")
  ) {
    // Non-www files in the prompts folder that aren't YouTube
    const isYoutube = /^[a-zA-Z0-9_-]{8,}_/.test(filename) && !filename.includes(".");
    if (!isYoutube) return "gpt-prompt";
  }

  // Web articles: start with www_
  if (filename.startsWith("www_")) return "web-article";

  // YouTube transcripts: short alphanumeric ID prefix
  if (indexEntry?.source === "youtube") return "youtube-transcript";

  // Fallback heuristics
  if (/^[a-zA-Z0-9_-]{6,}_/.test(filename) && filename.endsWith(".md"))
    return "youtube-transcript";

  // Default to web article
  return "web-article";
}

// ─── Chunking Strategies ─────────────────────────────────────────────────────

/**
 * Split markdown on ## headings. Each heading section becomes a chunk.
 * Tracks heading hierarchy for headingPath.
 */
function splitByHeadings(
  content: string,
  minLevel: number = 2
): { heading: string; text: string; headingPath: string[] }[] {
  const headingRegex = new RegExp(
    `^(#{${minLevel},6})\\s+(.+)$`,
    "gm"
  );
  const sections: { heading: string; text: string; headingPath: string[] }[] =
    [];

  const matches: { level: number; heading: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headingRegex.exec(content)) !== null) {
    matches.push({
      level: m[1].length,
      heading: m[2].trim(),
      index: m.index,
    });
  }

  if (matches.length === 0) {
    // No headings — return entire content as one section
    return [
      {
        heading: "",
        text: content.trim(),
        headingPath: [],
      },
    ];
  }

  // Content before first heading
  const preContent = content.slice(0, matches[0].index).trim();
  if (preContent && estimateTokens(preContent) >= MIN_TOKENS) {
    sections.push({
      heading: "Introduction",
      text: preContent,
      headingPath: ["Introduction"],
    });
  }

  // Build heading path tracker
  const pathStack: { level: number; text: string }[] = [];

  for (let i = 0; i < matches.length; i++) {
    const start =
      matches[i].index + content.slice(matches[i].index).indexOf("\n") + 1;
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const text = content.slice(start, end).trim();

    // Update heading path
    while (
      pathStack.length > 0 &&
      pathStack[pathStack.length - 1].level >= matches[i].level
    ) {
      pathStack.pop();
    }
    pathStack.push({ level: matches[i].level, text: matches[i].heading });
    const headingPath = pathStack.map((h) => h.text);

    if (text) {
      sections.push({
        heading: matches[i].heading,
        text,
        headingPath: [...headingPath],
      });
    }
  }

  return sections;
}

/**
 * Split long text on sentence boundaries, targeting ~500 tokens per chunk
 * with overlap for continuity.
 */
function splitBySentences(
  text: string,
  targetTokens: number = 500,
  overlapTokens: number = OVERLAP_TOKENS
): string[] {
  // Split on sentence boundaries (., !, ?)
  // For transcripts without punctuation, also split on common speech patterns
  const sentences = text.split(/(?<=[.!?])\s+|(?<=\b(?:so|and|but|because|actually|also|then|here|now))\s+(?=[A-Z])/);

  // If we got very few splits relative to text size, this is likely an
  // unpunctuated transcript — fall back to word splitting immediately
  const totalTokens = estimateTokens(text);
  if (sentences.length < totalTokens / targetTokens / 2 && totalTokens > targetTokens) {
    return splitByWords(text, targetTokens, overlapTokens);
  }

  if (sentences.length <= 1 && estimateTokens(text) <= targetTokens) {
    return [text];
  }

  // If no good sentence splits, fall back to splitting on whitespace at word boundaries
  if (sentences.length <= 1) {
    return splitByWords(text, targetTokens, overlapTokens);
  }

  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentTokens = estimateTokens(sentence);

    if (currentTokens + sentTokens > targetTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "));

      // Overlap: keep last few sentences
      const overlapSentences: string[] = [];
      let overlapCount = 0;
      for (let j = currentChunk.length - 1; j >= 0; j--) {
        overlapCount += estimateTokens(currentChunk[j]);
        if (overlapCount > overlapTokens) break;
        overlapSentences.unshift(currentChunk[j]);
      }
      currentChunk = overlapSentences;
      currentTokens = overlapCount;
    }

    currentChunk.push(sentence);
    currentTokens += sentTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}

/** Fallback: split by word count when sentence splitting fails */
function splitByWords(
  text: string,
  targetTokens: number,
  _overlapTokens: number
): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  // Use floor with margin to ensure we stay under the token limit after rounding
  const maxWords = Math.floor((targetTokens - 20) / 1.35);
  const chunks: string[] = [];

  let i = 0;
  while (i < words.length) {
    const end = Math.min(i + maxWords, words.length);
    chunks.push(words.slice(i, end).join(" "));
    i = end;
  }

  // If last chunk is tiny, merge with previous
  if (chunks.length > 1) {
    const lastTokens = estimateTokens(chunks[chunks.length - 1]);
    if (lastTokens < MIN_TOKENS) {
      const prev = chunks[chunks.length - 2];
      const combined = prev + " " + chunks[chunks.length - 1];
      // Only merge if it stays under limit
      if (estimateTokens(combined) <= MAX_TOKENS) {
        chunks[chunks.length - 2] = combined;
        chunks.pop();
      }
    }
  }

  return chunks;
}

/**
 * Sub-split a chunk if it exceeds MAX_TOKENS.
 * Tries paragraph breaks first, then sentence boundaries, then word splitting.
 */
function enforceMaxTokens(text: string, depth: number = 0): string[] {
  const tokens = estimateTokens(text);
  if (tokens <= MAX_TOKENS) return [text];

  // Safety: if recursion is deep, force word split
  if (depth > 2) {
    return splitByWords(text, MAX_TOKENS, OVERLAP_TOKENS);
  }

  // Try paragraph breaks first
  const paragraphs = text.split(/\n\n+/);
  if (paragraphs.length > 1) {
    const results: string[] = [];
    let current = "";

    for (const para of paragraphs) {
      if (
        estimateTokens(current + "\n\n" + para) > MAX_TOKENS &&
        current.trim()
      ) {
        results.push(current.trim());
        current = para;
      } else {
        current = current ? current + "\n\n" + para : para;
      }
    }
    if (current.trim()) results.push(current.trim());

    // Recursively check each result
    return results.flatMap((r) => enforceMaxTokens(r, depth + 1));
  }

  // Fall back to word splitting (guaranteed to produce correctly sized chunks)
  return splitByWords(text, MAX_TOKENS, OVERLAP_TOKENS);
}

/**
 * Merge small consecutive chunks that are under MIN_TOKENS.
 */
function mergeSmallChunks(
  sections: { heading: string; text: string; headingPath: string[] }[]
): { heading: string; text: string; headingPath: string[] }[] {
  if (sections.length <= 1) return sections;

  const merged: typeof sections = [];

  for (let i = 0; i < sections.length; i++) {
    const tokens = estimateTokens(sections[i].text);

    if (tokens < MIN_TOKENS && merged.length > 0) {
      // Merge with previous
      const prev = merged[merged.length - 1];
      prev.text += "\n\n" + sections[i].text;
      prev.heading = prev.heading || sections[i].heading;
    } else if (
      tokens < MIN_TOKENS &&
      i + 1 < sections.length
    ) {
      // Merge with next
      sections[i + 1].text = sections[i].text + "\n\n" + sections[i + 1].text;
      sections[i + 1].heading =
        sections[i].heading || sections[i + 1].heading;
      sections[i + 1].headingPath =
        sections[i].headingPath.length > 0
          ? sections[i].headingPath
          : sections[i + 1].headingPath;
    } else {
      merged.push({ ...sections[i] });
    }
  }

  return merged;
}

// ─── Per-Content-Type Chunkers ───────────────────────────────────────────────

function chunkWebArticle(
  content: string,
  filename: string
): Omit<Chunk, "id" | "category" | "chunkIndex" | "totalChunks">[] {
  const cleaned = cleanContent(content);
  const url =
    extractUrlFromHeader(cleaned) || filenameToUrl(filename);

  const sections = splitByHeadings(cleaned);
  const merged = mergeSmallChunks(sections);

  const chunks: Omit<Chunk, "id" | "category" | "chunkIndex" | "totalChunks">[] = [];

  for (const section of merged) {
    const subChunks = enforceMaxTokens(section.text);
    for (const text of subChunks) {
      chunks.push({
        title: section.heading || filename.replace(/\.md$/, ""),
        content: text,
        sourceFile: filename,
        sourceUrl: url,
        sourceType: "web",
        contentType: "reference",
        tokenCount: estimateTokens(text),
        headingPath: section.headingPath,
      });
    }
  }

  return chunks;
}

function chunkYouTubeTranscript(
  content: string,
  filename: string
): Omit<Chunk, "id" | "category" | "chunkIndex" | "totalChunks">[] {
  const meta = extractYouTubeMetadata(content);

  // Extract title from first # heading
  const titleMatch = content.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1].trim() : filename.replace(/\.md$/, "");

  // Find transcript section
  const transcriptIdx = content.indexOf("## Transcript");
  const transcript =
    transcriptIdx >= 0
      ? content.slice(transcriptIdx + "## Transcript".length).trim()
      : content;

  // Split transcript on sentence boundaries
  const textChunks = splitBySentences(transcript, 500, OVERLAP_TOKENS);

  return textChunks.map((text) => ({
    title,
    content: text,
    sourceFile: filename,
    sourceUrl: meta.url,
    sourceType: "youtube",
    contentType: "strategic",
    tokenCount: estimateTokens(text),
    headingPath: [title, "Transcript"],
  }));
}

function chunkGptPrompt(
  content: string,
  filename: string
): Omit<Chunk, "id" | "category" | "chunkIndex" | "totalChunks">[] {
  const url = extractUrlFromHeader(content);
  const titleMatch = content.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1].trim() : filename.replace(/\.md$/, "");

  const totalTokens = estimateTokens(content);

  if (totalTokens <= MAX_TOKENS) {
    // Keep as single chunk
    return [
      {
        title,
        content: cleanContent(content),
        sourceFile: filename,
        sourceUrl: url,
        sourceType: "gpt-prompt",
        contentType: "tool",
        tokenCount: estimateTokens(cleanContent(content)),
        headingPath: [title],
      },
    ];
  }

  // Split on ## sections
  const sections = splitByHeadings(cleanContent(content));
  const merged = mergeSmallChunks(sections);

  return merged.flatMap((section) => {
    const subChunks = enforceMaxTokens(section.text);
    return subChunks.map((text) => ({
      title: section.heading || title,
      content: text,
      sourceFile: filename,
      sourceUrl: url,
      sourceType: "gpt-prompt",
      contentType: "tool",
      tokenCount: estimateTokens(text),
      headingPath: section.headingPath.length > 0 ? section.headingPath : [title],
    }));
  });
}

function chunkBlueprintMd(
  content: string,
  filename: string
): Omit<Chunk, "id" | "category" | "chunkIndex" | "totalChunks">[] {
  const cleaned = cleanContent(content);

  // Extract domain from title
  const titleMatch = cleaned.match(/^#\s+Strategy Blueprint:\s*(.+)/m);
  const domain = titleMatch ? titleMatch[1].trim() : filename.replace(/_blueprint\.md$/, "");
  const title = `Strategy Blueprint: ${domain}`;

  const sections = splitByHeadings(cleaned);
  const merged = mergeSmallChunks(sections);

  return merged.flatMap((section) => {
    const subChunks = enforceMaxTokens(section.text);
    return subChunks.map((text) => ({
      title: section.heading ? `${domain} — ${section.heading}` : title,
      content: text,
      sourceFile: filename,
      sourceUrl: "",
      sourceType: "strategy-snapshot",
      contentType: "blueprint",
      tokenCount: estimateTokens(text),
      headingPath: [domain, ...section.headingPath],
    }));
  });
}

function chunkSnapshotJson(
  content: string,
  filename: string
): Omit<Chunk, "id" | "category" | "chunkIndex" | "totalChunks">[] {
  let data: any;
  try {
    data = JSON.parse(content);
  } catch {
    console.warn(`  [WARN] Failed to parse JSON: ${filename}`);
    return [];
  }

  const domain = data.meta?.domain || filename.replace(/_snapshot\.json$/, "");
  const chunks: Omit<Chunk, "id" | "category" | "chunkIndex" | "totalChunks">[] = [];

  // Overview chunk: meta + analysis summary
  const overviewParts: string[] = [];
  overviewParts.push(`Domain: ${domain}`);
  if (data.meta?.rootUrl) overviewParts.push(`Root URL: ${data.meta.rootUrl}`);
  if (data.meta?.crawledAt) overviewParts.push(`Crawled: ${data.meta.crawledAt}`);
  if (data.analysis) {
    const a = data.analysis;
    if (a.totalPages) overviewParts.push(`Total Pages: ${a.totalPages}`);
    if (a.typeDistribution)
      overviewParts.push(
        `Page Types: ${JSON.stringify(a.typeDistribution)}`
      );
    if (a.hubPages?.length)
      overviewParts.push(`Hub Pages: ${a.hubPages.join(", ")}`);
    if (a.orphanPages?.length)
      overviewParts.push(`Orphan Pages: ${a.orphanPages.join(", ")}`);
    if (a.silos)
      overviewParts.push(`Silos: ${JSON.stringify(a.silos)}`);
    if (a.headerPatterns)
      overviewParts.push(`Header Patterns: ${JSON.stringify(a.headerPatterns)}`);
    if (a.schemaUsage)
      overviewParts.push(`Schema Usage: ${JSON.stringify(a.schemaUsage)}`);
  }
  const overviewText = overviewParts.join("\n");

  // Sub-split overview if huge
  const overviewChunks = enforceMaxTokens(overviewText);
  for (const text of overviewChunks) {
    chunks.push({
      title: `${domain} — Site Overview`,
      content: text,
      sourceFile: filename,
      sourceUrl: data.meta?.rootUrl || "",
      sourceType: "strategy-snapshot",
      contentType: "blueprint",
      tokenCount: estimateTokens(text),
      headingPath: [domain, "Overview"],
    });
  }

  // Analysis deep sections (URL tree, architecture, link map)
  if (data.analysis) {
    const deepSections: [string, any][] = [
      ["URL Tree", data.analysis.urlTree],
      ["Site Architecture", data.analysis.siteArchitecture],
      ["Link Map", data.analysis.linkMap],
      ["Cross-Silo Links", data.analysis.crossSiloLinks],
      ["Homepage Blueprint", data.analysis.homepageBlueprint],
      ["Title Patterns", data.analysis.titlePatterns],
      ["CTA Patterns", data.analysis.ctaPatterns],
    ];

    for (const [label, value] of deepSections) {
      if (!value) continue;
      const text =
        typeof value === "string" ? value : JSON.stringify(value, null, 2);
      if (estimateTokens(text) < MIN_TOKENS) continue;

      const subChunks = enforceMaxTokens(text);
      for (const chunk of subChunks) {
        chunks.push({
          title: `${domain} — ${label}`,
          content: chunk,
          sourceFile: filename,
          sourceUrl: data.meta?.rootUrl || "",
          sourceType: "strategy-snapshot",
          contentType: "blueprint",
          tokenCount: estimateTokens(chunk),
          headingPath: [domain, label],
        });
      }
    }
  }

  // Page entries
  if (data.pages?.length) {
    // Group small pages together, or create individual chunks for large ones
    let pageBuffer: string[] = [];
    let bufferTokens = 0;

    for (const page of data.pages) {
      const pageText = formatPageEntry(page);
      const pageTokens = estimateTokens(pageText);

      if (bufferTokens + pageTokens > MAX_TOKENS && pageBuffer.length > 0) {
        // Flush buffer
        const combined = pageBuffer.join("\n\n---\n\n");
        chunks.push({
          title: `${domain} — Pages`,
          content: combined,
          sourceFile: filename,
          sourceUrl: data.meta?.rootUrl || "",
          sourceType: "strategy-snapshot",
          contentType: "blueprint",
          tokenCount: estimateTokens(combined),
          headingPath: [domain, "Pages"],
        });
        pageBuffer = [];
        bufferTokens = 0;
      }

      if (pageTokens > MAX_TOKENS) {
        // Large page — split it
        const subChunks = enforceMaxTokens(pageText);
        for (const chunk of subChunks) {
          chunks.push({
            title: `${domain} — ${page.url || "Page"}`,
            content: chunk,
            sourceFile: filename,
            sourceUrl: page.url || "",
            sourceType: "strategy-snapshot",
            contentType: "blueprint",
            tokenCount: estimateTokens(chunk),
            headingPath: [domain, "Pages", page.url || "Page"],
          });
        }
      } else {
        pageBuffer.push(pageText);
        bufferTokens += pageTokens;
      }
    }

    // Flush remaining
    if (pageBuffer.length > 0) {
      const combined = pageBuffer.join("\n\n---\n\n");
      chunks.push({
        title: `${domain} — Pages`,
        content: combined,
        sourceFile: filename,
        sourceUrl: data.meta?.rootUrl || "",
        sourceType: "strategy-snapshot",
        contentType: "blueprint",
        tokenCount: estimateTokens(combined),
        headingPath: [domain, "Pages"],
      });
    }
  }

  return chunks;
}

/** Format a page entry from snapshot JSON into readable text */
function formatPageEntry(page: any): string {
  const parts: string[] = [];
  parts.push(`URL: ${page.url || "unknown"}`);
  if (page.pageType) parts.push(`Type: ${page.pageType}`);
  if (page.meta?.title) parts.push(`Title: ${page.meta.title}`);
  if (page.meta?.description) parts.push(`Description: ${page.meta.description}`);
  if (page.headings?.tree?.length) {
    parts.push(
      `Headings: ${page.headings.tree
        .map((h: any) => `${"#".repeat(h.level)} ${h.text}`)
        .join(", ")}`
    );
  }
  if (page.content?.wordCount) parts.push(`Word Count: ${page.content.wordCount}`);
  if (page.links?.internal?.length)
    parts.push(`Internal Links: ${page.links.internal.length}`);
  if (page.links?.external?.length)
    parts.push(`External Links: ${page.links.external.length}`);
  if (page.technical?.loadTime)
    parts.push(`Load Time: ${page.technical.loadTime}ms`);
  if (page.technical?.statusCode)
    parts.push(`Status: ${page.technical.statusCode}`);
  return parts.join("\n");
}

function chunkBriefExample(
  content: string,
  filename: string
): Omit<Chunk, "id" | "category" | "chunkIndex" | "totalChunks">[] {
  const cleaned = cleanContent(content);

  // Extract title from first # heading (e.g. "Homepage — Content Brief")
  const titleMatch = cleaned.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1].trim() : filename.replace(/\.md$/, "");

  const sections = splitByHeadings(cleaned);
  const merged = mergeSmallChunks(sections);

  const chunks: Omit<Chunk, "id" | "category" | "chunkIndex" | "totalChunks">[] = [];

  for (const section of merged) {
    const subChunks = enforceMaxTokens(section.text);
    for (const text of subChunks) {
      chunks.push({
        title: section.heading || title,
        content: text,
        sourceFile: filename,
        sourceUrl: "",
        sourceType: "brief-example",
        contentType: "example",
        tokenCount: estimateTokens(text),
        headingPath: section.headingPath.length > 0 ? section.headingPath : [title],
      });
    }
  }

  return chunks;
}

// ─── Main Pipeline ───────────────────────────────────────────────────────────

function processFile(
  filePath: string,
  filename: string,
  category: string,
  indexLookup: Map<string, IndexEntry>
): Omit<Chunk, "id" | "category" | "chunkIndex" | "totalChunks">[] {
  const content = fs.readFileSync(filePath, "utf8");
  if (!content.trim()) return [];

  const indexEntry = indexLookup.get(filename);
  const kind = detectContentKind(filename, category, indexEntry);

  let rawChunks: Omit<Chunk, "id" | "category" | "chunkIndex" | "totalChunks">[];

  switch (kind) {
    case "web-article":
      rawChunks = chunkWebArticle(content, filename);
      break;
    case "youtube-transcript":
      rawChunks = chunkYouTubeTranscript(content, filename);
      break;
    case "gpt-prompt":
      rawChunks = chunkGptPrompt(content, filename);
      break;
    case "blueprint-md":
      rawChunks = chunkBlueprintMd(content, filename);
      break;
    case "snapshot-json":
      rawChunks = chunkSnapshotJson(content, filename);
      break;
    case "brief-example":
      rawChunks = chunkBriefExample(content, filename);
      break;
    default:
      rawChunks = chunkWebArticle(content, filename);
  }

  // Apply index metadata overrides if available
  if (indexEntry) {
    for (const chunk of rawChunks) {
      if (indexEntry.source && chunk.sourceType === "web") {
        chunk.sourceType = indexEntry.source;
      }
      if (indexEntry.type) {
        chunk.contentType = indexEntry.type;
      }
    }
  }

  // Final pass: enforce max tokens on every chunk (catches any strategy that missed it)
  const enforced: typeof rawChunks = [];
  for (const chunk of rawChunks) {
    if (!chunk.content.trim()) continue;
    const tokens = estimateTokens(chunk.content);
    if (tokens > MAX_TOKENS) {
      // Use word splitting directly for guaranteed size compliance
      const subParts = splitByWords(chunk.content, MAX_TOKENS, 0);
      for (const part of subParts) {
        enforced.push({ ...chunk, content: part, tokenCount: estimateTokens(part) });
      }
    } else {
      enforced.push(chunk);
    }
  }

  // Merge consecutive tiny chunks from the same file
  const merged: typeof enforced = [];
  for (const chunk of enforced) {
    if (!chunk.content.trim()) continue;
    const tokens = estimateTokens(chunk.content);
    if (tokens < MIN_TOKENS && merged.length > 0 && merged[merged.length - 1].sourceFile === chunk.sourceFile) {
      const prev = merged[merged.length - 1];
      // Only merge if combined won't exceed MAX_TOKENS
      if (prev.tokenCount + tokens <= MAX_TOKENS) {
        prev.content += "\n\n" + chunk.content;
        prev.tokenCount = estimateTokens(prev.content);
      } else {
        merged.push({ ...chunk, tokenCount: tokens });
      }
    } else {
      merged.push({ ...chunk, tokenCount: tokens });
    }
  }

  // Second pass: try to merge remaining tiny chunks forward
  const merged2: typeof merged = [];
  for (let i = 0; i < merged.length; i++) {
    const chunk = merged[i];
    if (chunk.tokenCount < MIN_TOKENS && i + 1 < merged.length && merged[i + 1].sourceFile === chunk.sourceFile) {
      // Prepend to next chunk
      merged[i + 1].content = chunk.content + "\n\n" + merged[i + 1].content;
      merged[i + 1].tokenCount = estimateTokens(merged[i + 1].content);
    } else {
      merged2.push(chunk);
    }
  }

  // Filter out remaining sub-minimum chunks (only truly tiny ones < 20 tokens)
  return merged2.filter(
    (c) => c.content.trim().length > 10 && estimateTokens(c.content) >= 20
  );
}

function main() {
  console.log("Phase 2.5: Knowledge Chunking Pipeline");
  console.log("═".repeat(50));

  // Step 1: Parse INDEX.md
  console.log("\n[1/3] Parsing INDEX.md...");
  const indexLookup = parseIndex();
  console.log(`  Found ${indexLookup.size} file entries in INDEX.md`);

  // Step 2: Ensure output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Step 3: Process each category
  console.log("\n[2/3] Processing categories...\n");

  const allChunks: Chunk[] = [];
  const stats: ChunkStats = {
    totalChunks: 0,
    totalFilesProcessed: 0,
    totalFilesExpected: 965,
    categories: {},
    tokenDistribution: {
      under100: 0,
      t100to300: 0,
      t300to500: 0,
      t500to800: 0,
      t800to1000: 0,
      over1000: 0,
    },
  };

  for (const category of CATEGORIES) {
    const categoryDir = path.join(KNOWLEDGE_DIR, category);
    if (!fs.existsSync(categoryDir)) {
      console.warn(`  [SKIP] ${category} — directory not found`);
      continue;
    }

    const files = fs.readdirSync(categoryDir).filter(
      (f) => f.endsWith(".md") || f.endsWith(".json")
    );

    let categoryChunks: Chunk[] = [];
    let chunkCounter = 0;
    const tokenCounts: number[] = [];

    for (const filename of files) {
      const filePath = path.join(categoryDir, filename);
      try {
        const fileChunks = processFile(filePath, filename, category, indexLookup);

        // Assign IDs and category, set chunk indices
        const totalChunks = fileChunks.length;
        for (let i = 0; i < fileChunks.length; i++) {
          const chunk: Chunk = {
            ...fileChunks[i],
            id: `${category}_chunk_${String(chunkCounter).padStart(4, "0")}`,
            category,
            chunkIndex: i,
            totalChunks,
          };
          categoryChunks.push(chunk);
          tokenCounts.push(chunk.tokenCount);
          chunkCounter++;

          // Update token distribution
          if (chunk.tokenCount < 100) stats.tokenDistribution.under100++;
          else if (chunk.tokenCount < 300) stats.tokenDistribution.t100to300++;
          else if (chunk.tokenCount < 500) stats.tokenDistribution.t300to500++;
          else if (chunk.tokenCount < 800) stats.tokenDistribution.t500to800++;
          else if (chunk.tokenCount <= 1000) stats.tokenDistribution.t800to1000++;
          else stats.tokenDistribution.over1000++;
        }

        if (fileChunks.length > 0) stats.totalFilesProcessed++;
      } catch (err: any) {
        console.error(`  [ERROR] ${filename}: ${err.message}`);
      }
    }

    // Write category JSON
    const categoryOutputPath = path.join(OUTPUT_DIR, `${category}.json`);
    fs.writeFileSync(categoryOutputPath, JSON.stringify(categoryChunks, null, 2));

    // Category stats
    stats.categories[category] = {
      files: files.length,
      chunks: categoryChunks.length,
      minTokens: tokenCounts.length > 0 ? Math.min(...tokenCounts) : 0,
      maxTokens: tokenCounts.length > 0 ? Math.max(...tokenCounts) : 0,
      avgTokens:
        tokenCounts.length > 0
          ? Math.round(
              tokenCounts.reduce((a, b) => a + b, 0) / tokenCounts.length
            )
          : 0,
      medianTokens: median(tokenCounts),
    };

    allChunks.push(...categoryChunks);
    stats.totalChunks += categoryChunks.length;

    console.log(
      `  ${category}: ${files.length} files → ${categoryChunks.length} chunks (avg ${stats.categories[category].avgTokens} tokens)`
    );
  }

  // Step 4: Write combined output
  console.log("\n[3/3] Writing output files...");

  const allChunksPath = path.join(OUTPUT_DIR, "all-chunks.json");
  fs.writeFileSync(allChunksPath, JSON.stringify(allChunks, null, 2));
  console.log(`  all-chunks.json: ${allChunks.length} chunks`);

  const statsPath = path.join(OUTPUT_DIR, "chunk-stats.json");
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  console.log(`  chunk-stats.json written`);

  // Summary
  console.log("\n" + "═".repeat(50));
  console.log("SUMMARY");
  console.log("═".repeat(50));
  console.log(`Total files processed: ${stats.totalFilesProcessed}`);
  console.log(`Total chunks created:  ${stats.totalChunks}`);
  console.log(`\nToken distribution:`);
  console.log(`  < 100:      ${stats.tokenDistribution.under100}`);
  console.log(`  100-300:    ${stats.tokenDistribution.t100to300}`);
  console.log(`  300-500:    ${stats.tokenDistribution.t300to500}`);
  console.log(`  500-800:    ${stats.tokenDistribution.t500to800}`);
  console.log(`  800-1000:   ${stats.tokenDistribution.t800to1000}`);
  console.log(`  > 1000:     ${stats.tokenDistribution.over1000}`);

  console.log(
    `\nOutput: ${OUTPUT_DIR.replace(ROOT + path.sep, "")}/`
  );
  console.log("Done.");
}

main();

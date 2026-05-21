import "server-only";

/**
 * SERP & Competitor Data Integration
 *
 * Priority: SearchAtlas → SerpAPI + Firecrawl → null (graceful fallback)
 *
 * SerpAPI provides: Google SERP results, PAA, related searches, SERP features
 * Firecrawl provides: competitor page scraping (headings, word count, structure)
 * SearchAtlas provides: keyword volumes, difficulty, gap analysis (if configured)
 */

// --- Types ---

export interface KeywordData {
  keyword: string;
  volume: number;
  globalVolume?: number;
  difficulty?: number;
  cpc?: number;
  competition?: number;
  intent?: string;
}

export interface SerpResult {
  position: number;
  url: string;
  title: string;
  domain: string;
}

export interface SerpOverview {
  keyword: string;
  results: SerpResult[];
  features: string[]; // FS, PAA, KP, etc.
  totalResults?: number;
}

export interface CompetitorAnalysis {
  url: string;
  title: string;
  headings: string[];
  wordCount?: number;
  serpPosition: number;
}

export interface KeywordResearchResult {
  primary: KeywordData;
  related: KeywordData[];
  paa: string[]; // People Also Ask questions
  serp: SerpOverview;
  competitors: CompetitorAnalysis[];
}

// --- Config ---

const SEARCHATLAS_BASE = process.env.SEARCHATLAS_API_URL || "https://api.searchatlas.com/v2";

function getSearchAtlasKey(): string | null {
  return process.env.SEARCHATLAS_API_KEY || null;
}

function getSerpApiKey(): string | null {
  return process.env.SERPAPI_API_KEY || null;
}

function getFirecrawlKey(): string | null {
  return process.env.FIRECRAWL_API_KEY || null;
}

function isConfigured(): boolean {
  return !!(getSearchAtlasKey() || getSerpApiKey());
}

// --- SearchAtlas direct API call ---

async function searchAtlasCall<T>(
  endpoint: string,
  params: Record<string, unknown> = {}
): Promise<T | null> {
  const apiKey = getSearchAtlasKey();
  if (!apiKey) return null;

  try {
    const url = new URL(`${SEARCHATLAS_BASE}${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.warn(`[searchatlas] API ${endpoint} returned ${response.status}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (err) {
    console.warn(`[searchatlas] API call failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// --- SerpAPI ---

async function serpApiSearch(
  query: string,
  gl = "gb"
): Promise<Record<string, unknown> | null> {
  const apiKey = getSerpApiKey();
  if (!apiKey) return null;

  try {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", query);
    url.searchParams.set("gl", gl);
    url.searchParams.set("hl", "en");
    url.searchParams.set("num", "10");

    console.log(`[serpapi] Google search for "${query}" (${gl})`);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.warn(`[serpapi] HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    return (await response.json()) as Record<string, unknown>;
  } catch (err) {
    console.warn(`[serpapi] Failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

function detectSerpFeatures(data: Record<string, unknown>): string[] {
  const features: string[] = [];
  if (data.answer_box) features.push("FS");
  if (data.people_also_ask) features.push("PAA");
  if (data.knowledge_graph) features.push("KP");
  if (data.local_results || data.local_map) features.push("Local Pack");
  if (data.top_stories) features.push("Top Stories");
  if (data.shopping_results) features.push("Shopping");
  if (data.video_results) features.push("Video");
  if (data.images_results) features.push("Images");
  return features;
}

function parseSerpApiToKeywordResult(
  data: Record<string, unknown>,
  keyword: string
): KeywordResearchResult {
  // Organic results → competitors
  const organicResults = Array.isArray(data.organic_results) ? data.organic_results : [];
  const serpResults: SerpResult[] = organicResults.slice(0, 10).map(
    (r: Record<string, unknown>, i: number) => ({
      position: toNumber(r.position, i + 1),
      url: String(r.link || r.url || ""),
      title: String(r.title || ""),
      domain: String(r.domain || extractDomainFromUrl(String(r.link || ""))),
    })
  );

  // PAA
  const rawPaa = Array.isArray(data.people_also_ask) ? data.people_also_ask : [];
  const paa: string[] = rawPaa.map(
    (q: Record<string, unknown>) => String(q.question || q.title || "")
  ).filter(Boolean);

  // Related searches → related keywords (no volume data from SerpAPI)
  const rawRelated = Array.isArray(data.related_searches) ? data.related_searches : [];
  const related: KeywordData[] = rawRelated.map(
    (r: Record<string, unknown>) => ({
      keyword: String(r.query || r.title || ""),
      volume: 0, // SerpAPI doesn't provide volume
    })
  ).filter((k: KeywordData) => k.keyword.length > 0);

  // SERP features
  const features = detectSerpFeatures(data);

  // Build competitors (headings filled later by Firecrawl)
  const competitors: CompetitorAnalysis[] = serpResults.slice(0, 5).map((s) => ({
    url: s.url,
    title: s.title,
    headings: [],
    serpPosition: s.position,
  }));

  // Search info
  const searchInfo = data.search_information as Record<string, unknown> | undefined;
  const totalResults = searchInfo ? toNumber(searchInfo.total_results, undefined) : undefined;

  return {
    primary: { keyword, volume: 0, intent: undefined },
    related,
    paa,
    serp: { keyword, results: serpResults, features, totalResults },
    competitors,
  };
}

// --- Firecrawl ---

async function firecrawlScrape(url: string): Promise<{ markdown: string; wordCount: number } | null> {
  const apiKey = getFirecrawlKey();
  if (!apiKey) return null;

  try {
    console.log(`[firecrawl] Scraping ${url}`);

    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["markdown"] }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      console.warn(`[firecrawl] HTTP ${response.status} for ${url}`);
      return null;
    }

    const result = (await response.json()) as Record<string, unknown>;
    if (!result.success) {
      console.warn(`[firecrawl] Scrape failed for ${url}`);
      return null;
    }

    const resultData = result.data as Record<string, unknown> | undefined;
    const markdown = String(resultData?.markdown || "");
    const metadata = resultData?.metadata as Record<string, unknown> | undefined;
    const wordCount = toNumber(metadata?.wordCount, markdown.split(/\s+/).length);

    return { markdown, wordCount };
  } catch (err) {
    console.warn(`[firecrawl] Failed for ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

function extractHeadingsFromMarkdown(markdown: string): string[] {
  const headings: string[] = [];
  const lines = markdown.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{1,4})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      if (text.length > 0 && text.length < 200) {
        headings.push(`H${level}: ${text}`);
      }
    }
  }
  return headings;
}

async function enrichCompetitorsWithFirecrawl(
  competitors: CompetitorAnalysis[]
): Promise<CompetitorAnalysis[]> {
  if (!getFirecrawlKey()) return competitors;

  // Scrape top 3 competitor pages in parallel
  const toScrape = competitors.slice(0, 3);
  const scrapeResults = await Promise.all(
    toScrape.map(async (comp) => {
      const scraped = await firecrawlScrape(comp.url);
      if (scraped) {
        return {
          ...comp,
          headings: extractHeadingsFromMarkdown(scraped.markdown),
          wordCount: scraped.wordCount,
        };
      }
      return comp;
    })
  );

  // Replace scraped competitors, keep rest as-is
  return [
    ...scrapeResults,
    ...competitors.slice(3),
  ];
}

// --- Public API ---

/**
 * Check if any SERP data source is available.
 */
export function searchAtlasAvailable(): boolean {
  return isConfigured();
}

/**
 * Look up keyword data: SERP results, PAA, features, competitor headings.
 * Tries SearchAtlas first, falls back to SerpAPI + Firecrawl.
 */
export async function lookupKeyword(
  keyword: string,
  countryCode = "gb"
): Promise<KeywordResearchResult | null> {
  if (!isConfigured()) {
    console.info("[serp] No SERP API configured — skipping keyword lookup");
    return null;
  }

  // Try SearchAtlas first
  if (getSearchAtlasKey()) {
    const data = await searchAtlasCall<Record<string, unknown>>("/keywords/lookup", {
      keyword,
      country_code: countryCode,
    });
    if (data) {
      const result = parseSearchAtlasKeywordResponse(data, keyword);
      result.competitors = await enrichCompetitorsWithFirecrawl(result.competitors);
      return result;
    }
  }

  // Fall back to SerpAPI
  const serpData = await serpApiSearch(keyword, countryCode);
  if (!serpData) return null;

  const result = parseSerpApiToKeywordResult(serpData, keyword);

  // Enrich competitors with Firecrawl headings
  result.competitors = await enrichCompetitorsWithFirecrawl(result.competitors);

  return result;
}

/**
 * Bulk SERP lookup for multiple keywords.
 */
export async function bulkSerpLookup(
  keywords: string[],
  countryCode = "gb"
): Promise<SerpOverview[] | null> {
  if (!isConfigured()) return null;

  // SearchAtlas path
  if (getSearchAtlasKey()) {
    const data = await searchAtlasCall<Record<string, unknown>>("/serps/bulk", {
      keywords: keywords.join(","),
      country_code: countryCode,
      serp_count: 10,
    });
    if (data) return parseBulkSerpResponse(data);
  }

  // SerpAPI fallback: search up to 5 keywords sequentially
  const results: SerpOverview[] = [];
  for (const kw of keywords.slice(0, 5)) {
    const data = await serpApiSearch(kw, countryCode);
    if (data) {
      const organic = Array.isArray(data.organic_results) ? data.organic_results : [];
      results.push({
        keyword: kw,
        results: organic.slice(0, 10).map((r: Record<string, unknown>, i: number) => ({
          position: toNumber(r.position, i + 1),
          url: String(r.link || ""),
          title: String(r.title || ""),
          domain: String(r.domain || ""),
        })),
        features: detectSerpFeatures(data),
      });
    }
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  return results.length > 0 ? results : null;
}

/**
 * Get organic keywords for a domain.
 * SerpAPI fallback uses site: search for approximate inventory.
 */
export async function getOrganicKeywords(
  domain: string,
  countryCode = "gb",
  limit = 50
): Promise<KeywordData[] | null> {
  if (!isConfigured()) return null;

  // SearchAtlas path
  if (getSearchAtlasKey()) {
    const data = await searchAtlasCall<Record<string, unknown>>("/sites/keywords", {
      domain,
      country_code: countryCode,
      page_size: limit,
      ordering: "-search_volume",
    });
    if (data) return parseOrganicKeywordsResponse(data);
  }

  // SerpAPI fallback: site: search to find ranking pages
  const data = await serpApiSearch(`site:${domain}`, countryCode);
  if (!data) return null;

  const organic = Array.isArray(data.organic_results) ? data.organic_results : [];
  return organic.map((r: Record<string, unknown>) => ({
    keyword: String(r.title || "").slice(0, 100),
    volume: 0,
    intent: undefined,
  })).filter((k: KeywordData) => k.keyword.length > 0);
}

/**
 * Keyword gap analysis. Only available via SearchAtlas.
 */
export async function analyzeKeywordGap(
  primaryDomain: string,
  competitorDomains: string[],
  countryCode = "gb"
): Promise<KeywordData[] | null> {
  if (!getSearchAtlasKey()) return null;

  const data = await searchAtlasCall<Record<string, unknown>>("/keywords/gap", {
    primary_website: primaryDomain,
    competitor_websites: competitorDomains.join(","),
    country_code: countryCode,
  });

  if (!data) return null;
  return parseGapResponse(data);
}

// --- SearchAtlas Response Parsers ---

function parseSearchAtlasKeywordResponse(
  data: Record<string, unknown>,
  keyword: string
): KeywordResearchResult {
  const results = (data.results || data.data || data) as Record<string, unknown>;

  const primary: KeywordData = {
    keyword,
    volume: toNumber(results.search_volume || results.volume, 0),
    globalVolume: toNumber(results.global_volume, undefined),
    difficulty: toNumber(results.difficulty || results.keyword_difficulty, undefined),
    cpc: toNumber(results.cpc, undefined),
    competition: toNumber(results.competition, undefined),
    intent: toString(results.intent),
  };

  const related: KeywordData[] = Array.isArray(results.related_keywords)
    ? results.related_keywords.map((r: Record<string, unknown>) => ({
        keyword: String(r.keyword || r.term || ""),
        volume: toNumber(r.search_volume || r.volume, 0),
        intent: toString(r.intent),
      }))
    : [];

  const rawPaa = results.paa || results.people_also_ask;
  const paa: string[] = Array.isArray(rawPaa)
    ? rawPaa.map((q: unknown) =>
        typeof q === "string" ? q : String((q as Record<string, unknown>).question || q)
      )
    : [];

  const rawSerp = results.serp || results.serp_results;
  const serpResults: SerpResult[] = Array.isArray(rawSerp)
    ? rawSerp.map((s: Record<string, unknown>, i: number) => ({
        position: toNumber(s.position, i + 1),
        url: String(s.url || s.link || ""),
        title: String(s.title || ""),
        domain: String(s.domain || ""),
      }))
    : [];

  const rawFeatures = results.serp_features;
  const features: string[] = Array.isArray(rawFeatures)
    ? rawFeatures.map((f: unknown) => String(f))
    : [];

  const competitors: CompetitorAnalysis[] = serpResults.slice(0, 5).map((s) => ({
    url: s.url,
    title: s.title,
    headings: [],
    serpPosition: s.position,
  }));

  return {
    primary,
    related,
    paa,
    serp: { keyword, results: serpResults, features },
    competitors,
  };
}

function parseBulkSerpResponse(data: Record<string, unknown>): SerpOverview[] {
  const items = Array.isArray(data.results) ? data.results : [];
  return items.map((item: Record<string, unknown>) => ({
    keyword: String(item.keyword || ""),
    results: Array.isArray(item.serp)
      ? item.serp.map((s: Record<string, unknown>, i: number) => ({
          position: toNumber(s.position, i + 1),
          url: String(s.url || ""),
          title: String(s.title || ""),
          domain: String(s.domain || ""),
        }))
      : [],
    features: Array.isArray(item.features)
      ? item.features.map((f: unknown) => String(f))
      : [],
  }));
}

function parseOrganicKeywordsResponse(data: Record<string, unknown>): KeywordData[] {
  const items = Array.isArray(data.results) ? data.results : [];
  return items.map((item: Record<string, unknown>) => ({
    keyword: String(item.keyword || item.term || ""),
    volume: toNumber(item.search_volume || item.volume, 0),
    difficulty: toNumber(item.difficulty, undefined),
    cpc: toNumber(item.cpc, undefined),
    intent: toString(item.intent),
  }));
}

function parseGapResponse(data: Record<string, unknown>): KeywordData[] {
  const items = Array.isArray(data.results) ? data.results : [];
  return items.map((item: Record<string, unknown>) => ({
    keyword: String(item.keyword || ""),
    volume: toNumber(item.search_volume || item.volume, 0),
    intent: toString(item.intent),
  }));
}

// --- Helpers ---

function toNumber(val: unknown, fallback?: number): number {
  if (val === null || val === undefined) return fallback ?? 0;
  const n = Number(val);
  return isNaN(n) ? (fallback ?? 0) : n;
}

function toString(val: unknown): string | undefined {
  if (val === null || val === undefined) return undefined;
  return String(val);
}

function extractDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

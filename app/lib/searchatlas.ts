import "server-only";

/**
 * SearchAtlas API Integration
 *
 * Wraps SearchAtlas REST API for keyword research and SERP analysis.
 * Requires SEARCHATLAS_API_KEY env var. Falls back gracefully when unavailable.
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

const API_BASE = process.env.SEARCHATLAS_API_URL || "https://api.searchatlas.com/v2";

function getApiKey(): string | null {
  return process.env.SEARCHATLAS_API_KEY || null;
}

function isConfigured(): boolean {
  return !!getApiKey();
}

async function apiCall<T>(
  endpoint: string,
  params: Record<string, unknown> = {}
): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const url = new URL(`${API_BASE}${endpoint}`);
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
      console.warn(
        `[searchatlas] API ${endpoint} returned ${response.status}: ${response.statusText}`
      );
      return null;
    }

    return (await response.json()) as T;
  } catch (err) {
    console.warn(
      `[searchatlas] API call failed:`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

// --- Public API ---

/**
 * Check if SearchAtlas integration is available.
 */
export function searchAtlasAvailable(): boolean {
  return isConfigured();
}

/**
 * Look up keyword data: volume, CPC, difficulty, related keywords, PAA.
 * Returns null if SearchAtlas is not configured or call fails.
 */
export async function lookupKeyword(
  keyword: string,
  countryCode = "gb"
): Promise<KeywordResearchResult | null> {
  if (!isConfigured()) {
    console.info("[searchatlas] Not configured — skipping keyword lookup");
    return null;
  }

  const data = await apiCall<Record<string, unknown>>("/keywords/lookup", {
    keyword,
    country_code: countryCode,
  });

  if (!data) return null;

  // Parse response into our types
  // The exact shape depends on the SearchAtlas API response format.
  // This mapping will be refined once we have real API access.
  return parseKeywordResponse(data, keyword);
}

/**
 * Bulk lookup: get SERP results for multiple keywords.
 * Returns null if SearchAtlas is not configured.
 */
export async function bulkSerpLookup(
  keywords: string[],
  countryCode = "gb"
): Promise<SerpOverview[] | null> {
  if (!isConfigured()) return null;

  const data = await apiCall<Record<string, unknown>>("/serps/bulk", {
    keywords: keywords.join(","),
    country_code: countryCode,
    serp_count: 10,
  });

  if (!data) return null;

  return parseBulkSerpResponse(data);
}

/**
 * Get organic keywords for a domain (requires a site_id / project).
 * Returns null if not configured or no project exists.
 */
export async function getOrganicKeywords(
  domain: string,
  countryCode = "gb",
  limit = 50
): Promise<KeywordData[] | null> {
  if (!isConfigured()) return null;

  const data = await apiCall<Record<string, unknown>>("/sites/keywords", {
    domain,
    country_code: countryCode,
    page_size: limit,
    ordering: "-search_volume",
  });

  if (!data) return null;

  return parseOrganicKeywordsResponse(data);
}

/**
 * Analyze keyword gap between primary domain and competitors.
 * Returns null if not configured.
 */
export async function analyzeKeywordGap(
  primaryDomain: string,
  competitorDomains: string[],
  countryCode = "gb"
): Promise<KeywordData[] | null> {
  if (!isConfigured()) return null;

  const data = await apiCall<Record<string, unknown>>("/keywords/gap", {
    primary_website: primaryDomain,
    competitor_websites: competitorDomains.join(","),
    country_code: countryCode,
  });

  if (!data) return null;

  return parseGapResponse(data);
}

// --- Response Parsers ---
// These will be refined once we have real API access and know the exact response shapes.

function parseKeywordResponse(
  data: Record<string, unknown>,
  keyword: string
): KeywordResearchResult {
  // Flexible parser that handles various response formats
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
    ? rawSerp.map(
        (s: Record<string, unknown>, i: number) => ({
          position: toNumber(s.position, i + 1),
          url: String(s.url || s.link || ""),
          title: String(s.title || ""),
          domain: String(s.domain || ""),
        })
      )
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

function parseBulkSerpResponse(
  data: Record<string, unknown>
): SerpOverview[] {
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

function parseOrganicKeywordsResponse(
  data: Record<string, unknown>
): KeywordData[] {
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

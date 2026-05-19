export type TaskStatus = "done" | "in-progress" | "pending" | "blocked";

export interface TaskData {
  id: string;
  phaseId: string;
  title: string;
  status: string;
  assignedTo: string | null;
  blockedBy: string | null;
  sortOrder: number;
}

export interface PhaseData {
  id: string;
  slug: string;
  title: string;
  description: string;
  sortOrder: number;
  tasks: TaskData[];
}

// --- Auth ---

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

// --- Chat ---

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerationData {
  id: string;
  userId: string;
  agentType: string;
  inputPrompt: string;
  output: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// --- Content Writing ---

export interface BriefHeading {
  level: 1 | 2 | 3 | 4;
  text: string;
  intent?: string;
  wordCount?: number;
  notes?: string;
}

export interface ContentBrief {
  pageType: "service" | "location" | "blog" | "landing";
  niche: string;
  topic: string;
  location?: string;
  clientName?: string;
  targetAudience?: string;
  headings: BriefHeading[];
  additionalInstructions?: string;
  source: "form" | "import" | "agent";
}

export interface ContentSessionData {
  id: string;
  brief: ContentBrief;
  niche: string;
  pageType: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  sections: ContentSectionData[];
}

// --- Enhanced Brief (AI-generated) ---

export interface QueryEntry {
  query: string;
  volume: number;
  intent: string; // informational | commercial | transactional | navigational
}

export interface EntityMapping {
  entity: string;
  type: string; // person | place | org | concept | service
  relevance: string; // primary | secondary | contextual
}

export interface ConnectionEntry {
  fromHeading: string;
  toPage: string;
  anchorText: string;
  reason: string;
}

export interface CompetitorEntry {
  url: string;
  title: string;
  headings: string[];
  wordCount?: number;
  serpPosition?: number;
}

export interface EnhancedHeading {
  level: 1 | 2 | 3 | 4;
  text: string;
  structureInstructions: string;
  targetQueries: QueryEntry[];
  serpFeatures: string[]; // FS, PAA, KP, etc.
  ruleCodes: string[]; // which of 56 rules apply
  intent: string;
  wordCountTarget?: number;
  // V2 fields (optional, backward compatible)
  contentDesignPattern?: string; // paragraph | table | comparison | list | visual
  snippetTarget?: boolean;
  paaTarget?: boolean;
}

export interface EnhancedBrief {
  contextualVectors: string[];
  headings: EnhancedHeading[];
  entityMap: EntityMapping[];
  connectionMap: ConnectionEntry[];
  competitors: CompetitorEntry[];
  knowledgeGaps: string[];
  // V2 fields (optional, backward compatible with old briefs)
  queryPreAnalysis?: QueryPreAnalysis;
  serpAnalysis?: SerpAnalysis;
  deepCompetitorAnalysis?: DeepCompetitorAnalysisResult;
  topicalMap?: TopicalMapEntry[];
  titleTag?: TitleTagData;
  headingValidation?: HeadingValidation;
  qualityReport?: BriefQualityReport;
}

// --- Brief Pipeline V2 Types ---

// Step 1: Bulk SERP feature data
export interface BulkSerpFeatureMatrix {
  keyword: string;
  features: string[];
  topResultCount: number;
  avgWordCount?: number;
}

// Step 2: Knowledge context aggregated from RAG retrieval
export interface KnowledgeContext {
  pageTypeChunks: RetrievedChunkRef[];
  briefExampleChunks: RetrievedChunkRef[];
  strategyChunks: RetrievedChunkRef[];
}

export interface RetrievedChunkRef {
  category: string;
  title: string;
  content: string;
  sourceFile: string | null;
  similarity: number;
}

// Step 3: Competitor dataset from SearchAtlas
export interface CompetitorDataset {
  competitorKeywords: Map<string, CompetitorKeywordData[]> | null;
  gapKeywords: CompetitorKeywordData[] | null;
}

export interface CompetitorKeywordData {
  keyword: string;
  volume: number;
  position?: number;
  intent?: string;
}

// Step 4: Query & Intent Pre-Analysis
export type SearchIntentType =
  | "informational"
  | "commercial"
  | "transactional"
  | "navigational"
  | "investigational"
  | "local"
  | "comparative"
  | "mixed";

export type QueryType =
  | "head-term"
  | "mid-tail"
  | "long-tail"
  | "entity-based"
  | "attribute-based"
  | "modifier-based"
  | "problem-based";

export type BusinessModel =
  | "lead-gen"
  | "affiliate"
  | "ecommerce"
  | "saas"
  | "local-service"
  | "publisher"
  | "marketplace";

export type FreshnessRequirement =
  | "evergreen"
  | "seasonal"
  | "time-sensitive"
  | "trending";

export interface QueryPreAnalysis {
  searchIntent: SearchIntentType;
  queryType: QueryType;
  queryCompleteness: {
    isComplete: boolean;
    missingQualifiers: string[];
  };
  audienceSegments: {
    primary: string;
    secondary?: string;
    tertiary?: string;
  };
  businessModel: BusinessModel;
  intentSatisfactionThreshold: {
    depth: "shallow" | "moderate" | "deep" | "exhaustive";
    description: string;
  };
  freshnessRequirement: FreshnessRequirement;
}

// Step 5: SERP Analysis
export interface SerpAnalysis {
  consensusCoverage: string[];
  serpGaps: string[];
  compressionPatterns: string[];
  featuredSnippetOpportunities: {
    query: string;
    currentFormat: string;
    strategy: string;
  }[];
  aiOverviewPresence: boolean;
  serpFeaturePresence: {
    imagePack: boolean;
    video: boolean;
    maps: boolean;
    forums: boolean;
    paa: boolean;
    knowledgePanel: boolean;
  };
  autocompleteVariations: string[];
}

// Step 6: Deep Competitor Analysis
export interface CompetitorDeepAnalysis {
  url: string;
  title: string;
  serpPosition: number;
  headingDepth: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    maxDepth: number;
  };
  contentDesignPatterns: string[];
  strengths: string[];
  weaknesses: string[];
  topicalArchitecture: string[];
  entityCoverage: string[];
  rankingKeywords?: string[];
}

export interface DeepCompetitorAnalysisResult {
  competitors: CompetitorDeepAnalysis[];
  crossCompetitorEntities: string[];
  gapKeywords: string[];
}

// Step 7: Topical Map
export interface TopicalMapEntry {
  topic: string;
  relationship: "root" | "supporting" | "adjacent" | "downstream";
  suggestedPageType?: string;
  clusterLabel?: string;
}

// Step 8: Title Tag
export interface TitleTagData {
  titleTag: string;
  contextualAttributes: string[];
  rationale: string;
}

// Step 11: Heading Validation
export type ValidationIssueType =
  | "semantic-repetition"
  | "missing-unique-intent"
  | "continuity-break"
  | "depth-regression"
  | "edge-case-missing"
  | "syntactic-unclear"
  | "negative-attribute-missing";

export interface ValidationIssue {
  headingIndex: number;
  headingText: string;
  issueType: ValidationIssueType;
  severity: "low" | "medium" | "high";
  description: string;
  suggestedFix?: string;
}

export interface HeadingValidation {
  score: number;
  issues: ValidationIssue[];
  correctedHeadings?: EnhancedHeading[];
}

// Step 12: Quality Report
export interface BriefQualityReport {
  overallScore: number;
  breakdown: {
    competitorCoverage: number;
    intentSatisfaction: number;
    semanticCoherence: number;
    entityCompleteness: number;
    headingQuality: number;
  };
  knowledgeGaps: string[];
  recommendations: string[];
}

export interface BriefData {
  id: string;
  userId: string;
  topic: string;
  pageType: string;
  niche: string;
  location: string | null;
  clientName: string | null;
  domain: string | null;
  status: string;
  version: number;
  data: EnhancedBrief;
  keywordData: Record<string, unknown> | null;
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentSectionData {
  id: string;
  headingLevel: number;
  headingText: string;
  intent: string | null;
  content: string | null;
  status: string;
  sortOrder: number;
  metadata: Record<string, unknown> | null;
}

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
}

export interface EnhancedBrief {
  contextualVectors: string[];
  headings: EnhancedHeading[];
  entityMap: EntityMapping[];
  connectionMap: ConnectionEntry[];
  competitors: CompetitorEntry[];
  knowledgeGaps: string[];
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

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

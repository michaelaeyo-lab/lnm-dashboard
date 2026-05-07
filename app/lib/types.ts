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

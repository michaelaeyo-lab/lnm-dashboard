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

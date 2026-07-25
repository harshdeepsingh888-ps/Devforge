export const PROJECT_STATUSES = [
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
] as const;

export type ProjectStatus =
  (typeof PROJECT_STATUSES)[number];

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

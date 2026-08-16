export const PROJECT_STATUSES = [
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
] as const;

export type ProjectStatus =
  (typeof PROJECT_STATUSES)[number];

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  workspaceId: string;
  name: string;
  description?: string;
}

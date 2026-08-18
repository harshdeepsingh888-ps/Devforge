export const ADR_STATUSES = [
  "PROPOSED",
  "ACCEPTED",
  "REJECTED",
  "DEPRECATED",
] as const;

export type AdrStatus = (typeof ADR_STATUSES)[number];

export const SPEC_STATUSES = [
  "DRAFT",
  "APPROVED",
  "ARCHIVED",
] as const;

export type SpecStatus = (typeof SPEC_STATUSES)[number];

export interface ArchitectureDecision {
  id: string;
  workspaceId: string;
  projectId: string | null;
  title: string;
  status: AdrStatus;
  context: string;
  decision: string;
  consequences: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdrInput {
  workspaceId: string;
  projectId?: string | null;
  actorUserId: string;
  title: string;
  context: string;
  decision: string;
  consequences: string;
}

export interface UpdateAdrInput {
  title?: string;
  context?: string;
  decision?: string;
  consequences?: string;
}

export interface TechnicalSpecification {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  summary: string;
  content: string;
  status: SpecStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpecInput {
  workspaceId: string;
  projectId: string;
  actorUserId: string;
  title: string;
  summary: string;
  content: string;
}

export interface UpdateSpecInput {
  title?: string;
  summary?: string;
  content?: string;
}

export interface AdrSpecLink {
  id: string;
  workspaceId: string;
  adrId: string;
  specId: string;
  createdAt: string;
}

export interface SpecWorkItemLink {
  id: string;
  workspaceId: string;
  specId: string;
  workItemId: string;
  createdAt: string;
}

export interface AdrWorkItemLink {
  id: string;
  workspaceId: string;
  adrId: string;
  workItemId: string;
  createdAt: string;
}

export interface CreateAdrSpecLinkInput {
  workspaceId: string;
  adrId: string;
  specId: string;
}

export interface CreateSpecWorkItemLinkInput {
  workspaceId: string;
  specId: string;
  workItemId: string;
}

export interface CreateAdrWorkItemLinkInput {
  workspaceId: string;
  adrId: string;
  workItemId: string;
}

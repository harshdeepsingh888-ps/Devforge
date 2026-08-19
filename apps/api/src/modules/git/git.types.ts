export const GIT_PROVIDERS = ["GITHUB"] as const;
export type GitProvider = (typeof GIT_PROVIDERS)[number];

export interface Repository {
  id: string;
  workspaceId: string;
  name: string;
  provider: GitProvider;
  externalId: string; // Repo ID from provider
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRepositoryInput {
  workspaceId: string;
  name: string;
  provider?: GitProvider;
  externalId: string;
  url: string;
}

export interface Commit {
  id: string;
  workspaceId: string;
  repositoryId: string;
  externalId: string; // Commit SHA
  message: string;
  authorName: string;
  authorEmail: string;
  committedAt: string; // ISO date string
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface IngestCommitInput {
  workspaceId: string;
  repositoryId: string;
  externalId: string;
  message: string;
  authorName: string;
  authorEmail: string;
  committedAt: string;
  url: string;
}

export interface CommitWorkItemLink {
  commitId: string;
  workItemId: string;
  workspaceId: string;
  createdAt?: string;
}

export interface CommitAdrLink {
  commitId: string;
  adrId: string;
  workspaceId: string;
  createdAt?: string;
}

export interface CommitTrace {
  commit: Commit;
  workItems: Array<{
    id: string;
    title: string;
    type: string;
    priority: string;
  }>;
  adrs: Array<{
    id: string;
    title: string;
    status: string;
  }>;
}

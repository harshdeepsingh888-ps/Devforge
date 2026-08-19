import type { Commit } from "../git.types.js";

export interface CommitRepository {
  create(commit: Commit): Promise<Commit>;
  findByExternalId(repositoryId: string, sha: string): Promise<Commit | null>;
  findById(workspaceId: string, id: string): Promise<Commit | null>;
  listByWorkspace(workspaceId: string): Promise<Commit[]>;
}

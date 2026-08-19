import type { CommitAdrLink, CommitWorkItemLink } from "../git.types.js";

export interface GitLinkRepository {
  linkCommitToWorkItem(
    commitId: string,
    workItemId: string,
    workspaceId: string,
  ): Promise<CommitWorkItemLink>;
  linkCommitToAdr(
    commitId: string,
    adrId: string,
    workspaceId: string,
  ): Promise<CommitAdrLink>;
  getWorkItemsForCommit(
    commitId: string,
    workspaceId: string,
  ): Promise<CommitWorkItemLink[]>;
  getCommitsForWorkItem(
    workItemId: string,
    workspaceId: string,
  ): Promise<CommitWorkItemLink[]>;
  getAdrsForCommit(
    commitId: string,
    workspaceId: string,
  ): Promise<CommitAdrLink[]>;
}

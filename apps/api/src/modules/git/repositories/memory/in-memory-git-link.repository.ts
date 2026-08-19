import { DuplicateCommitLinkError } from "../../git.errors.js";
import type { CommitAdrLink, CommitWorkItemLink } from "../../git.types.js";
import type { GitLinkRepository } from "../git-link.repository.ts";

export class InMemoryGitLinkRepository implements GitLinkRepository {
  private workItemLinks: CommitWorkItemLink[] = [];
  private adrLinks: CommitAdrLink[] = [];

  async linkCommitToWorkItem(
    commitId: string,
    workItemId: string,
    workspaceId: string,
  ): Promise<CommitWorkItemLink> {
    const exists = this.workItemLinks.some(
      (l) =>
        l.commitId === commitId &&
        l.workItemId === workItemId &&
        l.workspaceId === workspaceId,
    );
    if (exists) {
      throw new DuplicateCommitLinkError(
        "Commit is already linked to this WorkItem.",
      );
    }
    const link: CommitWorkItemLink = {
      commitId,
      workItemId,
      workspaceId,
      createdAt: new Date().toISOString(),
    };
    this.workItemLinks.push(link);
    return { ...link };
  }

  async linkCommitToAdr(
    commitId: string,
    adrId: string,
    workspaceId: string,
  ): Promise<CommitAdrLink> {
    const exists = this.adrLinks.some(
      (l) =>
        l.commitId === commitId &&
        l.adrId === adrId &&
        l.workspaceId === workspaceId,
    );
    if (exists) {
      throw new DuplicateCommitLinkError(
        "Commit is already linked to this Architecture Decision Record.",
      );
    }
    const link: CommitAdrLink = {
      commitId,
      adrId,
      workspaceId,
      createdAt: new Date().toISOString(),
    };
    this.adrLinks.push(link);
    return { ...link };
  }

  async getWorkItemsForCommit(
    commitId: string,
    workspaceId: string,
  ): Promise<CommitWorkItemLink[]> {
    return this.workItemLinks
      .filter((l) => l.commitId === commitId && l.workspaceId === workspaceId)
      .map((l) => ({ ...l }));
  }

  async getAdrsForCommit(
    commitId: string,
    workspaceId: string,
  ): Promise<CommitAdrLink[]> {
    return this.adrLinks
      .filter((l) => l.commitId === commitId && l.workspaceId === workspaceId)
      .map((l) => ({ ...l }));
  }
}

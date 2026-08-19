import type { PrismaClient } from "../../../../generated/prisma/client.js";
import { DuplicateCommitLinkError } from "../../git.errors.js";
import type { CommitAdrLink, CommitWorkItemLink } from "../../git.types.js";
import type { GitLinkRepository } from "../git-link.repository.js";

export class PrismaGitLinkRepository implements GitLinkRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async linkCommitToWorkItem(
    commitId: string,
    workItemId: string,
    workspaceId: string,
  ): Promise<CommitWorkItemLink> {
    try {
      const created = await this.prisma.commitWorkItemLink.create({
        data: {
          commitId,
          workItemId,
          workspaceId,
        },
      });

      return {
        commitId: created.commitId,
        workItemId: created.workItemId,
        workspaceId: created.workspaceId,
        createdAt: created.createdAt.toISOString(),
      };
    } catch (e: any) {
      if (e.code === "P2002") {
        throw new DuplicateCommitLinkError(
          "Commit is already linked to this WorkItem.",
        );
      }
      throw e;
    }
  }

  async linkCommitToAdr(
    commitId: string,
    adrId: string,
    workspaceId: string,
  ): Promise<CommitAdrLink> {
    try {
      const created = await this.prisma.commitAdrLink.create({
        data: {
          commitId,
          adrId,
          workspaceId,
        },
      });

      return {
        commitId: created.commitId,
        adrId: created.adrId,
        workspaceId: created.workspaceId,
        createdAt: created.createdAt.toISOString(),
      };
    } catch (e: any) {
      if (e.code === "P2002") {
        throw new DuplicateCommitLinkError(
          "Commit is already linked to this Architecture Decision Record.",
        );
      }
      throw e;
    }
  }

  async getWorkItemsForCommit(
    commitId: string,
    workspaceId: string,
  ): Promise<CommitWorkItemLink[]> {
    const links = await this.prisma.commitWorkItemLink.findMany({
      where: {
        commitId,
        workspaceId,
      },
    });

    return links.map((l) => ({
      commitId: l.commitId,
      workItemId: l.workItemId,
      workspaceId: l.workspaceId,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async getCommitsForWorkItem(
    workItemId: string,
    workspaceId: string,
  ): Promise<CommitWorkItemLink[]> {
    const links = await this.prisma.commitWorkItemLink.findMany({
      where: {
        workItemId,
        workspaceId,
      },
    });

    return links.map((l) => ({
      commitId: l.commitId,
      workItemId: l.workItemId,
      workspaceId: l.workspaceId,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async getAdrsForCommit(
    commitId: string,
    workspaceId: string,
  ): Promise<CommitAdrLink[]> {
    const links = await this.prisma.commitAdrLink.findMany({
      where: {
        commitId,
        workspaceId,
      },
    });

    return links.map((l) => ({
      commitId: l.commitId,
      adrId: l.adrId,
      workspaceId: l.workspaceId,
      createdAt: l.createdAt.toISOString(),
    }));
  }
}

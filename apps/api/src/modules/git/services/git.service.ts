import { randomUUID } from "node:crypto";
import type { ArchitectureDecisionRepository } from "../../architecture/repositories/architecture.repository.js";
import type { WorkItemRepository } from "../../work-management/repositories/work-item.repository.js";
import {
  CommitNotFoundError,
  DuplicateCommitError,
  DuplicateCommitLinkError,
  GitTenantMismatchError,
  RepositoryNotFoundError,
} from "../git.errors.js";
import type {
  Commit,
  CommitAdrLink,
  CommitTrace,
  CommitWorkItemLink,
  CreateRepositoryInput,
  IngestCommitInput,
  Repository,
} from "../git.types.js";
import type { CommitRepository } from "../repositories/commit.repository.js";
import type { GitLinkRepository } from "../repositories/git-link.repository.js";
import type { RepositoryRepository } from "../repositories/repository.repository.js";

export class GitService {
  constructor(
    private readonly repositoryRepository: RepositoryRepository,
    private readonly commitRepository: CommitRepository,
    private readonly gitLinkRepository: GitLinkRepository,
    private readonly workItemRepository?: WorkItemRepository,
    private readonly adrRepository?: ArchitectureDecisionRepository,
  ) {}

  async createRepository(input: CreateRepositoryInput): Promise<Repository> {
    const repository: Repository = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      name: input.name,
      provider: input.provider || "GITHUB",
      externalId: input.externalId,
      url: input.url,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.repositoryRepository.create(repository);
  }

  async findRepositoryById(
    workspaceId: string,
    id: string,
  ): Promise<Repository | null> {
    return this.repositoryRepository.findById(workspaceId, id);
  }

  async listRepositories(workspaceId: string): Promise<Repository[]> {
    return this.repositoryRepository.findByWorkspace(workspaceId);
  }

  async ingestCommit(input: IngestCommitInput): Promise<Commit> {
    const repo = await this.repositoryRepository.findById(
      input.workspaceId,
      input.repositoryId,
    );
    if (!repo) {
      throw new RepositoryNotFoundError();
    }

    if (repo.workspaceId !== input.workspaceId) {
      throw new GitTenantMismatchError(
        "Repository does not belong to the target workspace tenant.",
      );
    }

    const existing = await this.commitRepository.findByExternalId(
      input.repositoryId,
      input.externalId,
    );
    if (existing) {
      throw new DuplicateCommitError();
    }

    const commit: Commit = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      repositoryId: input.repositoryId,
      externalId: input.externalId,
      message: input.message,
      authorName: input.authorName,
      authorEmail: input.authorEmail,
      committedAt: input.committedAt,
      url: input.url,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const savedCommit = await this.commitRepository.create(commit);

    // Auto-parse commit message for WorkItem references and ADR references
    await this.autoLinkFromMessage(savedCommit);

    return savedCommit;
  }

  async linkCommitToWorkItem(
    commitId: string,
    workItemId: string,
    workspaceId: string,
  ): Promise<CommitWorkItemLink> {
    const commit = await this.commitRepository.findById(workspaceId, commitId);
    if (!commit) {
      throw new CommitNotFoundError();
    }

    if (this.workItemRepository) {
      const workItem = await this.workItemRepository.findById(
        workspaceId,
        workItemId,
      );
      if (!workItem) {
        throw new GitTenantMismatchError(
          "WorkItem not found or belongs to another workspace tenant.",
        );
      }
    }

    return this.gitLinkRepository.linkCommitToWorkItem(
      commitId,
      workItemId,
      workspaceId,
    );
  }

  async linkCommitToAdr(
    commitId: string,
    adrId: string,
    workspaceId: string,
  ): Promise<CommitAdrLink> {
    const commit = await this.commitRepository.findById(workspaceId, commitId);
    if (!commit) {
      throw new CommitNotFoundError();
    }

    if (this.adrRepository) {
      const adr = await this.adrRepository.findById(workspaceId, adrId);
      if (!adr) {
        throw new GitTenantMismatchError(
          "Architecture Decision Record not found or belongs to another workspace tenant.",
        );
      }
    }

    return this.gitLinkRepository.linkCommitToAdr(
      commitId,
      adrId,
      workspaceId,
    );
  }

  async getCommitTrace(
    commitId: string,
    workspaceId: string,
  ): Promise<CommitTrace> {
    const commit = await this.commitRepository.findById(workspaceId, commitId);
    if (!commit) {
      throw new CommitNotFoundError();
    }

    const workItemLinks = await this.gitLinkRepository.getWorkItemsForCommit(
      commitId,
      workspaceId,
    );
    const adrLinks = await this.gitLinkRepository.getAdrsForCommit(
      commitId,
      workspaceId,
    );

    const workItems = [];
    if (this.workItemRepository) {
      for (const link of workItemLinks) {
        const item = await this.workItemRepository.findById(
          workspaceId,
          link.workItemId,
        );
        if (item) {
          workItems.push({
            id: item.id,
            title: item.title,
            type: item.type,
            priority: item.priority,
          });
        }
      }
    }

    const adrs = [];
    if (this.adrRepository) {
      for (const link of adrLinks) {
        const adr = await this.adrRepository.findById(workspaceId, link.adrId);
        if (adr) {
          adrs.push({
            id: adr.id,
            title: adr.title,
            status: adr.status,
          });
        }
      }
    }

    return {
      commit,
      workItems,
      adrs,
    };
  }

  private async autoLinkFromMessage(commit: Commit): Promise<void> {
    const message = commit.message;

    // Extract all candidate tokens from the commit message
    const tokens = Array.from(new Set(message.match(/[a-zA-Z0-9_-]{3,}/g) || []));

    for (const token of tokens) {
      if (this.workItemRepository) {
        const item = await this.workItemRepository.findById(
          commit.workspaceId,
          token,
        );
        if (item) {
          try {
            await this.gitLinkRepository.linkCommitToWorkItem(
              commit.id,
              item.id,
              commit.workspaceId,
            );
          } catch (e) {
            if (!(e instanceof DuplicateCommitLinkError)) {
              throw e;
            }
          }
        }
      }

      if (this.adrRepository) {
        const adr = await this.adrRepository.findById(
          commit.workspaceId,
          token,
        );
        if (adr) {
          try {
            await this.gitLinkRepository.linkCommitToAdr(
              commit.id,
              adr.id,
              commit.workspaceId,
            );
          } catch (e) {
            if (!(e instanceof DuplicateCommitLinkError)) {
              throw e;
            }
          }
        }
      }
    }
  }
}

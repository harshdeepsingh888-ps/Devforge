import type { PrismaClient } from "../../../../generated/prisma/client.js";
import type { Commit } from "../../git.types.js";
import type { CommitRepository } from "../commit.repository.js";

export class PrismaCommitRepository implements CommitRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(commit: Commit): Promise<Commit> {
    const created = await this.prisma.commit.create({
      data: {
        id: commit.id,
        workspaceId: commit.workspaceId,
        repositoryId: commit.repositoryId,
        externalId: commit.externalId,
        message: commit.message,
        authorName: commit.authorName,
        authorEmail: commit.authorEmail,
        committedAt: new Date(commit.committedAt),
        url: commit.url,
      },
    });

    return this.mapToDomain(created);
  }

  async findByExternalId(
    repositoryId: string,
    sha: string,
  ): Promise<Commit | null> {
    const found = await this.prisma.commit.findUnique({
      where: {
        repositoryId_externalId: {
          repositoryId,
          externalId: sha,
        },
      },
    });

    return found ? this.mapToDomain(found) : null;
  }

  async findById(workspaceId: string, id: string): Promise<Commit | null> {
    const found = await this.prisma.commit.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    return found ? this.mapToDomain(found) : null;
  }

  async listByWorkspace(workspaceId: string): Promise<Commit[]> {
    const commits = await this.prisma.commit.findMany({
      where: { workspaceId },
      orderBy: { committedAt: "desc" },
    });

    return commits.map((c) => this.mapToDomain(c));
  }

  private mapToDomain(raw: any): Commit {
    return {
      id: raw.id,
      workspaceId: raw.workspaceId,
      repositoryId: raw.repositoryId,
      externalId: raw.externalId,
      message: raw.message,
      authorName: raw.authorName,
      authorEmail: raw.authorEmail,
      committedAt: raw.committedAt.toISOString(),
      url: raw.url,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    };
  }
}

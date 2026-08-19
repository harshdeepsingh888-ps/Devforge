import type { PrismaClient } from "../../../../generated/prisma/client.js";
import type { Repository } from "../../git.types.js";
import type { RepositoryRepository } from "../repository.repository.js";

export class PrismaRepositoryRepository implements RepositoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(repository: Repository): Promise<Repository> {
    const created = await this.prisma.repository.create({
      data: {
        id: repository.id,
        workspaceId: repository.workspaceId,
        name: repository.name,
        provider: repository.provider,
        externalId: repository.externalId,
        url: repository.url,
      },
    });

    return this.mapToDomain(created);
  }

  async findById(workspaceId: string, id: string): Promise<Repository | null> {
    const found = await this.prisma.repository.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    return found ? this.mapToDomain(found) : null;
  }

  async findByWorkspace(workspaceId: string): Promise<Repository[]> {
    const repositories = await this.prisma.repository.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return repositories.map((r) => this.mapToDomain(r));
  }

  private mapToDomain(raw: any): Repository {
    return {
      id: raw.id,
      workspaceId: raw.workspaceId,
      name: raw.name,
      provider: raw.provider,
      externalId: raw.externalId,
      url: raw.url,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    };
  }
}

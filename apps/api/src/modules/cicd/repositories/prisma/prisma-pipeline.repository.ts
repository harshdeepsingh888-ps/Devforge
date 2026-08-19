import type { PrismaClient } from "../../../../generated/prisma/client.js";
import type { Pipeline, PipelineProvider } from "../../cicd.types.js";
import type { PipelineRepository } from "../pipeline.repository.js";

export class PrismaPipelineRepository implements PipelineRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(pipeline: Pipeline): Promise<Pipeline> {
    const created = await this.prisma.pipeline.create({
      data: {
        id: pipeline.id,
        workspaceId: pipeline.workspaceId,
        projectId: pipeline.projectId,
        provider: pipeline.provider,
        name: pipeline.name,
        externalId: pipeline.externalId,
      },
    });

    return this.mapToDomain(created);
  }

  async findById(workspaceId: string, id: string): Promise<Pipeline | null> {
    const found = await this.prisma.pipeline.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    return found ? this.mapToDomain(found) : null;
  }

  async findByExternalId(
    workspaceId: string,
    externalId: string,
  ): Promise<Pipeline | null> {
    const found = await this.prisma.pipeline.findFirst({
      where: {
        workspaceId,
        externalId,
      },
    });

    return found ? this.mapToDomain(found) : null;
  }

  async findByWorkspace(
    workspaceId: string,
    projectId?: string | null,
  ): Promise<Pipeline[]> {
    const where: any = { workspaceId };
    if (projectId !== undefined && projectId !== null) {
      where.projectId = projectId;
    }

    const records = await this.prisma.pipeline.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  private mapToDomain(raw: any): Pipeline {
    return {
      id: raw.id,
      workspaceId: raw.workspaceId,
      projectId: raw.projectId,
      provider: raw.provider as PipelineProvider,
      name: raw.name,
      externalId: raw.externalId,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    };
  }
}

import type { PrismaClient } from "../../../../generated/prisma/client.js";
import type { BuildLog } from "../../cicd.types.js";
import type { BuildLogRepository } from "../build-log.repository.js";

export class PrismaBuildLogRepository implements BuildLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(log: BuildLog): Promise<BuildLog> {
    const created = await this.prisma.buildLog.create({
      data: {
        id: log.id,
        workspaceId: log.workspaceId,
        pipelineRunId: log.pipelineRunId,
        log: log.log,
      },
    });

    return this.mapToDomain(created);
  }

  async findByPipelineRun(
    workspaceId: string,
    pipelineRunId: string,
  ): Promise<BuildLog[]> {
    const records = await this.prisma.buildLog.findMany({
      where: {
        workspaceId,
        pipelineRunId,
      },
      orderBy: { createdAt: "asc" },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  private mapToDomain(raw: any): BuildLog {
    return {
      id: raw.id,
      workspaceId: raw.workspaceId,
      pipelineRunId: raw.pipelineRunId,
      log: raw.log,
      createdAt: raw.createdAt.toISOString(),
    };
  }
}

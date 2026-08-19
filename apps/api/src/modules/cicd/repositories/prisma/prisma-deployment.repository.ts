import type { PrismaClient } from "../../../../generated/prisma/client.js";
import type {
  Deployment,
  DeploymentEnvironment,
  DeploymentStatus,
} from "../../cicd.types.js";
import type { DeploymentRepository } from "../deployment.repository.js";

export class PrismaDeploymentRepository implements DeploymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(deployment: Deployment): Promise<Deployment> {
    const created = await this.prisma.deployment.create({
      data: {
        id: deployment.id,
        workspaceId: deployment.workspaceId,
        pipelineRunId: deployment.pipelineRunId,
        environment: deployment.environment,
        status: deployment.status,
        deployedAt: new Date(deployment.deployedAt),
      },
    });

    return this.mapToDomain(created);
  }

  async findByPipelineRun(
    workspaceId: string,
    pipelineRunId: string,
  ): Promise<Deployment[]> {
    const records = await this.prisma.deployment.findMany({
      where: {
        workspaceId,
        pipelineRunId,
      },
      orderBy: { deployedAt: "desc" },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findByCommit(
    workspaceId: string,
    commitId: string,
  ): Promise<Deployment[]> {
    const records = await this.prisma.deployment.findMany({
      where: {
        workspaceId,
        pipelineRun: {
          commitId,
        },
      },
      orderBy: { deployedAt: "desc" },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  private mapToDomain(raw: any): Deployment {
    return {
      id: raw.id,
      workspaceId: raw.workspaceId,
      pipelineRunId: raw.pipelineRunId,
      environment: raw.environment as DeploymentEnvironment,
      status: raw.status as DeploymentStatus,
      deployedAt: raw.deployedAt.toISOString(),
      createdAt: raw.createdAt.toISOString(),
    };
  }
}

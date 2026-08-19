import type { PrismaClient } from "../../../../generated/prisma/client.js";
import type { PipelineRun, PipelineRunStatus } from "../../cicd.types.js";
import type { PipelineRunRepository } from "../pipeline-run.repository.js";

export class PrismaPipelineRunRepository implements PipelineRunRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(run: PipelineRun): Promise<PipelineRun> {
    const created = await this.prisma.pipelineRun.create({
      data: {
        id: run.id,
        workspaceId: run.workspaceId,
        pipelineId: run.pipelineId,
        commitId: run.commitId,
        status: run.status,
        startedAt: new Date(run.startedAt),
        finishedAt: run.finishedAt ? new Date(run.finishedAt) : null,
        durationMs: run.durationMs,
        triggeredByUserId: run.triggeredByUserId,
        externalRunId: run.externalRunId,
      },
    });

    return this.mapToDomain(created);
  }

  async findById(workspaceId: string, id: string): Promise<PipelineRun | null> {
    const found = await this.prisma.pipelineRun.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    return found ? this.mapToDomain(found) : null;
  }

  async findByExternalRunId(
    pipelineId: string,
    externalRunId: string,
  ): Promise<PipelineRun | null> {
    const found = await this.prisma.pipelineRun.findFirst({
      where: {
        pipelineId,
        externalRunId,
      },
    });

    return found ? this.mapToDomain(found) : null;
  }

  async findByPipeline(
    workspaceId: string,
    pipelineId: string,
  ): Promise<PipelineRun[]> {
    const records = await this.prisma.pipelineRun.findMany({
      where: {
        workspaceId,
        pipelineId,
      },
      orderBy: { startedAt: "desc" },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findByCommit(
    workspaceId: string,
    commitId: string,
  ): Promise<PipelineRun[]> {
    const records = await this.prisma.pipelineRun.findMany({
      where: {
        workspaceId,
        commitId,
      },
      orderBy: { startedAt: "desc" },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findByStatus(
    workspaceId: string,
    status: PipelineRunStatus,
  ): Promise<PipelineRun[]> {
    const records = await this.prisma.pipelineRun.findMany({
      where: {
        workspaceId,
        status,
      },
      orderBy: { startedAt: "desc" },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async updateStatus(
    workspaceId: string,
    id: string,
    status: PipelineRunStatus,
    finishedAt?: string | null,
    durationMs?: number | null,
  ): Promise<PipelineRun | null> {
    const existing = await this.findById(workspaceId, id);
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.pipelineRun.update({
      where: { id },
      data: {
        status,
        ...(finishedAt !== undefined && {
          finishedAt: finishedAt ? new Date(finishedAt) : null,
        }),
        ...(durationMs !== undefined && { durationMs }),
      },
    });

    return this.mapToDomain(updated);
  }

  private mapToDomain(raw: any): PipelineRun {
    return {
      id: raw.id,
      workspaceId: raw.workspaceId,
      pipelineId: raw.pipelineId,
      commitId: raw.commitId,
      status: raw.status as PipelineRunStatus,
      startedAt: raw.startedAt.toISOString(),
      finishedAt: raw.finishedAt ? raw.finishedAt.toISOString() : null,
      durationMs: raw.durationMs,
      triggeredByUserId: raw.triggeredByUserId,
      externalRunId: raw.externalRunId,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    };
  }
}

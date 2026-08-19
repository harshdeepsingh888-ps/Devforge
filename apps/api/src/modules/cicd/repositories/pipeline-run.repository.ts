import type { PipelineRun, PipelineRunStatus } from "../cicd.types.js";

export interface PipelineRunRepository {
  create(run: PipelineRun): Promise<PipelineRun>;

  findById(workspaceId: string, id: string): Promise<PipelineRun | null>;

  findByExternalRunId(
    pipelineId: string,
    externalRunId: string,
  ): Promise<PipelineRun | null>;

  findByPipeline(
    workspaceId: string,
    pipelineId: string,
  ): Promise<PipelineRun[]>;

  findByCommit(
    workspaceId: string,
    commitId: string,
  ): Promise<PipelineRun[]>;

  findByStatus(
    workspaceId: string,
    status: PipelineRunStatus,
  ): Promise<PipelineRun[]>;

  updateStatus(
    workspaceId: string,
    id: string,
    status: PipelineRunStatus,
    finishedAt?: string | null,
    durationMs?: number | null,
  ): Promise<PipelineRun | null>;
}

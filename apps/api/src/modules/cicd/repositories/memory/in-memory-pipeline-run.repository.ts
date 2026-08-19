import type { PipelineRun, PipelineRunStatus } from "../../cicd.types.js";
import type { PipelineRunRepository } from "../pipeline-run.repository.js";

export class InMemoryPipelineRunRepository implements PipelineRunRepository {
  private readonly runs = new Map<string, PipelineRun>();

  async create(run: PipelineRun): Promise<PipelineRun> {
    this.runs.set(run.id, { ...run });
    return { ...run };
  }

  async findById(workspaceId: string, id: string): Promise<PipelineRun | null> {
    const run = this.runs.get(id);
    if (!run || run.workspaceId !== workspaceId) {
      return null;
    }
    return { ...run };
  }

  async findByExternalRunId(
    pipelineId: string,
    externalRunId: string,
  ): Promise<PipelineRun | null> {
    for (const r of this.runs.values()) {
      if (r.pipelineId === pipelineId && r.externalRunId === externalRunId) {
        return { ...r };
      }
    }
    return null;
  }

  async findByPipeline(
    workspaceId: string,
    pipelineId: string,
  ): Promise<PipelineRun[]> {
    const results: PipelineRun[] = [];
    for (const r of this.runs.values()) {
      if (r.workspaceId === workspaceId && r.pipelineId === pipelineId) {
        results.push({ ...r });
      }
    }
    return results;
  }

  async findByCommit(
    workspaceId: string,
    commitId: string,
  ): Promise<PipelineRun[]> {
    const results: PipelineRun[] = [];
    for (const r of this.runs.values()) {
      if (r.workspaceId === workspaceId && r.commitId === commitId) {
        results.push({ ...r });
      }
    }
    return results;
  }

  async findByStatus(
    workspaceId: string,
    status: PipelineRunStatus,
  ): Promise<PipelineRun[]> {
    const results: PipelineRun[] = [];
    for (const r of this.runs.values()) {
      if (r.workspaceId === workspaceId && r.status === status) {
        results.push({ ...r });
      }
    }
    return results;
  }

  async updateStatus(
    workspaceId: string,
    id: string,
    status: PipelineRunStatus,
    finishedAt?: string | null,
    durationMs?: number | null,
  ): Promise<PipelineRun | null> {
    const run = await this.findById(workspaceId, id);
    if (!run) return null;

    const updated: PipelineRun = {
      ...run,
      status,
      finishedAt: finishedAt !== undefined ? finishedAt : run.finishedAt,
      durationMs: durationMs !== undefined ? durationMs : run.durationMs,
      updatedAt: new Date().toISOString(),
    };

    this.runs.set(id, updated);
    return { ...updated };
  }
}

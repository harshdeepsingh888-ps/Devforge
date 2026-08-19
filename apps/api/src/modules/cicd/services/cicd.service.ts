import { randomUUID } from "node:crypto";
import type { CommitRepository } from "../../git/repositories/commit.repository.js";
import type { GitLinkRepository } from "../../git/repositories/git-link.repository.js";
import type { ProjectRepository } from "../../projects/project.repository.js";
import {
  CicdTenantMismatchError,
  DuplicatePipelineError,
  DuplicatePipelineRunError,
  PipelineNotFoundError,
  PipelineRunNotFoundError,
  PipelineRunNotSuccessfulError,
} from "../cicd.errors.js";
import type {
  BuildLog,
  CreateBuildLogInput,
  CreatePipelineInput,
  Deployment,
  IngestPipelineRunInput,
  Pipeline,
  PipelineRun,
  PipelineRunStatus,
  PipelineRunTrace,
  RecordDeploymentInput,
} from "../cicd.types.js";
import type { BuildLogRepository } from "../repositories/build-log.repository.js";
import type { DeploymentRepository } from "../repositories/deployment.repository.js";
import type { PipelineRunRepository } from "../repositories/pipeline-run.repository.js";
import type { PipelineRepository } from "../repositories/pipeline.repository.js";

export class CicdService {
  constructor(
    private readonly pipelineRepository: PipelineRepository,
    private readonly pipelineRunRepository: PipelineRunRepository,
    private readonly buildLogRepository: BuildLogRepository,
    private readonly deploymentRepository: DeploymentRepository,
    private readonly commitRepository: CommitRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly gitLinkRepository?: GitLinkRepository,
  ) {}

  async createPipeline(input: CreatePipelineInput): Promise<Pipeline> {
    const project = await this.projectRepository.findById(
      input.workspaceId,
      input.projectId,
    );
    if (!project) {
      throw new CicdTenantMismatchError("Project not found in this workspace.");
    }

    const existing = await this.pipelineRepository.findByExternalId(
      input.workspaceId,
      input.externalId,
    );
    if (existing) {
      throw new DuplicatePipelineError();
    }

    const pipeline: Pipeline = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      provider: input.provider ?? "GITHUB_ACTIONS",
      name: input.name,
      externalId: input.externalId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.pipelineRepository.create(pipeline);
  }

  async findPipelineById(
    workspaceId: string,
    id: string,
  ): Promise<Pipeline | null> {
    return this.pipelineRepository.findById(workspaceId, id);
  }

  async listPipelines(
    workspaceId: string,
    projectId?: string | null,
  ): Promise<Pipeline[]> {
    return this.pipelineRepository.findByWorkspace(workspaceId, projectId);
  }

  async ingestPipelineRun(
    input: IngestPipelineRunInput,
  ): Promise<PipelineRun> {
    const pipeline = await this.pipelineRepository.findById(
      input.workspaceId,
      input.pipelineId,
    );
    if (!pipeline) {
      throw new PipelineNotFoundError();
    }

    const commit = await this.commitRepository.findById(
      input.workspaceId,
      input.commitId,
    );
    if (!commit) {
      throw new CicdTenantMismatchError("Commit not found in this workspace.");
    }

    const existing = await this.pipelineRunRepository.findByExternalRunId(
      input.pipelineId,
      input.externalRunId,
    );
    if (existing) {
      throw new DuplicatePipelineRunError();
    }

    const startedAt = input.startedAt ?? new Date().toISOString();
    const finishedAt = input.finishedAt ?? null;
    let durationMs: number | null = input.durationMs ?? null;

    if (!durationMs && finishedAt) {
      durationMs =
        new Date(finishedAt).getTime() - new Date(startedAt).getTime();
    }

    const run: PipelineRun = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      pipelineId: input.pipelineId,
      commitId: input.commitId,
      status: input.status ?? "PENDING",
      startedAt,
      finishedAt,
      durationMs,
      triggeredByUserId: input.triggeredByUserId ?? null,
      externalRunId: input.externalRunId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.pipelineRunRepository.create(run);
  }

  async updatePipelineRunStatus(
    workspaceId: string,
    runId: string,
    status: PipelineRunStatus,
    finishedAtInput?: string | null,
  ): Promise<PipelineRun> {
    const run = await this.pipelineRunRepository.findById(workspaceId, runId);
    if (!run) {
      throw new PipelineRunNotFoundError();
    }

    const finishedAt =
      finishedAtInput !== undefined
        ? finishedAtInput
        : status === "SUCCESS" || status === "FAILED" || status === "CANCELED"
          ? new Date().toISOString()
          : null;

    let durationMs = run.durationMs;
    if (finishedAt && run.startedAt) {
      durationMs =
        new Date(finishedAt).getTime() - new Date(run.startedAt).getTime();
    }

    const updated = await this.pipelineRunRepository.updateStatus(
      workspaceId,
      runId,
      status,
      finishedAt,
      durationMs,
    );

    if (!updated) {
      throw new PipelineRunNotFoundError();
    }

    return updated;
  }

  async addBuildLog(input: CreateBuildLogInput): Promise<BuildLog> {
    const run = await this.pipelineRunRepository.findById(
      input.workspaceId,
      input.pipelineRunId,
    );
    if (!run) {
      throw new PipelineRunNotFoundError();
    }

    const buildLog: BuildLog = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      pipelineRunId: input.pipelineRunId,
      log: input.log,
      createdAt: new Date().toISOString(),
    };

    return this.buildLogRepository.create(buildLog);
  }

  async recordDeployment(input: RecordDeploymentInput): Promise<Deployment> {
    const run = await this.pipelineRunRepository.findById(
      input.workspaceId,
      input.pipelineRunId,
    );
    if (!run) {
      throw new PipelineRunNotFoundError();
    }

    if (run.status !== "SUCCESS") {
      throw new PipelineRunNotSuccessfulError();
    }

    const deployment: Deployment = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      pipelineRunId: input.pipelineRunId,
      environment: input.environment,
      status: input.status ?? "DEPLOYED",
      deployedAt: input.deployedAt ?? new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    return this.deploymentRepository.create(deployment);
  }

  async getPipelineRunTrace(
    workspaceId: string,
    runId: string,
  ): Promise<PipelineRunTrace> {
    const run = await this.pipelineRunRepository.findById(workspaceId, runId);
    if (!run) {
      throw new PipelineRunNotFoundError();
    }

    const pipeline = await this.pipelineRepository.findById(
      workspaceId,
      run.pipelineId,
    );
    if (!pipeline) {
      throw new PipelineNotFoundError();
    }

    const buildLogs = await this.buildLogRepository.findByPipelineRun(
      workspaceId,
      runId,
    );

    const deployments = await this.deploymentRepository.findByPipelineRun(
      workspaceId,
      runId,
    );

    return {
      run,
      pipeline,
      commitId: run.commitId,
      buildLogs,
      deployments,
    };
  }

  async listRunsForPipeline(
    workspaceId: string,
    pipelineId: string,
  ): Promise<PipelineRun[]> {
    const pipeline = await this.pipelineRepository.findById(
      workspaceId,
      pipelineId,
    );
    if (!pipeline) {
      throw new PipelineNotFoundError();
    }

    return this.pipelineRunRepository.findByPipeline(workspaceId, pipelineId);
  }

  async getWorkItemBuilds(
    workspaceId: string,
    workItemId: string,
  ): Promise<PipelineRun[]> {
    if (!this.gitLinkRepository) {
      return [];
    }

    const commitLinks = await this.gitLinkRepository.getCommitsForWorkItem(
      workItemId,
      workspaceId,
    );

    const runs: PipelineRun[] = [];
    for (const link of commitLinks) {
      const commitRuns = await this.pipelineRunRepository.findByCommit(
        workspaceId,
        link.commitId,
      );
      runs.push(...commitRuns);
    }

    return runs;
  }

  async getCommitDeployments(
    workspaceId: string,
    commitId: string,
  ): Promise<Deployment[]> {
    return this.deploymentRepository.findByCommit(workspaceId, commitId);
  }

  async getFailedPipelineRuns(
    workspaceId: string,
  ): Promise<PipelineRun[]> {
    return this.pipelineRunRepository.findByStatus(workspaceId, "FAILED");
  }

  async getDoraMetrics(workspaceId: string): Promise<{
    deploymentFrequency: number;
    leadTimeMsAvg: number | null;
  }> {
    const failedRuns = await this.pipelineRunRepository.findByStatus(
      workspaceId,
      "FAILED",
    );
    const successfulRuns = await this.pipelineRunRepository.findByStatus(
      workspaceId,
      "SUCCESS",
    );

    let totalDurationMs = 0;
    let countedRuns = 0;

    for (const r of [...failedRuns, ...successfulRuns]) {
      if (r.durationMs !== null) {
        totalDurationMs += r.durationMs;
        countedRuns++;
      }
    }

    const leadTimeMsAvg =
      countedRuns > 0 ? Math.round(totalDurationMs / countedRuns) : null;

    return {
      deploymentFrequency: successfulRuns.length,
      leadTimeMsAvg,
    };
  }
}

import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryCommitRepository } from "../../git/repositories/memory/in-memory-commit.repository.js";
import { InMemoryProjectRepository } from "../../projects/project.repository.js";
import {
  CicdTenantMismatchError,
  DuplicatePipelineRunError,
  PipelineNotFoundError,
  PipelineRunNotFoundError,
  PipelineRunNotSuccessfulError,
} from "../cicd.errors.js";
import { InMemoryBuildLogRepository } from "../repositories/memory/in-memory-build-log.repository.js";
import { InMemoryDeploymentRepository } from "../repositories/memory/in-memory-deployment.repository.js";
import { InMemoryPipelineRunRepository } from "../repositories/memory/in-memory-pipeline-run.repository.js";
import { InMemoryPipelineRepository } from "../repositories/memory/in-memory-pipeline.repository.js";
import { CicdService } from "./cicd.service.js";

function setupService() {
  const pipelineRepo = new InMemoryPipelineRepository();
  const runRepo = new InMemoryPipelineRunRepository();
  const logRepo = new InMemoryBuildLogRepository();
  const deployRepo = new InMemoryDeploymentRepository();
  const commitRepo = new InMemoryCommitRepository();
  const projectRepo = new InMemoryProjectRepository();

  const service = new CicdService(
    pipelineRepo,
    runRepo,
    logRepo,
    deployRepo,
    commitRepo,
    projectRepo,
  );

  return {
    service,
    pipelineRepo,
    runRepo,
    logRepo,
    deployRepo,
    commitRepo,
    projectRepo,
  };
}

test("CicdService: Pipeline Creation & Multi-Tenant Retrieval", async () => {
  const { service, projectRepo } = setupService();

  const project = await projectRepo.create({
    workspaceId: "ws-1",
    name: "API Service",
  });

  const pipeline = await service.createPipeline({
    workspaceId: "ws-1",
    projectId: project.id,
    provider: "GITHUB_ACTIONS",
    name: "CI Build & Test",
    externalId: "pipe-100",
  });

  assert.equal(pipeline.name, "CI Build & Test");
  assert.equal(pipeline.workspaceId, "ws-1");

  const found = await service.findPipelineById("ws-1", pipeline.id);
  assert.notEqual(found, null);
  assert.equal(found?.id, pipeline.id);

  // Tenant isolation: querying from another workspace returns null
  const idor = await service.findPipelineById("ws-2", pipeline.id);
  assert.equal(idor, null);
});

test("CicdService: PipelineRun Ingestion, Duration Calculation & Deduplication", async () => {
  const { service, projectRepo, commitRepo } = setupService();

  const project = await projectRepo.create({
    workspaceId: "ws-1",
    name: "API Service",
  });

  const pipeline = await service.createPipeline({
    workspaceId: "ws-1",
    projectId: project.id,
    name: "CI Build & Test",
    externalId: "pipe-100",
  });

  const commit = await commitRepo.create({
    id: "commit-1",
    workspaceId: "ws-1",
    repositoryId: "repo-1",
    externalId: "sha-abc",
    message: "feat: add user auth",
    authorName: "Alice",
    authorEmail: "alice@example.com",
    committedAt: new Date().toISOString(),
    url: "https://github.com/org/repo/commit/sha-abc",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const startedAt = new Date(Date.now() - 5000).toISOString();
  const finishedAt = new Date().toISOString();

  const run = await service.ingestPipelineRun({
    workspaceId: "ws-1",
    pipelineId: pipeline.id,
    commitId: commit.id,
    status: "SUCCESS",
    startedAt,
    finishedAt,
    externalRunId: "run-1001",
  });

  assert.equal(run.externalRunId, "run-1001");
  assert.equal(run.status, "SUCCESS");
  assert.ok((run.durationMs ?? 0) >= 4000);

  // Duplicate run ingestion for same pipeline & externalRunId must fail
  await assert.rejects(
    async () => {
      await service.ingestPipelineRun({
        workspaceId: "ws-1",
        pipelineId: pipeline.id,
        commitId: commit.id,
        status: "RUNNING",
        externalRunId: "run-1001",
      });
    },
    (err: unknown) => err instanceof DuplicatePipelineRunError,
  );
});

test("CicdService: Deployment Enforcement (Requires SUCCESS status)", async () => {
  const { service, projectRepo, commitRepo } = setupService();

  const project = await projectRepo.create({
    workspaceId: "ws-1",
    name: "API Service",
  });

  const pipeline = await service.createPipeline({
    workspaceId: "ws-1",
    projectId: project.id,
    name: "CI Build & Test",
    externalId: "pipe-100",
  });

  const commit = await commitRepo.create({
    id: "commit-1",
    workspaceId: "ws-1",
    repositoryId: "repo-1",
    externalId: "sha-abc",
    message: "feat: add user auth",
    authorName: "Alice",
    authorEmail: "alice@example.com",
    committedAt: new Date().toISOString(),
    url: "https://github.com/org/repo/commit/sha-abc",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const failedRun = await service.ingestPipelineRun({
    workspaceId: "ws-1",
    pipelineId: pipeline.id,
    commitId: commit.id,
    status: "FAILED",
    externalRunId: "run-failed-1",
  });

  // Attempting deployment on a FAILED run must throw PipelineRunNotSuccessfulError
  await assert.rejects(
    async () => {
      await service.recordDeployment({
        workspaceId: "ws-1",
        pipelineRunId: failedRun.id,
        environment: "PROD",
      });
    },
    (err: unknown) => err instanceof PipelineRunNotSuccessfulError,
  );

  // Updating status to SUCCESS allows deployment
  const updatedRun = await service.updatePipelineRunStatus(
    "ws-1",
    failedRun.id,
    "SUCCESS",
  );
  assert.equal(updatedRun.status, "SUCCESS");

  const deployment = await service.recordDeployment({
    workspaceId: "ws-1",
    pipelineRunId: failedRun.id,
    environment: "PROD",
  });

  assert.equal(deployment.environment, "PROD");
  assert.equal(deployment.status, "DEPLOYED");
});

test("CicdService: Traceability Querying & DORA Metrics", async () => {
  const { service, projectRepo, commitRepo } = setupService();

  const project = await projectRepo.create({
    workspaceId: "ws-1",
    name: "API Service",
  });

  const pipeline = await service.createPipeline({
    workspaceId: "ws-1",
    projectId: project.id,
    name: "CI Build & Test",
    externalId: "pipe-100",
  });

  const commit = await commitRepo.create({
    id: "commit-1",
    workspaceId: "ws-1",
    repositoryId: "repo-1",
    externalId: "sha-abc",
    message: "feat: add user auth",
    authorName: "Alice",
    authorEmail: "alice@example.com",
    committedAt: new Date().toISOString(),
    url: "https://github.com/org/repo/commit/sha-abc",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const run = await service.ingestPipelineRun({
    workspaceId: "ws-1",
    pipelineId: pipeline.id,
    commitId: commit.id,
    status: "SUCCESS",
    startedAt: new Date(Date.now() - 10000).toISOString(),
    finishedAt: new Date().toISOString(),
    externalRunId: "run-trace-1",
  });

  await service.addBuildLog({
    workspaceId: "ws-1",
    pipelineRunId: run.id,
    log: "Step 1: Compile TS\nStep 2: Test PASS",
  });

  await service.recordDeployment({
    workspaceId: "ws-1",
    pipelineRunId: run.id,
    environment: "STAGING",
  });

  const trace = await service.getPipelineRunTrace("ws-1", run.id);
  assert.equal(trace.run.id, run.id);
  assert.equal(trace.pipeline.id, pipeline.id);
  assert.equal(trace.buildLogs.length, 1);
  assert.equal(trace.deployments.length, 1);

  const dora = await service.getDoraMetrics("ws-1");
  assert.equal(dora.deploymentFrequency, 1);
  assert.ok(dora.leadTimeMsAvg !== null);
});

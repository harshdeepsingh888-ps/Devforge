import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../../app.js";
import { JwtAccessTokenService } from "../auth/security/jwt.service.js";

async function setupApp() {
  const jwtService = new JwtAccessTokenService({
    secret: "devforge-e2e-test-jwt-signing-secret-key-32bytes",
    issuer: "devforge",
    audience: "devforge-api",
    expiresInSeconds: 900,
  });

  const app = buildApp({
    accessTokenService: jwtService,
  });

  const token = await jwtService.issue({
    userId: "user-e2e-cicd-1",
    sessionId: "session-e2e-cicd-1",
  });

  return { app, token };
}

test("CI/CD E2E: Pipeline Creation, Run Ingestion, Deployment Gating & Full Trace Chain", async () => {
  const { app, token } = await setupApp();

  // 1. Create Workspace
  const wsRes = await app.inject({
    method: "POST",
    url: "/api/workspaces",
    headers: { authorization: `Bearer ${token}` },
    payload: { name: "CI/CD Pipeline Workspace" },
  });
  assert.equal(wsRes.statusCode, 201);
  const workspaceId = wsRes.json().data.id;

  // 2. Create Project
  const projRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/projects`,
    headers: { authorization: `Bearer ${token}` },
    payload: { name: "Backend Platform" },
  });
  assert.equal(projRes.statusCode, 201);
  const projectId = projRes.json().data.id;

  // 3. Create Git Repository & Commit
  const repoRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/repositories`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: "backend-api",
      provider: "GITHUB",
      externalId: "repo-cicd-100",
      url: "https://github.com/org/backend-api",
    },
  });
  assert.equal(repoRes.statusCode, 201);
  const repositoryId = repoRes.json().data.id;

  const commitRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/repositories/${repositoryId}/commits`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      externalId: "sha-cicd-999",
      message: "feat(auth): add OAuth2 provider integration",
      authorName: "Dev",
      authorEmail: "dev@example.com",
      committedAt: new Date().toISOString(),
      url: "https://github.com/org/backend-api/commit/sha-cicd-999",
    },
  });
  assert.equal(commitRes.statusCode, 201);
  const commitId = commitRes.json().data.id;

  // 4. Create Pipeline
  const pipeRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/pipelines`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      projectId,
      provider: "GITHUB_ACTIONS",
      name: "CI/CD Build & Deployment",
      externalId: "workflow-main.yml",
    },
  });
  assert.equal(pipeRes.statusCode, 201);
  const pipeline = pipeRes.json().data;

  // 5. Ingest PENDING Pipeline Run
  const runRes1 = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/pipelines/${pipeline.id}/runs`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      commitId,
      status: "RUNNING",
      externalRunId: "job-run-101",
    },
  });
  assert.equal(runRes1.statusCode, 201);
  const runningRun = runRes1.json().data;

  // 6. Deployment Gating Rule: Deployment must FAIL on RUNNING run (409 Conflict)
  const invalidDeployRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/runs/${runningRun.id}/deploy`,
    headers: { authorization: `Bearer ${token}` },
    payload: { environment: "PROD" },
  });
  assert.equal(invalidDeployRes.statusCode, 409);

  // 7. Ingest SUCCESS Pipeline Run
  const runRes2 = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/pipelines/${pipeline.id}/runs`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      commitId,
      status: "SUCCESS",
      startedAt: new Date(Date.now() - 10000).toISOString(),
      finishedAt: new Date().toISOString(),
      externalRunId: "job-run-102",
    },
  });
  assert.equal(runRes2.statusCode, 201);
  const successfulRun = runRes2.json().data;

  // 8. Record Deployment for SUCCESS Run
  const deployRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/runs/${successfulRun.id}/deploy`,
    headers: { authorization: `Bearer ${token}` },
    payload: { environment: "PROD" },
  });
  assert.equal(deployRes.statusCode, 201);
  const deployment = deployRes.json().data;
  assert.equal(deployment.environment, "PROD");

  // 9. Get Pipeline Run Trace
  const traceRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspaceId}/runs/${successfulRun.id}`,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(traceRes.statusCode, 200);
  const trace = traceRes.json().data;

  assert.equal(trace.run.id, successfulRun.id);
  assert.equal(trace.pipeline.id, pipeline.id);
  assert.equal(trace.commitId, commitId);
  assert.equal(trace.deployments.length, 1);
  assert.equal(trace.deployments[0].id, deployment.id);

  // 10. Tenant Isolation / IDOR Protection (404 Not Found on another workspace tenant)
  const idorRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/other-ws-999/runs/${successfulRun.id}`,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(idorRes.statusCode, 404);

  await app.close();
});

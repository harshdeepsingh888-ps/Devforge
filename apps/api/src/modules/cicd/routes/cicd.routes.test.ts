import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../../../app.js";
import { JwtAccessTokenService } from "../../auth/security/jwt.service.js";

const tokenService = new JwtAccessTokenService({
  secret: "devforge-default-development-jwt-signing-secret-key-32bytes",
  issuer: "devforge",
  audience: "devforge-api",
  expiresInSeconds: 900,
});

async function getAuthHeader(userId: string) {
  const token = await tokenService.issue({ userId, sessionId: `session-${userId}` });
  return { authorization: `Bearer ${token}` };
}

/**
 * Builds an app with in-memory repositories, creates a workspace and a
 * project owned by "user-owner-1", and adds a DEVELOPER and a VIEWER
 * through the public API.
 */
async function createWorkspaceWithRoles() {
  const app = buildApp({
    serverOptions: { logger: false },
    accessTokenService: tokenService,
  });

  const ownerHeader = await getAuthHeader("user-owner-1");

  const wsRes = await app.inject({
    method: "POST",
    url: "/api/workspaces",
    headers: ownerHeader,
    payload: { name: "CI/CD Role Checks" },
  });
  assert.equal(wsRes.statusCode, 201);
  const workspaceId: string = wsRes.json().data.id;

  const projectRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/projects`,
    headers: ownerHeader,
    payload: { name: "Pipeline Project" },
  });
  assert.equal(projectRes.statusCode, 201);
  const projectId: string = projectRes.json().data.id;

  for (const [userId, role] of [
    ["user-dev-1", "DEVELOPER"],
    ["user-viewer-1", "VIEWER"],
  ]) {
    const memberRes = await app.inject({
      method: "POST",
      url: `/api/workspaces/${workspaceId}/members`,
      headers: ownerHeader,
      payload: { userId, role },
    });
    assert.equal(memberRes.statusCode, 201);
  }

  return {
    app,
    workspaceId,
    projectId,
    devHeader: await getAuthHeader("user-dev-1"),
    viewerHeader: await getAuthHeader("user-viewer-1"),
  };
}

test("cicd routes: VIEWER is forbidden from every write, DEVELOPER is allowed", async (t) => {
  const { app, workspaceId, projectId, devHeader, viewerHeader } =
    await createWorkspaceWithRoles();

  t.after(async () => {
    await app.close();
  });

  const pipelinePayload = {
    projectId,
    name: "CI",
    externalId: "gha-pipeline-1",
  };

  const viewerPipelineRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/pipelines`,
    headers: viewerHeader,
    payload: pipelinePayload,
  });
  assert.equal(viewerPipelineRes.statusCode, 403);
  assert.equal(viewerPipelineRes.json().error, "FORBIDDEN");

  const devPipelineRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/pipelines`,
    headers: devHeader,
    payload: pipelinePayload,
  });
  assert.equal(devPipelineRes.statusCode, 201);
  const pipelineId: string = devPipelineRes.json().data.id;

  const viewerRunRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/pipelines/${pipelineId}/runs`,
    headers: viewerHeader,
    payload: { commitId: "commit-1", externalRunId: "run-1" },
  });
  assert.equal(viewerRunRes.statusCode, 403);

  const viewerDeployRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/runs/run-1/deploy`,
    headers: viewerHeader,
    payload: { environment: "DEV" },
  });
  assert.equal(viewerDeployRes.statusCode, 403);

  // Reads stay open to every member, including VIEWER.
  const viewerListRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspaceId}/pipelines/${pipelineId}/runs`,
    headers: viewerHeader,
  });
  assert.equal(viewerListRes.statusCode, 200);
  assert.deepEqual(viewerListRes.json().data, []);
});

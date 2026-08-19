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
    userId: "user-e2e-1",
    sessionId: "session-e2e-1",
  });

  return { app, token };
}

test("Git E2E: Repository Creation, Commit Ingestion, Auto-linking & Full Trace Chain", async () => {
  const { app, token } = await setupApp();

  // 1. Create Workspace
  const wsRes = await app.inject({
    method: "POST",
    url: "/api/workspaces",
    headers: {
      authorization: `Bearer ${token}`,
    },
    payload: {
      name: "Git Integration E2E Workspace",
    },
  });
  assert.equal(wsRes.statusCode, 201);
  const workspace = wsRes.json().data;
  const workspaceId = workspace.id;

  // 2. Create Project
  const projRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/projects`,
    headers: {
      authorization: `Bearer ${token}`,
    },
    payload: {
      name: "Core Platform",
    },
  });
  assert.equal(projRes.statusCode, 201);
  const project = projRes.json().data;
  const projectId = project.id;

  // 3. Create Workflow
  const wfRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/workflows`,
    headers: {
      authorization: `Bearer ${token}`,
    },
    payload: {
      name: "Default Workflow",
      isDefault: true,
    },
  });
  assert.equal(wfRes.statusCode, 201);

  // 4. Create WorkItem under Project
  const itemRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/projects/${projectId}/work-items`,
    headers: {
      authorization: `Bearer ${token}`,
    },
    payload: {
      type: "TASK",
      title: "Implement Commits Engine",
    },
  });
  assert.equal(itemRes.statusCode, 201);
  const workItem = itemRes.json().data;

  // 5. Create Git Repository
  const repoRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/repositories`,
    headers: {
      authorization: `Bearer ${token}`,
    },
    payload: {
      name: "devforge-api",
      provider: "GITHUB",
      externalId: "repo-999",
      url: "https://github.com/org/devforge-api",
    },
  });
  assert.equal(repoRes.statusCode, 201);
  const repository = repoRes.json().data;

  // 6. Ingest Commit referencing WorkItem ID
  const commitRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/repositories/${repository.id}/commits`,
    headers: {
      authorization: `Bearer ${token}`,
    },
    payload: {
      externalId: "b2c3d4e5f6",
      message: `feat(git): add commit traceability engine ${workItem.id}`,
      authorName: "Alice Dev",
      authorEmail: "alice@example.com",
      committedAt: new Date().toISOString(),
      url: "https://github.com/org/devforge-api/commit/b2c3d4e5f6",
    },
  });
  assert.equal(commitRes.statusCode, 201);
  const commit = commitRes.json().data;

  // 7. Get Commit Trace
  const traceRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspaceId}/commits/${commit.id}`,
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  assert.equal(traceRes.statusCode, 200);
  const trace = traceRes.json().data;

  assert.equal(trace.commit.id, commit.id);
  assert.equal(trace.workItems.length, 1);
  assert.equal(trace.workItems[0].id, workItem.id);

  // 8. Verify IDOR Protection (404 on invalid/other workspace tenant)
  const idorRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/other-ws-999/commits/${commit.id}`,
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  assert.equal(idorRes.statusCode, 404);

  await app.close();
});

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
 * Builds an app with in-memory repositories, creates a workspace owned by
 * "user-owner-1", and adds a DEVELOPER and a VIEWER through the public API.
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
    payload: { name: "Git Role Checks" },
  });
  assert.equal(wsRes.statusCode, 201);
  const workspaceId: string = wsRes.json().data.id;

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
    devHeader: await getAuthHeader("user-dev-1"),
    viewerHeader: await getAuthHeader("user-viewer-1"),
  };
}

test("git routes: VIEWER is forbidden from every write, DEVELOPER is allowed", async (t) => {
  const { app, workspaceId, devHeader, viewerHeader } = await createWorkspaceWithRoles();

  t.after(async () => {
    await app.close();
  });

  const repositoryPayload = {
    name: "devforge",
    externalId: "gh-repo-1",
    url: "https://github.com/example/devforge",
  };

  const viewerRepoRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/repositories`,
    headers: viewerHeader,
    payload: repositoryPayload,
  });
  assert.equal(viewerRepoRes.statusCode, 403);
  assert.equal(viewerRepoRes.json().error, "FORBIDDEN");

  const devRepoRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/repositories`,
    headers: devHeader,
    payload: repositoryPayload,
  });
  assert.equal(devRepoRes.statusCode, 201);
  const repositoryId: string = devRepoRes.json().data.id;

  const commitPayload = {
    externalId: "abc123",
    message: "chore: initial commit",
    authorName: "Dev One",
    authorEmail: "dev@example.com",
    committedAt: "2026-10-18T10:00:00.000Z",
    url: "https://github.com/example/devforge/commit/abc123",
  };

  const viewerCommitRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/repositories/${repositoryId}/commits`,
    headers: viewerHeader,
    payload: commitPayload,
  });
  assert.equal(viewerCommitRes.statusCode, 403);

  const devCommitRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/repositories/${repositoryId}/commits`,
    headers: devHeader,
    payload: commitPayload,
  });
  assert.equal(devCommitRes.statusCode, 201);
  const commitId: string = devCommitRes.json().data.id;

  const viewerLinkWorkItemRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/commits/${commitId}/link/work-items`,
    headers: viewerHeader,
    payload: { workItemId: "work-item-1" },
  });
  assert.equal(viewerLinkWorkItemRes.statusCode, 403);

  const viewerLinkAdrRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/commits/${commitId}/link/adrs`,
    headers: viewerHeader,
    payload: { adrId: "adr-1" },
  });
  assert.equal(viewerLinkAdrRes.statusCode, 403);

  // Reads stay open to every member, including VIEWER.
  const viewerTraceRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspaceId}/commits/${commitId}`,
    headers: viewerHeader,
  });
  assert.equal(viewerTraceRes.statusCode, 200);
});

import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../../../app.js";
import { InMemoryWorkspaceRepository } from "../repositories/memory/in-memory-workspace.repository.js";
import { WorkspaceService } from "../services/workspace.service.js";
import { JwtAccessTokenService } from "../../auth/security/jwt.service.js";

const tokenService = new JwtAccessTokenService({
  secret: "devforge-default-development-jwt-signing-secret-key-32bytes",
  issuer: "devforge",
  audience: "devforge-api",
  expiresInSeconds: 900,
});

async function getAuthHeader(userId: string) {
  const token = await tokenService.issue({ userId, sessionId: "session-1" });
  return { authorization: `Bearer ${token}` };
}

test("POST /api/workspaces returns 401 when unauthenticated", async (t) => {
  const app = buildApp({
    serverOptions: { logger: false },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/workspaces",
    payload: { name: "DevForge" },
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, "UNAUTHORIZED");
});

test("POST /api/workspaces creates a workspace and returns 201", async (t) => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);

  const app = buildApp({
    serverOptions: { logger: false },
    workspaceRepository: repository,
    workspaceService: service,
  });

  t.after(async () => {
    await app.close();
  });

  const authHeader = await getAuthHeader("user-1");

  const response = await app.inject({
    method: "POST",
    url: "/api/workspaces",
    headers: authHeader,
    payload: { name: "DevForge Organization" },
  });

  assert.equal(response.statusCode, 201);
  const body = response.json();
  assert.equal(body.data.name, "DevForge Organization");
  assert.equal(body.data.slug, "devforge-organization");
  assert.equal(body.data.membership.userId, "user-1");
  assert.equal(body.data.membership.role, "OWNER");
});

test("POST /api/workspaces returns 409 for duplicate slug", async (t) => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);

  const app = buildApp({
    serverOptions: { logger: false },
    workspaceRepository: repository,
    workspaceService: service,
  });

  t.after(async () => {
    await app.close();
  });

  await service.createWorkspace({
    name: "DevForge",
    slug: "devforge",
    creatorUserId: "user-1",
  });

  const authHeader = await getAuthHeader("user-2");

  const response = await app.inject({
    method: "POST",
    url: "/api/workspaces",
    headers: authHeader,
    payload: { name: "DevForge Duplicate", slug: "devforge" },
  });

  assert.equal(response.statusCode, 409);
  assert.equal(response.json().error, "WORKSPACE_SLUG_ALREADY_EXISTS");
});

test("GET /api/workspaces returns workspaces for the authenticated user", async (t) => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);

  const app = buildApp({
    serverOptions: { logger: false },
    workspaceRepository: repository,
    workspaceService: service,
  });

  t.after(async () => {
    await app.close();
  });

  await service.createWorkspace({ name: "Workspace One", creatorUserId: "user-1" });
  await service.createWorkspace({ name: "Workspace Two", creatorUserId: "user-2" });

  const authHeader = await getAuthHeader("user-1");

  const response = await app.inject({
    method: "GET",
    url: "/api/workspaces",
    headers: authHeader,
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].name, "Workspace One");
});

test("GET /api/workspaces/:workspaceId returns 404 for non-members", async (t) => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);

  const app = buildApp({
    serverOptions: { logger: false },
    workspaceRepository: repository,
    workspaceService: service,
  });

  t.after(async () => {
    await app.close();
  });

  const ws = await service.createWorkspace({ name: "Private Org", creatorUserId: "owner-1" });

  const authHeader = await getAuthHeader("outsider-1");

  const response = await app.inject({
    method: "GET",
    url: `/api/workspaces/${ws.id}`,
    headers: authHeader,
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error, "WORKSPACE_NOT_FOUND");
});

test("POST /api/workspaces/:workspaceId/members adds a member when caller is OWNER", async (t) => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);

  const app = buildApp({
    serverOptions: { logger: false },
    workspaceRepository: repository,
    workspaceService: service,
  });

  t.after(async () => {
    await app.close();
  });

  const ws = await service.createWorkspace({ name: "Team Org", creatorUserId: "owner-1" });

  const authHeader = await getAuthHeader("owner-1");

  const response = await app.inject({
    method: "POST",
    url: `/api/workspaces/${ws.id}/members`,
    headers: authHeader,
    payload: { userId: "new-member-1", role: "DEVELOPER" },
  });

  assert.equal(response.statusCode, 201);
  const body = response.json();
  assert.equal(body.data.userId, "new-member-1");
  assert.equal(body.data.role, "DEVELOPER");
});

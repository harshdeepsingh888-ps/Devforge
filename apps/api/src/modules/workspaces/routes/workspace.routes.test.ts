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

test("GET /api/workspaces/:workspaceId/members returns members with public user details", async (t) => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);

  repository.setUser({
    id: "owner-1",
    displayName: "Alice Owner",
    email: "alice@example.com",
    avatarUrl: null,
  });

  const app = buildApp({
    serverOptions: { logger: false },
    workspaceRepository: repository,
    workspaceService: service,
  });

  t.after(async () => {
    await app.close();
  });

  const ws = await service.createWorkspace({ name: "Members Org", creatorUserId: "owner-1" });
  const authHeader = await getAuthHeader("owner-1");

  const response = await app.inject({
    method: "GET",
    url: `/api/workspaces/${ws.id}/members`,
    headers: authHeader,
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].userId, "owner-1");
  assert.equal(body.data[0].user.displayName, "Alice Owner");
  assert.equal(body.data[0].user.email, "alice@example.com");
  assert.equal(body.data[0].user.passwordHash, undefined);
});

test("GET /api/workspaces/:workspaceId/members returns 404 for non-members", async (t) => {
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
    url: `/api/workspaces/${ws.id}/members`,
    headers: authHeader,
  });

  assert.equal(response.statusCode, 404);
});

test("POST and GET /api/workspaces/:workspaceId/teams creates and lists teams within workspace", async (t) => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);
  const teamRepo = new (await import("../repositories/memory/in-memory-team.repository.js")).InMemoryTeamRepository();
  const teamService = new (await import("../services/team.service.js")).TeamService(teamRepo, repository);

  const app = buildApp({
    serverOptions: { logger: false },
    workspaceRepository: repository,
    workspaceService: service,
    teamRepository: teamRepo,
    teamService,
  });

  t.after(async () => {
    await app.close();
  });

  const ws = await service.createWorkspace({ name: "Team Test Org", creatorUserId: "owner-1" });
  const authHeader = await getAuthHeader("owner-1");

  // Create team
  const createRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${ws.id}/teams`,
    headers: authHeader,
    payload: { name: "Core Engine" },
  });

  assert.equal(createRes.statusCode, 201);
  assert.equal(createRes.json().data.name, "Core Engine");

  // List teams
  const listRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${ws.id}/teams`,
    headers: authHeader,
  });

  assert.equal(listRes.statusCode, 200);
  assert.equal(listRes.json().data.length, 1);
  assert.equal(listRes.json().data[0].name, "Core Engine");
});

async function createWorkspaceWithOwner() {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);

  const app = buildApp({
    serverOptions: { logger: false },
    workspaceRepository: repository,
    workspaceService: service,
  });

  const workspace = await service.createWorkspace({
    name: "Role Checks",
    creatorUserId: "user-owner-1",
  });

  return { app, service, workspace };
}

test("POST /api/workspaces/:workspaceId/members returns 403 when an ADMIN tries to grant OWNER", async (t) => {
  const { app, service, workspace } = await createWorkspaceWithOwner();

  t.after(async () => {
    await app.close();
  });

  await service.addMember({
    workspaceId: workspace.id,
    actorUserId: "user-owner-1",
    targetUserId: "user-admin-1",
    role: "ADMIN",
  });

  const adminHeader = await getAuthHeader("user-admin-1");

  const escalationRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspace.id}/members`,
    headers: adminHeader,
    payload: { userId: "user-new-1", role: "OWNER" },
  });
  assert.equal(escalationRes.statusCode, 403);
  assert.equal(escalationRes.json().error, "FORBIDDEN");

  // The ADMIN can still add members with a non-OWNER role.
  const allowedRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspace.id}/members`,
    headers: adminHeader,
    payload: { userId: "user-new-1", role: "DEVELOPER" },
  });
  assert.equal(allowedRes.statusCode, 201);
  assert.equal(allowedRes.json().data.role, "DEVELOPER");
});

test("POST /api/workspaces/:workspaceId/teams returns 403 for DEVELOPER and VIEWER", async (t) => {
  const { app, service, workspace } = await createWorkspaceWithOwner();

  t.after(async () => {
    await app.close();
  });

  await service.addMember({
    workspaceId: workspace.id,
    actorUserId: "user-owner-1",
    targetUserId: "user-dev-1",
    role: "DEVELOPER",
  });
  await service.addMember({
    workspaceId: workspace.id,
    actorUserId: "user-owner-1",
    targetUserId: "user-viewer-1",
    role: "VIEWER",
  });

  for (const userId of ["user-dev-1", "user-viewer-1"]) {
    const res = await app.inject({
      method: "POST",
      url: `/api/workspaces/${workspace.id}/teams`,
      headers: await getAuthHeader(userId),
      payload: { name: "Platform" },
    });
    assert.equal(res.statusCode, 403, `${userId} should be forbidden`);
    assert.equal(res.json().error, "FORBIDDEN");
  }

  const listRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspace.id}/teams`,
    headers: await getAuthHeader("user-owner-1"),
  });
  assert.equal(listRes.statusCode, 200);
  assert.equal(listRes.json().data.length, 0);
});

test("POST /api/workspaces/:workspaceId/teams returns 409 for a duplicate slug", async (t) => {
  const { app, workspace } = await createWorkspaceWithOwner();

  t.after(async () => {
    await app.close();
  });

  const ownerHeader = await getAuthHeader("user-owner-1");

  const firstRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspace.id}/teams`,
    headers: ownerHeader,
    payload: { name: "Platform" },
  });
  assert.equal(firstRes.statusCode, 201);
  assert.equal(firstRes.json().data.slug, "platform");

  const duplicateRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspace.id}/teams`,
    headers: ownerHeader,
    payload: { name: "Platform Team", slug: "platform" },
  });
  assert.equal(duplicateRes.statusCode, 409);
  assert.equal(duplicateRes.json().error, "TEAM_SLUG_ALREADY_EXISTS");
});

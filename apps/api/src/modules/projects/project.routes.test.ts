import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../../app.js";
import { InMemoryProjectRepository } from "./project.repository.js";
import { InMemoryWorkspaceRepository } from "../workspaces/repositories/memory/in-memory-workspace.repository.js";
import { WorkspaceService } from "../workspaces/services/workspace.service.js";
import { JwtAccessTokenService } from "../auth/security/jwt.service.js";

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

async function createTestSetup() {
  const projectRepository = new InMemoryProjectRepository();
  const workspaceRepository = new InMemoryWorkspaceRepository();
  const workspaceService = new WorkspaceService(workspaceRepository);

  const app = buildApp({
    serverOptions: { logger: false },
    projectRepository,
    workspaceRepository,
    workspaceService,
  });

  const workspace = await workspaceService.createWorkspace({
    name: "DevForge Engineering",
    creatorUserId: "user-owner-1",
  });

  return { app, workspaceService, workspace, projectRepository };
}

test("GET /api/workspaces/:workspaceId/projects returns 401 when unauthenticated", async (t) => {
  const { app, workspace } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspace.id}/projects`,
  });

  assert.equal(response.statusCode, 401);
});

test("GET /api/workspaces/:workspaceId/projects returns 404 for non-members", async (t) => {
  const { app, workspace } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const authHeader = await getAuthHeader("outsider-user");

  const response = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspace.id}/projects`,
    headers: authHeader,
  });

  assert.equal(response.statusCode, 404);
});

test("POST and GET /api/workspaces/:workspaceId/projects creates and lists tenant projects", async (t) => {
  const { app, workspace } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const authHeader = await getAuthHeader("user-owner-1");

  const createRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspace.id}/projects`,
    headers: authHeader,
    payload: {
      name: "DevForge API Core",
      description: "Fastify backend engine",
    },
  });

  assert.equal(createRes.statusCode, 201);
  const created = createRes.json().data;
  assert.equal(created.name, "DevForge API Core");
  assert.equal(created.workspaceId, workspace.id);

  const listRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspace.id}/projects`,
    headers: authHeader,
  });

  assert.equal(listRes.statusCode, 200);
  assert.equal(listRes.json().data.length, 1);
  assert.equal(listRes.json().data[0].id, created.id);
});

test("enforces tenant isolation across multiple workspaces", async (t) => {
  const { app, workspaceService, workspace: ws1, projectRepository } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const ws2 = await workspaceService.createWorkspace({
    name: "Secondary Org",
    creatorUserId: "user-owner-2",
  });

  await projectRepository.create({
    workspaceId: ws1.id,
    name: "Workspace 1 Project",
  });

  await projectRepository.create({
    workspaceId: ws2.id,
    name: "Workspace 2 Project",
  });

  const owner1Header = await getAuthHeader("user-owner-1");

  // User 1 lists projects in Workspace 1 -> receives only Workspace 1 Project
  const ws1Res = await app.inject({
    method: "GET",
    url: `/api/workspaces/${ws1.id}/projects`,
    headers: owner1Header,
  });

  assert.equal(ws1Res.statusCode, 200);
  const ws1Data = ws1Res.json().data;
  assert.equal(ws1Data.length, 1);
  assert.equal(ws1Data[0].name, "Workspace 1 Project");

  // User 1 attempts to list projects in Workspace 2 -> 404 (not a member)
  const forbiddenRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${ws2.id}/projects`,
    headers: owner1Header,
  });

  assert.equal(forbiddenRes.statusCode, 404);
});

test("PATCH /api/workspaces/:workspaceId/projects/:projectId/status updates status within tenant", async (t) => {
  const { app, workspace, projectRepository } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const project = await projectRepository.create({
    workspaceId: workspace.id,
    name: "Project to Pause",
  });

  const authHeader = await getAuthHeader("user-owner-1");

  const patchRes = await app.inject({
    method: "PATCH",
    url: `/api/workspaces/${workspace.id}/projects/${project.id}/status`,
    headers: authHeader,
    payload: { status: "PAUSED" },
  });

  assert.equal(patchRes.statusCode, 200);
  assert.equal(patchRes.json().data.status, "PAUSED");
});

test("DELETE /api/workspaces/:workspaceId/projects/:projectId succeeds for OWNER and ADMIN", async (t) => {
  const { app, workspace, workspaceService, projectRepository } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  await workspaceService.addMember({
    workspaceId: workspace.id,
    actorUserId: "user-owner-1",
    targetUserId: "user-admin-1",
    role: "ADMIN",
  });

  const p1 = await projectRepository.create({
    workspaceId: workspace.id,
    name: "Project to delete by Owner",
  });

  const p2 = await projectRepository.create({
    workspaceId: workspace.id,
    name: "Project to delete by Admin",
  });

  const ownerHeader = await getAuthHeader("user-owner-1");
  const adminHeader = await getAuthHeader("user-admin-1");

  // Owner deletes p1 -> 204
  const delOwnerRes = await app.inject({
    method: "DELETE",
    url: `/api/workspaces/${workspace.id}/projects/${p1.id}`,
    headers: ownerHeader,
  });
  assert.equal(delOwnerRes.statusCode, 204);

  // Admin deletes p2 -> 204
  const delAdminRes = await app.inject({
    method: "DELETE",
    url: `/api/workspaces/${workspace.id}/projects/${p2.id}`,
    headers: adminHeader,
  });
  assert.equal(delAdminRes.statusCode, 204);

  // Ensure projects are no longer returned in list
  const listRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspace.id}/projects`,
    headers: ownerHeader,
  });
  assert.equal(listRes.statusCode, 200);
  assert.equal(listRes.json().data.length, 0);
});

test("DELETE /api/workspaces/:workspaceId/projects/:projectId returns 403 for DEVELOPER and VIEWER", async (t) => {
  const { app, workspace, workspaceService, projectRepository } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  await workspaceService.addMember({
    workspaceId: workspace.id,
    actorUserId: "user-owner-1",
    targetUserId: "user-dev-1",
    role: "DEVELOPER",
  });
  await workspaceService.addMember({
    workspaceId: workspace.id,
    actorUserId: "user-owner-1",
    targetUserId: "user-viewer-1",
    role: "VIEWER",
  });

  const project = await projectRepository.create({
    workspaceId: workspace.id,
    name: "Protected Project",
  });

  const devHeader = await getAuthHeader("user-dev-1");
  const viewerHeader = await getAuthHeader("user-viewer-1");

  const devRes = await app.inject({
    method: "DELETE",
    url: `/api/workspaces/${workspace.id}/projects/${project.id}`,
    headers: devHeader,
  });
  assert.equal(devRes.statusCode, 403);
  assert.equal(devRes.json().error, "FORBIDDEN");

  const viewerRes = await app.inject({
    method: "DELETE",
    url: `/api/workspaces/${workspace.id}/projects/${project.id}`,
    headers: viewerHeader,
  });
  assert.equal(viewerRes.statusCode, 403);
  assert.equal(viewerRes.json().error, "FORBIDDEN");
});

test("DELETE /api/workspaces/:workspaceId/projects/:projectId enforces cross-workspace protection and 404", async (t) => {
  const { app, workspaceService, workspace: ws1, projectRepository } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const ws2 = await workspaceService.createWorkspace({
    name: "Other Workspace",
    creatorUserId: "user-owner-2",
  });

  const ws2Project = await projectRepository.create({
    workspaceId: ws2.id,
    name: "WS2 Project",
  });

  const owner1Header = await getAuthHeader("user-owner-1");

  // Attempt to delete ws2Project from ws1 context -> 404 (does not belong to ws1)
  const crossRes = await app.inject({
    method: "DELETE",
    url: `/api/workspaces/${ws1.id}/projects/${ws2Project.id}`,
    headers: owner1Header,
  });
  assert.equal(crossRes.statusCode, 404);
  assert.equal(crossRes.json().error, "PROJECT_NOT_FOUND");

  // Attempt to delete nonexistent project -> 404
  const nonExistentRes = await app.inject({
    method: "DELETE",
    url: `/api/workspaces/${ws1.id}/projects/non-existent-id`,
    headers: owner1Header,
  });
  assert.equal(nonExistentRes.statusCode, 404);
  assert.equal(nonExistentRes.json().error, "PROJECT_NOT_FOUND");
});


test("POST /api/workspaces/:workspaceId/projects returns 403 for VIEWER and 201 for DEVELOPER", async (t) => {
  const { app, workspace, workspaceService } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  await workspaceService.addMember({
    workspaceId: workspace.id,
    actorUserId: "user-owner-1",
    targetUserId: "user-dev-1",
    role: "DEVELOPER",
  });
  await workspaceService.addMember({
    workspaceId: workspace.id,
    actorUserId: "user-owner-1",
    targetUserId: "user-viewer-1",
    role: "VIEWER",
  });

  const viewerRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspace.id}/projects`,
    headers: await getAuthHeader("user-viewer-1"),
    payload: { name: "Viewer Project" },
  });
  assert.equal(viewerRes.statusCode, 403);
  assert.equal(viewerRes.json().error, "FORBIDDEN");

  const devRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspace.id}/projects`,
    headers: await getAuthHeader("user-dev-1"),
    payload: { name: "Developer Project" },
  });
  assert.equal(devRes.statusCode, 201);
  assert.equal(devRes.json().data.name, "Developer Project");

  // The viewer's rejected request must not have created anything.
  const listRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspace.id}/projects`,
    headers: await getAuthHeader("user-viewer-1"),
  });
  assert.equal(listRes.statusCode, 200);
  assert.equal(listRes.json().data.length, 1);
});

test("PATCH /api/workspaces/:workspaceId/projects/:projectId/status requires ADMIN", async (t) => {
  const { app, workspace, workspaceService, projectRepository } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  await workspaceService.addMember({
    workspaceId: workspace.id,
    actorUserId: "user-owner-1",
    targetUserId: "user-admin-1",
    role: "ADMIN",
  });
  await workspaceService.addMember({
    workspaceId: workspace.id,
    actorUserId: "user-owner-1",
    targetUserId: "user-dev-1",
    role: "DEVELOPER",
  });
  await workspaceService.addMember({
    workspaceId: workspace.id,
    actorUserId: "user-owner-1",
    targetUserId: "user-viewer-1",
    role: "VIEWER",
  });

  const project = await projectRepository.create({
    workspaceId: workspace.id,
    name: "Status Guarded Project",
  });

  for (const userId of ["user-dev-1", "user-viewer-1"]) {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/workspaces/${workspace.id}/projects/${project.id}/status`,
      headers: await getAuthHeader(userId),
      payload: { status: "ARCHIVED" },
    });
    assert.equal(res.statusCode, 403, `${userId} should be forbidden`);
    assert.equal(res.json().error, "FORBIDDEN");
  }

  const unchanged = await projectRepository.findById(workspace.id, project.id);
  assert.equal(unchanged?.status, "ACTIVE");

  const adminRes = await app.inject({
    method: "PATCH",
    url: `/api/workspaces/${workspace.id}/projects/${project.id}/status`,
    headers: await getAuthHeader("user-admin-1"),
    payload: { status: "ARCHIVED" },
  });
  assert.equal(adminRes.statusCode, 200);
  assert.equal(adminRes.json().data.status, "ARCHIVED");
});

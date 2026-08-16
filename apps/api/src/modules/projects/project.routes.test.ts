import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../../app.js";
import { InMemoryProjectRepository } from "./project.repository.js";
import { InMemoryWorkspaceRepository } from "../workspaces/repositories/memory/in-memory-workspace.repository.js";
import { WorkspaceService } from "../workspaces/services/workspace.service.js";

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

  const response = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspace.id}/projects`,
    headers: { "x-user-id": "outsider-user" },
  });

  assert.equal(response.statusCode, 404);
});

test("POST and GET /api/workspaces/:workspaceId/projects creates and lists tenant projects", async (t) => {
  const { app, workspace } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const createRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspace.id}/projects`,
    headers: { "x-user-id": "user-owner-1" },
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
    headers: { "x-user-id": "user-owner-1" },
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

  // User 1 lists projects in Workspace 1 -> receives only Workspace 1 Project
  const ws1Res = await app.inject({
    method: "GET",
    url: `/api/workspaces/${ws1.id}/projects`,
    headers: { "x-user-id": "user-owner-1" },
  });

  assert.equal(ws1Res.statusCode, 200);
  const ws1Data = ws1Res.json().data;
  assert.equal(ws1Data.length, 1);
  assert.equal(ws1Data[0].name, "Workspace 1 Project");

  // User 1 attempts to list projects in Workspace 2 -> 404 (not a member)
  const forbiddenRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${ws2.id}/projects`,
    headers: { "x-user-id": "user-owner-1" },
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

  const patchRes = await app.inject({
    method: "PATCH",
    url: `/api/workspaces/${workspace.id}/projects/${project.id}/status`,
    headers: { "x-user-id": "user-owner-1" },
    payload: { status: "PAUSED" },
  });

  assert.equal(patchRes.statusCode, 200);
  assert.equal(patchRes.json().data.status, "PAUSED");
});
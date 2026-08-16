import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";

import { InMemoryWorkspaceRepository } from "../repositories/memory/in-memory-workspace.repository.js";
import { WorkspaceService } from "../services/workspace.service.js";
import {
  workspaceTenantPlugin,
  createWorkspaceTenantGuard,
  requireWorkspaceRole,
} from "./workspace-tenant.plugin.js";

test("requireWorkspaceMember blocks unauthenticated requests with 401", async (t) => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);
  const app = Fastify();

  await app.register(workspaceTenantPlugin, { workspaceService: service });
  const requireMember = createWorkspaceTenantGuard(service);

  app.get("/workspaces/:workspaceId/test", { preHandler: requireMember }, async () => ({
    ok: true,
  }));

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/workspaces/ws-1/test",
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, "UNAUTHORIZED");
});

test("requireWorkspaceMember returns 404 for non-members", async (t) => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);
  const app = Fastify();

  await app.register(workspaceTenantPlugin, { workspaceService: service });
  const requireMember = createWorkspaceTenantGuard(service);

  const ws = await service.createWorkspace({ name: "Private Workspace", creatorUserId: "user-1" });

  app.get("/workspaces/:workspaceId/test", { preHandler: requireMember }, async (request) => ({
    workspaceName: request.workspaceContext?.name,
  }));

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: `/workspaces/${ws.id}/test`,
    headers: { "x-user-id": "outsider-user" },
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error, "WORKSPACE_NOT_FOUND");
});

test("requireWorkspaceMember populates request.workspaceContext for valid members", async (t) => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);
  const app = Fastify();

  await app.register(workspaceTenantPlugin, { workspaceService: service });
  const requireMember = createWorkspaceTenantGuard(service);

  const ws = await service.createWorkspace({ name: "DevForge Team", creatorUserId: "user-1" });

  app.get("/workspaces/:workspaceId/test", { preHandler: requireMember }, async (request) => ({
    workspaceId: request.workspaceContext?.id,
    workspaceName: request.workspaceContext?.name,
    role: request.workspaceContext?.membership.role,
  }));

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: `/workspaces/${ws.id}/test`,
    headers: { "x-user-id": "user-1" },
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.workspaceId, ws.id);
  assert.equal(body.workspaceName, "DevForge Team");
  assert.equal(body.role, "OWNER");
});

test("requireWorkspaceRole enforces role requirements (OWNER vs MEMBER)", async (t) => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);
  const app = Fastify();

  await app.register(workspaceTenantPlugin, { workspaceService: service });
  const requireMember = createWorkspaceTenantGuard(service);
  const requireOwner = requireWorkspaceRole("OWNER");

  const ws = await service.createWorkspace({ name: "DevForge Team", creatorUserId: "owner-1" });
  await service.addMember({
    workspaceId: ws.id,
    actorUserId: "owner-1",
    targetUserId: "member-1",
    role: "MEMBER",
  });

  app.delete(
    "/workspaces/:workspaceId/admin",
    { preHandler: [requireMember, requireOwner] },
    async () => ({ adminAction: "completed" }),
  );

  t.after(async () => {
    await app.close();
  });

  // Call as MEMBER -> 403 Forbidden
  const memberRes = await app.inject({
    method: "DELETE",
    url: `/workspaces/${ws.id}/admin`,
    headers: { "x-user-id": "member-1" },
  });
  assert.equal(memberRes.statusCode, 403);
  assert.equal(memberRes.json().error, "FORBIDDEN");

  // Call as OWNER -> 200 OK
  const ownerRes = await app.inject({
    method: "DELETE",
    url: `/workspaces/${ws.id}/admin`,
    headers: { "x-user-id": "owner-1" },
  });
  assert.equal(ownerRes.statusCode, 200);
  assert.equal(ownerRes.json().adminAction, "completed");
});

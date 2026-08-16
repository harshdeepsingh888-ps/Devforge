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
import { JwtAccessTokenService } from "../../auth/security/jwt.service.js";
import { authenticationPlugin } from "../../auth/plugins/authentication.plugin.js";

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

test("requireWorkspaceMember blocks unauthenticated requests with 401", async (t) => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);
  const app = Fastify();

  await app.register(authenticationPlugin, { accessTokens: tokenService });
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

  await app.register(authenticationPlugin, { accessTokens: tokenService });
  await app.register(workspaceTenantPlugin, { workspaceService: service });
  const requireMember = createWorkspaceTenantGuard(service);

  const ws = await service.createWorkspace({ name: "Private Workspace", creatorUserId: "user-1" });

  app.get("/workspaces/:workspaceId/test", { preHandler: requireMember }, async (request) => ({
    workspaceName: request.workspaceContext?.name,
  }));

  t.after(async () => {
    await app.close();
  });

  const authHeader = await getAuthHeader("outsider-user");

  const response = await app.inject({
    method: "GET",
    url: `/workspaces/${ws.id}/test`,
    headers: authHeader,
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error, "WORKSPACE_NOT_FOUND");
});

test("requireWorkspaceMember populates request.workspaceContext for valid members", async (t) => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);
  const app = Fastify();

  await app.register(authenticationPlugin, { accessTokens: tokenService });
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

  const authHeader = await getAuthHeader("user-1");

  const response = await app.inject({
    method: "GET",
    url: `/workspaces/${ws.id}/test`,
    headers: authHeader,
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.workspaceId, ws.id);
  assert.equal(body.workspaceName, "DevForge Team");
  assert.equal(body.role, "OWNER");
});

test("requireWorkspaceRole enforces role hierarchy (OWNER > ADMIN > DEVELOPER > VIEWER)", async (t) => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);
  const app = Fastify();

  await app.register(authenticationPlugin, { accessTokens: tokenService });
  await app.register(workspaceTenantPlugin, { workspaceService: service });
  const requireMember = createWorkspaceTenantGuard(service);

  const ws = await service.createWorkspace({ name: "Hierarchy Org", creatorUserId: "owner-1" });

  await service.addMember({ workspaceId: ws.id, actorUserId: "owner-1", targetUserId: "admin-1", role: "ADMIN" });
  await service.addMember({ workspaceId: ws.id, actorUserId: "owner-1", targetUserId: "dev-1", role: "DEVELOPER" });
  await service.addMember({ workspaceId: ws.id, actorUserId: "owner-1", targetUserId: "viewer-1", role: "VIEWER" });

  app.post(
    "/workspaces/:workspaceId/admin-only",
    { preHandler: [requireMember, requireWorkspaceRole("ADMIN")] },
    async () => ({ allowed: true }),
  );

  app.post(
    "/workspaces/:workspaceId/dev-only",
    { preHandler: [requireMember, requireWorkspaceRole("DEVELOPER")] },
    async () => ({ allowed: true }),
  );

  t.after(async () => {
    await app.close();
  });

  const ownerAuth = await getAuthHeader("owner-1");
  const adminAuth = await getAuthHeader("admin-1");
  const devAuth = await getAuthHeader("dev-1");
  const viewerAuth = await getAuthHeader("viewer-1");

  // ADMIN route: OWNER (200), ADMIN (200), DEVELOPER (403), VIEWER (403)
  assert.equal((await app.inject({ method: "POST", url: `/workspaces/${ws.id}/admin-only`, headers: ownerAuth })).statusCode, 200);
  assert.equal((await app.inject({ method: "POST", url: `/workspaces/${ws.id}/admin-only`, headers: adminAuth })).statusCode, 200);
  assert.equal((await app.inject({ method: "POST", url: `/workspaces/${ws.id}/admin-only`, headers: devAuth })).statusCode, 403);
  assert.equal((await app.inject({ method: "POST", url: `/workspaces/${ws.id}/admin-only`, headers: viewerAuth })).statusCode, 403);

  // DEVELOPER route: OWNER (200), ADMIN (200), DEVELOPER (200), VIEWER (403)
  assert.equal((await app.inject({ method: "POST", url: `/workspaces/${ws.id}/dev-only`, headers: ownerAuth })).statusCode, 200);
  assert.equal((await app.inject({ method: "POST", url: `/workspaces/${ws.id}/dev-only`, headers: adminAuth })).statusCode, 200);
  assert.equal((await app.inject({ method: "POST", url: `/workspaces/${ws.id}/dev-only`, headers: devAuth })).statusCode, 200);
  assert.equal((await app.inject({ method: "POST", url: `/workspaces/${ws.id}/dev-only`, headers: viewerAuth })).statusCode, 403);
});

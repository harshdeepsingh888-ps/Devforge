import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../../../app.js";
import { InMemoryUserRepository } from "../../auth/repositories/memory/in-memory-user.repository.js";
import { JwtAccessTokenService } from "../../auth/security/jwt.service.js";
import { InMemoryWorkItemRepository } from "../../work-management/repositories/memory/in-memory-work-item.repository.js";
import { InMemoryTeamRepository } from "../repositories/memory/in-memory-team.repository.js";
import { InMemoryWorkspaceRepository } from "../repositories/memory/in-memory-workspace.repository.js";
import { WorkspaceService } from "../services/workspace.service.js";

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
 * One workspace with one member per role. The in-memory workspace repository
 * is wired to the team and work item repositories so removal can be seen to
 * clean up after itself, exactly as buildApp() wires its own defaults.
 */
async function createTestSetup() {
  const teamRepository = new InMemoryTeamRepository();
  const workItemRepository = new InMemoryWorkItemRepository();
  const workspaceRepository = new InMemoryWorkspaceRepository({
    teamRepository,
    workItemRepository,
  });
  const userRepository = new InMemoryUserRepository();
  const workspaceService = new WorkspaceService(workspaceRepository);

  const app = buildApp({
    serverOptions: { logger: false },
    workspaceRepository,
    workspaceService,
    teamRepository,
    workItemRepository,
    userRepository,
  });

  const owner = await userRepository.create({
    email: "owner@example.com",
    passwordHash: "hash",
    displayName: "Owner",
  });
  const admin = await userRepository.create({
    email: "admin@example.com",
    passwordHash: "hash",
    displayName: "Admin",
  });
  const developer = await userRepository.create({
    email: "dev@example.com",
    passwordHash: "hash",
    displayName: "Developer",
  });
  const viewer = await userRepository.create({
    email: "viewer@example.com",
    passwordHash: "hash",
    displayName: "Viewer",
  });

  const workspace = await workspaceService.createWorkspace({
    name: "Members Inc",
    creatorUserId: owner.id,
  });

  for (const [user, role] of [
    [admin, "ADMIN"],
    [developer, "DEVELOPER"],
    [viewer, "VIEWER"],
  ] as const) {
    await workspaceService.addMember({
      workspaceId: workspace.id,
      actorUserId: owner.id,
      targetUserId: user.id,
      role,
    });
  }

  const memberUrl = (userId: string) =>
    `/api/workspaces/${workspace.id}/members/${userId}`;

  return {
    app,
    workspace,
    workspaceRepository,
    teamRepository,
    workItemRepository,
    users: { owner, admin, developer, viewer },
    headers: {
      owner: await getAuthHeader(owner.id),
      admin: await getAuthHeader(admin.id),
      developer: await getAuthHeader(developer.id),
      viewer: await getAuthHeader(viewer.id),
    },
    memberUrl,
  };
}

test("PATCH member role: anonymous 401, outsider 404, DEVELOPER and VIEWER 403, OWNER may set any role", async (t) => {
  const { app, users, headers, memberUrl, workspaceRepository, workspace } =
    await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const payload = { role: "ADMIN" };

  const anonymousRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.developer.id),
    payload,
  });
  assert.equal(anonymousRes.statusCode, 401);

  const outsiderRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.developer.id),
    headers: await getAuthHeader("not-a-member"),
    payload,
  });
  assert.equal(outsiderRes.statusCode, 404);

  const developerRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.viewer.id),
    headers: headers.developer,
    payload: { role: "DEVELOPER" },
  });
  assert.equal(developerRes.statusCode, 403);
  assert.equal(developerRes.json().error, "FORBIDDEN");

  const viewerRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.viewer.id),
    headers: headers.viewer,
    payload: { role: "DEVELOPER" },
  });
  assert.equal(viewerRes.statusCode, 403);

  const promoteRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.developer.id),
    headers: headers.owner,
    payload,
  });
  assert.equal(promoteRes.statusCode, 200);
  const body = promoteRes.json().data;
  assert.equal(body.userId, users.developer.id);
  assert.equal(body.workspaceId, workspace.id);
  assert.equal(body.role, "ADMIN");

  const stored = await workspaceRepository.findMembership(workspace.id, users.developer.id);
  assert.equal(stored?.role, "ADMIN");

  const grantOwnerRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.admin.id),
    headers: headers.owner,
    payload: { role: "OWNER" },
  });
  assert.equal(grantOwnerRes.statusCode, 200);
  assert.equal(grantOwnerRes.json().data.role, "OWNER");

  const demoteRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.admin.id),
    headers: headers.owner,
    payload: { role: "VIEWER" },
  });
  assert.equal(demoteRes.statusCode, 200);
  assert.equal(demoteRes.json().data.role, "VIEWER");
});

test("PATCH member role: ADMIN may set ADMIN/DEVELOPER/VIEWER but may not grant OWNER or touch an OWNER", async (t) => {
  const { app, users, headers, memberUrl } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const toViewerRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.developer.id),
    headers: headers.admin,
    payload: { role: "VIEWER" },
  });
  assert.equal(toViewerRes.statusCode, 200);
  assert.equal(toViewerRes.json().data.role, "VIEWER");

  const toAdminRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.developer.id),
    headers: headers.admin,
    payload: { role: "ADMIN" },
  });
  assert.equal(toAdminRes.statusCode, 200);
  assert.equal(toAdminRes.json().data.role, "ADMIN");

  const grantOwnerRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.viewer.id),
    headers: headers.admin,
    payload: { role: "OWNER" },
  });
  assert.equal(grantOwnerRes.statusCode, 403);
  assert.equal(grantOwnerRes.json().error, "FORBIDDEN");

  const touchOwnerRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.owner.id),
    headers: headers.admin,
    payload: { role: "ADMIN" },
  });
  assert.equal(touchOwnerRes.statusCode, 403);

  // An ADMIN confirming an OWNER's existing role is still touching an OWNER
  const reaffirmOwnerRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.owner.id),
    headers: headers.admin,
    payload: { role: "OWNER" },
  });
  assert.equal(reaffirmOwnerRes.statusCode, 403);
});

test("PATCH member role: the last OWNER cannot be demoted (409) until another OWNER exists; unknown target 404; bad role 400", async (t) => {
  const { app, users, headers, memberUrl } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const selfDemoteRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.owner.id),
    headers: headers.owner,
    payload: { role: "ADMIN" },
  });
  assert.equal(selfDemoteRes.statusCode, 409);
  assert.equal(selfDemoteRes.json().error, "WORKSPACE_OWNER_REQUIRED");

  const promoteRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.admin.id),
    headers: headers.owner,
    payload: { role: "OWNER" },
  });
  assert.equal(promoteRes.statusCode, 200);

  const secondTryRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.owner.id),
    headers: headers.owner,
    payload: { role: "ADMIN" },
  });
  assert.equal(secondTryRes.statusCode, 200);
  assert.equal(secondTryRes.json().data.role, "ADMIN");

  // Now the new OWNER is the last one again
  const newLastOwnerRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.admin.id),
    headers: headers.admin,
    payload: { role: "DEVELOPER" },
  });
  assert.equal(newLastOwnerRes.statusCode, 409);

  const unknownRes = await app.inject({
    method: "PATCH",
    url: memberUrl("nobody"),
    headers: headers.admin,
    payload: { role: "VIEWER" },
  });
  assert.equal(unknownRes.statusCode, 404);
  assert.equal(unknownRes.json().error, "WORKSPACE_MEMBERSHIP_NOT_FOUND");

  const badRoleRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.developer.id),
    headers: headers.admin,
    payload: { role: "SUPERUSER" },
  });
  assert.equal(badRoleRes.statusCode, 400);

  const extraFieldRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.developer.id),
    headers: headers.admin,
    payload: { role: "VIEWER", userId: users.owner.id },
  });
  assert.equal(extraFieldRes.statusCode, 400);
});

test("DELETE member: OWNER removes anyone; the removed member loses access; unknown target 404", async (t) => {
  const { app, workspace, users, headers, memberUrl } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const anonymousRes = await app.inject({ method: "DELETE", url: memberUrl(users.viewer.id) });
  assert.equal(anonymousRes.statusCode, 401);

  const outsiderRes = await app.inject({
    method: "DELETE",
    url: memberUrl(users.viewer.id),
    headers: await getAuthHeader("not-a-member"),
  });
  assert.equal(outsiderRes.statusCode, 404);

  const removeAdminRes = await app.inject({
    method: "DELETE",
    url: memberUrl(users.admin.id),
    headers: headers.owner,
  });
  assert.equal(removeAdminRes.statusCode, 204);
  assert.equal(removeAdminRes.body, "");

  const goneRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspace.id}`,
    headers: headers.admin,
  });
  assert.equal(goneRes.statusCode, 404);

  const listRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspace.id}/members`,
    headers: headers.owner,
  });
  const remaining = listRes.json().data.map((member: { userId: string }) => member.userId);
  assert.equal(remaining.includes(users.admin.id), false);
  assert.equal(remaining.length, 3);

  const againRes = await app.inject({
    method: "DELETE",
    url: memberUrl(users.admin.id),
    headers: headers.owner,
  });
  assert.equal(againRes.statusCode, 404);
  assert.equal(againRes.json().error, "WORKSPACE_MEMBERSHIP_NOT_FOUND");
});

test("DELETE member: ADMIN removes DEVELOPER/VIEWER only; DEVELOPER and VIEWER cannot remove others", async (t) => {
  const { app, users, headers, memberUrl } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const adminOnOwnerRes = await app.inject({
    method: "DELETE",
    url: memberUrl(users.owner.id),
    headers: headers.admin,
  });
  assert.equal(adminOnOwnerRes.statusCode, 403);
  assert.equal(adminOnOwnerRes.json().error, "FORBIDDEN");

  // Promote the developer so there is a second ADMIN to try on
  await app.inject({
    method: "PATCH",
    url: memberUrl(users.developer.id),
    headers: headers.owner,
    payload: { role: "ADMIN" },
  });
  const adminOnAdminRes = await app.inject({
    method: "DELETE",
    url: memberUrl(users.developer.id),
    headers: headers.admin,
  });
  assert.equal(adminOnAdminRes.statusCode, 403);

  await app.inject({
    method: "PATCH",
    url: memberUrl(users.developer.id),
    headers: headers.owner,
    payload: { role: "DEVELOPER" },
  });

  const developerOnViewerRes = await app.inject({
    method: "DELETE",
    url: memberUrl(users.viewer.id),
    headers: headers.developer,
  });
  assert.equal(developerOnViewerRes.statusCode, 403);

  const viewerOnDeveloperRes = await app.inject({
    method: "DELETE",
    url: memberUrl(users.developer.id),
    headers: headers.viewer,
  });
  assert.equal(viewerOnDeveloperRes.statusCode, 403);

  const adminOnViewerRes = await app.inject({
    method: "DELETE",
    url: memberUrl(users.viewer.id),
    headers: headers.admin,
  });
  assert.equal(adminOnViewerRes.statusCode, 204);

  const adminOnDeveloperRes = await app.inject({
    method: "DELETE",
    url: memberUrl(users.developer.id),
    headers: headers.admin,
  });
  assert.equal(adminOnDeveloperRes.statusCode, 204);
});

test("DELETE member: any member may leave, except the last OWNER (409)", async (t) => {
  const { app, workspace, users, headers, memberUrl } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const viewerLeavesRes = await app.inject({
    method: "DELETE",
    url: memberUrl(users.viewer.id),
    headers: headers.viewer,
  });
  assert.equal(viewerLeavesRes.statusCode, 204);

  const developerLeavesRes = await app.inject({
    method: "DELETE",
    url: memberUrl(users.developer.id),
    headers: headers.developer,
  });
  assert.equal(developerLeavesRes.statusCode, 204);

  const lastOwnerLeavesRes = await app.inject({
    method: "DELETE",
    url: memberUrl(users.owner.id),
    headers: headers.owner,
  });
  assert.equal(lastOwnerLeavesRes.statusCode, 409);
  assert.equal(lastOwnerLeavesRes.json().error, "WORKSPACE_OWNER_REQUIRED");

  const stillOwnerRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspace.id}`,
    headers: headers.owner,
  });
  assert.equal(stillOwnerRes.statusCode, 200);
  assert.equal(stillOwnerRes.json().data.membership.role, "OWNER");

  await app.inject({
    method: "PATCH",
    url: memberUrl(users.admin.id),
    headers: headers.owner,
    payload: { role: "OWNER" },
  });

  const ownerLeavesRes = await app.inject({
    method: "DELETE",
    url: memberUrl(users.owner.id),
    headers: headers.owner,
  });
  assert.equal(ownerLeavesRes.statusCode, 204);

  // The remaining OWNER is now the last one and cannot be removed by anybody
  const newLastOwnerRes = await app.inject({
    method: "DELETE",
    url: memberUrl(users.admin.id),
    headers: headers.admin,
  });
  assert.equal(newLastOwnerRes.statusCode, 409);
});

test("DELETE member clears the member's team memberships and work item assignments in that workspace only", async (t) => {
  const {
    app,
    workspace,
    users,
    headers,
    memberUrl,
    teamRepository,
    workItemRepository,
    workspaceRepository,
  } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const team = await teamRepository.create({
    workspaceId: workspace.id,
    name: "Core",
    slug: "core",
  });
  await teamRepository.addMember(team.id, users.developer.id);
  await teamRepository.addMember(team.id, users.viewer.id);

  const otherWorkspace = await workspaceRepository.create({
    name: "Elsewhere",
    slug: "elsewhere",
  });
  await workspaceRepository.addMember({
    workspaceId: otherWorkspace.id,
    userId: users.developer.id,
    role: "DEVELOPER",
  });
  const otherTeam = await teamRepository.create({
    workspaceId: otherWorkspace.id,
    name: "Other",
    slug: "other",
  });
  await teamRepository.addMember(otherTeam.id, users.developer.id);

  const baseWorkItem = {
    projectId: "project-1",
    type: "TASK" as const,
    workflowId: "workflow-1",
    reporterUserId: users.owner.id,
  };
  const mine = await workItemRepository.create({
    ...baseWorkItem,
    workspaceId: workspace.id,
    title: "Assigned to the developer",
    assigneeUserId: users.developer.id,
  });
  const theirs = await workItemRepository.create({
    ...baseWorkItem,
    workspaceId: workspace.id,
    title: "Assigned to the viewer",
    assigneeUserId: users.viewer.id,
  });
  const elsewhere = await workItemRepository.create({
    ...baseWorkItem,
    workspaceId: otherWorkspace.id,
    title: "Assigned to the developer elsewhere",
    assigneeUserId: users.developer.id,
  });

  const removeRes = await app.inject({
    method: "DELETE",
    url: memberUrl(users.developer.id),
    headers: headers.admin,
  });
  assert.equal(removeRes.statusCode, 204);

  assert.equal(await teamRepository.findMember(team.id, users.developer.id), null);
  assert.notEqual(await teamRepository.findMember(team.id, users.viewer.id), null);
  assert.notEqual(await teamRepository.findMember(otherTeam.id, users.developer.id), null);

  const mineAfter = await workItemRepository.findById(workspace.id, mine.id);
  assert.equal(mineAfter?.assigneeUserId, null);
  const theirsAfter = await workItemRepository.findById(workspace.id, theirs.id);
  assert.equal(theirsAfter?.assigneeUserId, users.viewer.id);
  const elsewhereAfter = await workItemRepository.findById(otherWorkspace.id, elsewhere.id);
  assert.equal(elsewhereAfter?.assigneeUserId, users.developer.id);

  const otherMembership = await workspaceRepository.findMembership(
    otherWorkspace.id,
    users.developer.id,
  );
  assert.equal(otherMembership?.role, "DEVELOPER");
});

test("PATCH member role: an ADMIN cannot change a peer ADMIN's role, but can change their own; an OWNER can change either", async (t) => {
  const { app, users, headers, memberUrl } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  // The OWNER promotes the developer, so there are now two ADMINs
  const promoteRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.developer.id),
    headers: headers.owner,
    payload: { role: "ADMIN" },
  });
  assert.equal(promoteRes.statusCode, 200);

  // Without this rule an ADMIN could demote a peer to VIEWER and then remove them,
  // sidestepping the rule that ADMINs cannot remove ADMINs.
  const demotePeerRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.developer.id),
    headers: headers.admin,
    payload: { role: "VIEWER" },
  });
  assert.equal(demotePeerRes.statusCode, 403);
  assert.equal(demotePeerRes.json().error, "FORBIDDEN");

  const reaffirmPeerRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.developer.id),
    headers: headers.admin,
    payload: { role: "ADMIN" },
  });
  assert.equal(reaffirmPeerRes.statusCode, 403);

  // The peer is untouched and still cannot be removed by the other ADMIN
  const removePeerRes = await app.inject({
    method: "DELETE",
    url: memberUrl(users.developer.id),
    headers: headers.admin,
  });
  assert.equal(removePeerRes.statusCode, 403);

  // An ADMIN may still step down from their own role
  const selfDemoteRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.admin.id),
    headers: headers.admin,
    payload: { role: "DEVELOPER" },
  });
  assert.equal(selfDemoteRes.statusCode, 200);
  assert.equal(selfDemoteRes.json().data.role, "DEVELOPER");

  // An OWNER may change an ADMIN
  const ownerDemotesRes = await app.inject({
    method: "PATCH",
    url: memberUrl(users.developer.id),
    headers: headers.owner,
    payload: { role: "VIEWER" },
  });
  assert.equal(ownerDemotesRes.statusCode, 200);
  assert.equal(ownerDemotesRes.json().data.role, "VIEWER");
});

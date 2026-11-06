import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../../../app.js";
import { InMemoryUserRepository } from "../../auth/repositories/memory/in-memory-user.repository.js";
import { JwtAccessTokenService } from "../../auth/security/jwt.service.js";
import { InMemoryInvitationRepository } from "../repositories/memory/in-memory-invitation.repository.js";
import { InMemoryWorkspaceRepository } from "../repositories/memory/in-memory-workspace.repository.js";
import { InvitationService } from "../services/invitation.service.js";
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
 * Users are created directly in the in-memory user repository because
 * buildApp() only mounts /api/auth when an authentication service is given.
 * Access tokens are then signed for those user ids.
 */
async function createTestSetup() {
  const workspaceRepository = new InMemoryWorkspaceRepository();
  const userRepository = new InMemoryUserRepository();
  const invitationRepository = new InMemoryInvitationRepository(workspaceRepository);
  const workspaceService = new WorkspaceService(workspaceRepository);
  const invitationService = new InvitationService(
    invitationRepository,
    workspaceRepository,
    userRepository,
  );

  const app = buildApp({
    serverOptions: { logger: false },
    workspaceRepository,
    workspaceService,
    userRepository,
    invitationRepository,
    invitationService,
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
  const invitee = await userRepository.create({
    email: "invitee@example.com",
    passwordHash: "hash",
    displayName: "Invitee",
  });

  const workspace = await workspaceService.createWorkspace({
    name: "Invitations Inc",
    creatorUserId: owner.id,
  });

  await workspaceService.addMember({
    workspaceId: workspace.id,
    actorUserId: owner.id,
    targetUserId: admin.id,
    role: "ADMIN",
  });
  await workspaceService.addMember({
    workspaceId: workspace.id,
    actorUserId: owner.id,
    targetUserId: developer.id,
    role: "DEVELOPER",
  });

  return {
    app,
    workspace,
    invitationService,
    users: { owner, admin, developer, invitee },
    headers: {
      owner: await getAuthHeader(owner.id),
      admin: await getAuthHeader(admin.id),
      developer: await getAuthHeader(developer.id),
      invitee: await getAuthHeader(invitee.id),
    },
  };
}

test("POST /invitations: ADMIN may invite, DEVELOPER is forbidden, outsider sees 404, anonymous 401", async (t) => {
  const { app, workspace, headers } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const url = `/api/workspaces/${workspace.id}/invitations`;
  const payload = { email: "invitee@example.com", role: "DEVELOPER" };

  const anonymousRes = await app.inject({ method: "POST", url, payload });
  assert.equal(anonymousRes.statusCode, 401);

  const outsiderRes = await app.inject({
    method: "POST",
    url,
    headers: await getAuthHeader("not-a-member"),
    payload,
  });
  assert.equal(outsiderRes.statusCode, 404);

  const developerRes = await app.inject({
    method: "POST",
    url,
    headers: headers.developer,
    payload,
  });
  assert.equal(developerRes.statusCode, 403);
  assert.equal(developerRes.json().error, "FORBIDDEN");

  const adminRes = await app.inject({
    method: "POST",
    url,
    headers: headers.admin,
    payload,
  });
  assert.equal(adminRes.statusCode, 201);

  const body = adminRes.json().data;
  assert.equal(body.invitation.email, "invitee@example.com");
  assert.equal(body.invitation.role, "DEVELOPER");
  assert.equal(body.invitation.status, "PENDING");
  assert.equal("tokenHash" in body.invitation, false);
  assert.match(body.token, /^[a-f0-9]{64}$/);
});

test("POST /invitations: ADMIN cannot invite an OWNER, duplicate pending is 409, bad input is 400", async (t) => {
  const { app, workspace, headers } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const url = `/api/workspaces/${workspace.id}/invitations`;

  const escalationRes = await app.inject({
    method: "POST",
    url,
    headers: headers.admin,
    payload: { email: "coowner@example.com", role: "OWNER" },
  });
  assert.equal(escalationRes.statusCode, 403);

  const ownerRes = await app.inject({
    method: "POST",
    url,
    headers: headers.owner,
    payload: { email: "coowner@example.com", role: "OWNER" },
  });
  assert.equal(ownerRes.statusCode, 201);

  const duplicateRes = await app.inject({
    method: "POST",
    url,
    headers: headers.owner,
    payload: { email: "CoOwner@example.com", role: "DEVELOPER" },
  });
  assert.equal(duplicateRes.statusCode, 409);
  assert.equal(duplicateRes.json().error, "INVITATION_ALREADY_PENDING");

  const existingMemberRes = await app.inject({
    method: "POST",
    url,
    headers: headers.owner,
    payload: { email: "dev@example.com", role: "VIEWER" },
  });
  assert.equal(existingMemberRes.statusCode, 409);
  assert.equal(existingMemberRes.json().error, "WORKSPACE_MEMBERSHIP_ALREADY_EXISTS");

  const badEmailRes = await app.inject({
    method: "POST",
    url,
    headers: headers.owner,
    payload: { email: "not-an-email", role: "DEVELOPER" },
  });
  assert.equal(badEmailRes.statusCode, 400);

  const badExpiryRes = await app.inject({
    method: "POST",
    url,
    headers: headers.owner,
    payload: { email: "later@example.com", role: "DEVELOPER", expiresInDays: 0 },
  });
  assert.equal(badExpiryRes.statusCode, 400);
});

test("GET /invitations lists without token hashes for ADMIN and is forbidden for DEVELOPER", async (t) => {
  const { app, workspace, headers } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const url = `/api/workspaces/${workspace.id}/invitations`;

  await app.inject({
    method: "POST",
    url,
    headers: headers.owner,
    payload: { email: "one@example.com", role: "DEVELOPER" },
  });
  await app.inject({
    method: "POST",
    url,
    headers: headers.owner,
    payload: { email: "two@example.com", role: "VIEWER" },
  });

  const developerRes = await app.inject({ method: "GET", url, headers: headers.developer });
  assert.equal(developerRes.statusCode, 403);

  const adminRes = await app.inject({ method: "GET", url, headers: headers.admin });
  assert.equal(adminRes.statusCode, 200);

  const list = adminRes.json().data;
  assert.equal(list.length, 2);
  for (const invitation of list) {
    assert.equal("tokenHash" in invitation, false);
    assert.equal(invitation.workspaceId, workspace.id);
  }
});

test("invitee flow: lookup previews the workspace, accept grants membership, second accept is 409", async (t) => {
  const { app, workspace, headers } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const createRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspace.id}/invitations`,
    headers: headers.owner,
    payload: { email: "invitee@example.com", role: "DEVELOPER" },
  });
  assert.equal(createRes.statusCode, 201);
  const token: string = createRes.json().data.token;

  // Before accepting, the invitee is not a member
  const beforeRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspace.id}`,
    headers: headers.invitee,
  });
  assert.equal(beforeRes.statusCode, 404);

  const lookupRes = await app.inject({
    method: "POST",
    url: "/api/invitations/lookup",
    headers: headers.invitee,
    payload: { token },
  });
  assert.equal(lookupRes.statusCode, 200);
  const preview = lookupRes.json().data;
  assert.equal(preview.workspace.name, "Invitations Inc");
  assert.equal(preview.role, "DEVELOPER");
  assert.equal("tokenHash" in preview, false);

  const acceptRes = await app.inject({
    method: "POST",
    url: "/api/invitations/accept",
    headers: headers.invitee,
    payload: { token },
  });
  assert.equal(acceptRes.statusCode, 200);
  const accepted = acceptRes.json().data;
  assert.equal(accepted.workspace.id, workspace.id);
  assert.equal(accepted.membership.role, "DEVELOPER");

  // Membership is real: the workspace is now visible to the invitee
  const afterRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspace.id}`,
    headers: headers.invitee,
  });
  assert.equal(afterRes.statusCode, 200);
  assert.equal(afterRes.json().data.membership.role, "DEVELOPER");

  const secondAcceptRes = await app.inject({
    method: "POST",
    url: "/api/invitations/accept",
    headers: headers.invitee,
    payload: { token },
  });
  assert.equal(secondAcceptRes.statusCode, 409);
  assert.equal(secondAcceptRes.json().error, "INVITATION_ALREADY_ACCEPTED");

  // The admin's list shows it consumed
  const listRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspace.id}/invitations`,
    headers: headers.owner,
  });
  assert.equal(listRes.json().data[0].status, "ACCEPTED");
});

test("accept is email-bound: a different account gets 403 and nothing is granted", async (t) => {
  const { app, workspace, headers } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const createRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspace.id}/invitations`,
    headers: headers.owner,
    payload: { email: "invitee@example.com", role: "DEVELOPER" },
  });
  const token: string = createRes.json().data.token;

  // "developer" is a member already but has a different email; use a fresh outsider id instead
  const outsiderHeader = await getAuthHeader("outsider-with-the-link");

  const wrongUserRes = await app.inject({
    method: "POST",
    url: "/api/invitations/accept",
    headers: outsiderHeader,
    payload: { token },
  });
  assert.equal(wrongUserRes.statusCode, 403);
  assert.equal(wrongUserRes.json().error, "INVITATION_EMAIL_MISMATCH");

  const stillOutsiderRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspace.id}`,
    headers: outsiderHeader,
  });
  assert.equal(stillOutsiderRes.statusCode, 404);

  // The invitation is untouched and the right person can still accept
  const acceptRes = await app.inject({
    method: "POST",
    url: "/api/invitations/accept",
    headers: headers.invitee,
    payload: { token },
  });
  assert.equal(acceptRes.statusCode, 200);
});

test("revoke: DELETE marks PENDING as REVOKED, accept then returns 410, revoking twice is 409", async (t) => {
  const { app, workspace, headers } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  const createRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspace.id}/invitations`,
    headers: headers.owner,
    payload: { email: "invitee@example.com", role: "DEVELOPER" },
  });
  const { invitation, token } = createRes.json().data;

  const developerRevokeRes = await app.inject({
    method: "DELETE",
    url: `/api/workspaces/${workspace.id}/invitations/${invitation.id}`,
    headers: headers.developer,
  });
  assert.equal(developerRevokeRes.statusCode, 403);

  const revokeRes = await app.inject({
    method: "DELETE",
    url: `/api/workspaces/${workspace.id}/invitations/${invitation.id}`,
    headers: headers.admin,
  });
  assert.equal(revokeRes.statusCode, 200);
  assert.equal(revokeRes.json().data.status, "REVOKED");

  const acceptRes = await app.inject({
    method: "POST",
    url: "/api/invitations/accept",
    headers: headers.invitee,
    payload: { token },
  });
  assert.equal(acceptRes.statusCode, 410);
  assert.equal(acceptRes.json().error, "INVITATION_REVOKED");

  const secondRevokeRes = await app.inject({
    method: "DELETE",
    url: `/api/workspaces/${workspace.id}/invitations/${invitation.id}`,
    headers: headers.admin,
  });
  assert.equal(secondRevokeRes.statusCode, 409);
  assert.equal(secondRevokeRes.json().error, "INVITATION_CANNOT_BE_REVOKED");

  const unknownRes = await app.inject({
    method: "DELETE",
    url: `/api/workspaces/${workspace.id}/invitations/does-not-exist`,
    headers: headers.admin,
  });
  assert.equal(unknownRes.statusCode, 404);
});

test("expired invitation: lookup and accept return 410, and the token is never accepted in a URL", async (t) => {
  const { app, workspace, invitationService, users, headers } = await createTestSetup();

  t.after(async () => {
    await app.close();
  });

  // The HTTP schema forbids expiresInDays < 1, so create the expired one through the service
  const expired = await invitationService.createInvitation({
    workspaceId: workspace.id,
    actorUserId: users.owner.id,
    email: "invitee@example.com",
    role: "DEVELOPER",
    expiresInDays: -1,
  });

  const lookupRes = await app.inject({
    method: "POST",
    url: "/api/invitations/lookup",
    headers: headers.invitee,
    payload: { token: expired.rawToken },
  });
  assert.equal(lookupRes.statusCode, 410);
  assert.equal(lookupRes.json().error, "INVITATION_EXPIRED");

  const acceptRes = await app.inject({
    method: "POST",
    url: "/api/invitations/accept",
    headers: headers.invitee,
    payload: { token: expired.rawToken },
  });
  assert.equal(acceptRes.statusCode, 410);

  const unknownTokenRes = await app.inject({
    method: "POST",
    url: "/api/invitations/lookup",
    headers: headers.invitee,
    payload: { token: "f".repeat(64) },
  });
  assert.equal(unknownTokenRes.statusCode, 404);

  const malformedTokenRes = await app.inject({
    method: "POST",
    url: "/api/invitations/lookup",
    headers: headers.invitee,
    payload: { token: "short" },
  });
  assert.equal(malformedTokenRes.statusCode, 400);

  // No GET-by-path variant exists, so a token can never land in request logs
  const pathRes = await app.inject({
    method: "GET",
    url: `/api/invitations/${expired.rawToken}`,
    headers: headers.invitee,
  });
  assert.equal(pathRes.statusCode, 404);
});

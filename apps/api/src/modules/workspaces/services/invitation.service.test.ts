import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryWorkspaceRepository } from "../repositories/memory/in-memory-workspace.repository.js";
import { InMemoryInvitationRepository } from "../repositories/memory/in-memory-invitation.repository.js";
import { InMemoryUserRepository } from "../../auth/repositories/memory/in-memory-user.repository.js";
import { WorkspaceService } from "./workspace.service.js";
import { InvitationService, hashToken } from "./invitation.service.js";
import {
  WorkspaceNotFoundError,
  WorkspacePermissionDeniedError,
  WorkspaceMembershipAlreadyExistsError,
  InvitationNotFoundError,
  InvitationExpiredError,
  InvitationRevokedError,
  InvitationAlreadyAcceptedError,
  InvitationAlreadyPendingError,
  InvitationCannotBeRevokedError,
  InvitationEmailMismatchError,
} from "../workspace.errors.js";

async function setupTestContext() {
  const workspaceRepo = new InMemoryWorkspaceRepository();
  const invitationRepo = new InMemoryInvitationRepository(workspaceRepo);
  const userRepo = new InMemoryUserRepository();

  const workspaceService = new WorkspaceService(workspaceRepo);
  const invitationService = new InvitationService(
    invitationRepo,
    workspaceRepo,
    userRepo,
  );

  const ws1 = await workspaceService.createWorkspace({
    name: " Corp",
    creatorUserId: "owner-1",
  });

  const ws2 = await workspaceService.createWorkspace({
    name: "Beta Inc",
    creatorUserId: "owner-2",
  });

  await workspaceService.addMember({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    targetUserId: "admin-1",
    role: "ADMIN",
  });

  await workspaceService.addMember({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    targetUserId: "dev-1",
    role: "DEVELOPER",
  });

  await workspaceService.addMember({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    targetUserId: "viewer-1",
    role: "VIEWER",
  });

  // Create users in userRepo
  await userRepo.create({
    email: "existing-member@.com",
    passwordHash: "hash",
    displayName: "Existing Member",
  });

  return {
    ws1,
    ws2,
    workspaceRepo,
    invitationRepo,
    userRepo,
    workspaceService,
    invitationService,
  };
}

test("createInvitation enforces RBAC and ADMIN -> OWNER escalation restrictions", async () => {
  const { ws1, invitationService } = await setupTestContext();

  // OWNER creates DEVELOPER invitation -> succeeds
  const ownerResult = await invitationService.createInvitation({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    email: "new-dev@.com",
    role: "DEVELOPER",
  });
  assert.ok(ownerResult.rawToken);
  assert.equal(ownerResult.invitation.email, "new-dev@.com");
  assert.equal(ownerResult.invitation.role, "DEVELOPER");

  // OWNER creates OWNER invitation -> succeeds
  const ownerAppointResult = await invitationService.createInvitation({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    email: "co-owner@.com",
    role: "OWNER",
  });
  assert.ok(ownerAppointResult.rawToken);

  // ADMIN creates DEVELOPER invitation -> succeeds
  const adminResult = await invitationService.createInvitation({
    workspaceId: ws1.id,
    actorUserId: "admin-1",
    email: "contractor@.com",
    role: "DEVELOPER",
  });
  assert.ok(adminResult.rawToken);

  // ADMIN attempts to invite OWNER -> throws WorkspacePermissionDeniedError
  await assert.rejects(
    async () => {
      await invitationService.createInvitation({
        workspaceId: ws1.id,
        actorUserId: "admin-1",
        email: "sneaky-owner@.com",
        role: "OWNER",
      });
    },
    WorkspacePermissionDeniedError,
  );

  // DEVELOPER fails
  await assert.rejects(
    async () => {
      await invitationService.createInvitation({
        workspaceId: ws1.id,
        actorUserId: "dev-1",
        email: "friend@.com",
        role: "DEVELOPER",
      });
    },
    WorkspacePermissionDeniedError,
  );

  // VIEWER fails
  await assert.rejects(
    async () => {
      await invitationService.createInvitation({
        workspaceId: ws1.id,
        actorUserId: "viewer-1",
        email: "friend@.com",
        role: "VIEWER",
      });
    },
    WorkspacePermissionDeniedError,
  );
});

test("createInvitation prevents duplicate pending invitations and inviting existing active members", async () => {
  const { ws1, invitationService, userRepo, workspaceService } = await setupTestContext();

  const user = await userRepo.create({
    email: "active-member@.com",
    passwordHash: "hash",
    displayName: "Active Member",
  });

  await workspaceService.addMember({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    targetUserId: user.id,
    role: "DEVELOPER",
  });

  // Attempting to invite active-member@.com -> throws WorkspaceMembershipAlreadyExistsError
  await assert.rejects(
    async () => {
      await invitationService.createInvitation({
        workspaceId: ws1.id,
        actorUserId: "owner-1",
        email: "active-member@.com",
        role: "DEVELOPER",
      });
    },
    WorkspaceMembershipAlreadyExistsError,
  );

  // Create pending invitation
  await invitationService.createInvitation({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    email: "pending@.com",
    role: "DEVELOPER",
  });

  // Duplicate pending creation -> throws InvitationAlreadyPendingError
  await assert.rejects(
    async () => {
      await invitationService.createInvitation({
        workspaceId: ws1.id,
        actorUserId: "owner-1",
        email: "pending@.com",
        role: "DEVELOPER",
      });
    },
    InvitationAlreadyPendingError,
  );
});

test("token security: raw token is never persisted in DB and tokenHash is stored instead", async () => {
  const { ws1, invitationService, invitationRepo } = await setupTestContext();

  const result = await invitationService.createInvitation({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    email: "secure@.com",
    role: "DEVELOPER",
  });

  const rawToken = result.rawToken;
  const expectedHash = hashToken(rawToken);

  // Raw token must NOT equal hash
  assert.notEqual(rawToken, expectedHash);

  // Retrieve stored record directly from repository
  const stored = await invitationRepo.findById(ws1.id, result.invitation.id);
  assert.ok(stored);
  assert.equal(stored.tokenHash, expectedHash);
  assert.notEqual(stored.tokenHash, rawToken);

  // Safe view strips tokenHash
  const safeView = await invitationService.getInvitationByToken(rawToken);
  assert.equal("tokenHash" in safeView, false);
});

test("acceptInvitation transitions invitation to ACCEPTED and grants workspace membership", async () => {
  const { ws1, invitationService, invitationRepo, userRepo, workspaceRepo } =
    await setupTestContext();

  const newHire = await userRepo.create({
    email: "new-hire@.com",
    passwordHash: "hash",
    displayName: "New Hire",
  });

  const createResult = await invitationService.createInvitation({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    email: "New-Hire@.com",
    role: "DEVELOPER",
  });

  const membership = await invitationService.acceptInvitation({
    rawToken: createResult.rawToken,
    acceptingUserId: newHire.id,
  });

  assert.equal(membership.workspaceId, ws1.id);
  assert.equal(membership.userId, newHire.id);
  assert.equal(membership.role, "DEVELOPER");

  // Both sides of the atomic accept are persisted
  const stored = await invitationRepo.findById(ws1.id, createResult.invitation.id);
  assert.equal(stored?.status, "ACCEPTED");
  const persistedMembership = await workspaceRepo.findMembership(ws1.id, newHire.id);
  assert.equal(persistedMembership?.role, "DEVELOPER");

  // Re-accepting throws InvitationAlreadyAcceptedError
  await assert.rejects(
    async () => {
      await invitationService.acceptInvitation({
        rawToken: createResult.rawToken,
        acceptingUserId: newHire.id,
      });
    },
    InvitationAlreadyAcceptedError,
  );
});

test("acceptInvitation rejects a user whose account email does not match the invitation", async () => {
  const { ws1, invitationService, invitationRepo, userRepo, workspaceRepo } =
    await setupTestContext();

  const intruder = await userRepo.create({
    email: "someone-else@.com",
    passwordHash: "hash",
    displayName: "Someone Else",
  });

  const createResult = await invitationService.createInvitation({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    email: "intended@.com",
    role: "DEVELOPER",
  });

  await assert.rejects(
    async () => {
      await invitationService.acceptInvitation({
        rawToken: createResult.rawToken,
        acceptingUserId: intruder.id,
      });
    },
    InvitationEmailMismatchError,
  );

  // An unknown user id is rejected the same way, without leaking which case it is
  await assert.rejects(
    async () => {
      await invitationService.acceptInvitation({
        rawToken: createResult.rawToken,
        acceptingUserId: "no-such-user",
      });
    },
    InvitationEmailMismatchError,
  );

  // Nothing was consumed or granted
  const stored = await invitationRepo.findById(ws1.id, createResult.invitation.id);
  assert.equal(stored?.status, "PENDING");
  assert.equal(await workspaceRepo.findMembership(ws1.id, intruder.id), null);
});

test("acceptInvitation by an existing member consumes the invitation and keeps the current role", async () => {
  const { ws1, invitationService, invitationRepo, userRepo, workspaceService } =
    await setupTestContext();

  const member = await userRepo.create({
    email: "already-here@.com",
    passwordHash: "hash",
    displayName: "Already Here",
  });

  // Invite first, then add directly before the invitation is redeemed
  const createResult = await invitationService.createInvitation({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    email: "already-here@.com",
    role: "VIEWER",
  });

  await workspaceService.addMember({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    targetUserId: member.id,
    role: "ADMIN",
  });

  const membership = await invitationService.acceptInvitation({
    rawToken: createResult.rawToken,
    acceptingUserId: member.id,
  });

  // The direct ADMIN grant is not downgraded by a VIEWER invitation
  assert.equal(membership.role, "ADMIN");
  const stored = await invitationRepo.findById(ws1.id, createResult.invitation.id);
  assert.equal(stored?.status, "ACCEPTED");
});

test("getInvitationByToken returns a preview with the workspace and no token hash", async () => {
  const { ws1, invitationService } = await setupTestContext();

  const createResult = await invitationService.createInvitation({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    email: "preview@.com",
    role: "DEVELOPER",
  });

  const preview = await invitationService.getInvitationByToken(createResult.rawToken);

  assert.equal(preview.workspace.id, ws1.id);
  assert.equal(preview.workspace.name, ws1.name);
  assert.equal(preview.workspace.slug, ws1.slug);
  assert.equal(preview.email, "preview@.com");
  assert.equal("tokenHash" in preview, false);
});

test("acceptInvitation rejects expired and revoked tokens", async () => {
  const { ws1, invitationService, invitationRepo } = await setupTestContext();

  // Expired token test
  const expiredResult = await invitationService.createInvitation({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    email: "expired-user@.com",
    role: "DEVELOPER",
    expiresInDays: -1, // created already expired
  });

  await assert.rejects(
    async () => {
      await invitationService.acceptInvitation({
        rawToken: expiredResult.rawToken,
        acceptingUserId: "someone-else",
      });
    },
    InvitationExpiredError,
  );

  // Lazy expiry is persisted so later lookups short-circuit
  const expiredStored = await invitationRepo.findById(ws1.id, expiredResult.invitation.id);
  assert.equal(expiredStored?.status, "EXPIRED");

  // Revoked token test
  const revokedResult = await invitationService.createInvitation({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    email: "revoked-user@.com",
    role: "DEVELOPER",
  });

  await invitationService.revokeInvitation({
    workspaceId: ws1.id,
    invitationId: revokedResult.invitation.id,
    actorUserId: "owner-1",
  });

  await assert.rejects(
    async () => {
      await invitationService.acceptInvitation({
        rawToken: revokedResult.rawToken,
        acceptingUserId: "someone-else",
      });
    },
    InvitationRevokedError,
  );
});

test("revokeInvitation allows OWNER and ADMIN, rejects DEVELOPER/VIEWER and non-pending invitations", async () => {
  const { ws1, invitationService } = await setupTestContext();

  const inv1 = await invitationService.createInvitation({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    email: "inv1@.com",
    role: "DEVELOPER",
  });

  // DEVELOPER cannot revoke -> throws WorkspacePermissionDeniedError
  await assert.rejects(
    async () => {
      await invitationService.revokeInvitation({
        workspaceId: ws1.id,
        invitationId: inv1.invitation.id,
        actorUserId: "dev-1",
      });
    },
    WorkspacePermissionDeniedError,
  );

  // ADMIN revokes -> succeeds
  const revoked = await invitationService.revokeInvitation({
    workspaceId: ws1.id,
    invitationId: inv1.invitation.id,
    actorUserId: "admin-1",
  });

  assert.equal(revoked.status, "REVOKED");

  // Revoking already revoked -> throws InvitationCannotBeRevokedError
  await assert.rejects(
    async () => {
      await invitationService.revokeInvitation({
        workspaceId: ws1.id,
        invitationId: inv1.invitation.id,
        actorUserId: "owner-1",
      });
    },
    InvitationCannotBeRevokedError,
  );
});

test("tenant isolation: Workspace A cannot inspect or revoke Workspace B invitations", async () => {
  const { ws1, ws2, invitationService } = await setupTestContext();

  const ws2Inv = await invitationService.createInvitation({
    workspaceId: ws2.id,
    actorUserId: "owner-2",
    email: "ws2-user@beta.com",
    role: "DEVELOPER",
  });

  // Revoking WS2 invitation under WS1 context -> throws InvitationNotFoundError
  await assert.rejects(
    async () => {
      await invitationService.revokeInvitation({
        workspaceId: ws1.id,
        invitationId: ws2Inv.invitation.id,
        actorUserId: "owner-1",
      });
    },
    InvitationNotFoundError,
  );

  // Listing WS1 invitations does NOT return WS2 invitation
  const ws1List = await invitationService.listWorkspaceInvitations({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
  });

  assert.equal(ws1List.some((i) => i.id === ws2Inv.invitation.id), false);
});

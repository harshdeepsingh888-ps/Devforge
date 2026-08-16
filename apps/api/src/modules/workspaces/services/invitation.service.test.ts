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
} from "../workspace.errors.js";

async function setupTestContext() {
  const workspaceRepo = new InMemoryWorkspaceRepository();
  const invitationRepo = new InMemoryInvitationRepository();
  const userRepo = new InMemoryUserRepository();

  const workspaceService = new WorkspaceService(workspaceRepo);
  const invitationService = new InvitationService(
    invitationRepo,
    workspaceRepo,
    userRepo,
  );

  const ws1 = await workspaceService.createWorkspace({
    name: "Acme Corp",
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
    email: "existing-member@acme.com",
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
    email: "new-dev@acme.com",
    role: "DEVELOPER",
  });
  assert.ok(ownerResult.rawToken);
  assert.equal(ownerResult.invitation.email, "new-dev@acme.com");
  assert.equal(ownerResult.invitation.role, "DEVELOPER");

  // OWNER creates OWNER invitation -> succeeds
  const ownerAppointResult = await invitationService.createInvitation({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    email: "co-owner@acme.com",
    role: "OWNER",
  });
  assert.ok(ownerAppointResult.rawToken);

  // ADMIN creates DEVELOPER invitation -> succeeds
  const adminResult = await invitationService.createInvitation({
    workspaceId: ws1.id,
    actorUserId: "admin-1",
    email: "contractor@acme.com",
    role: "DEVELOPER",
  });
  assert.ok(adminResult.rawToken);

  // ADMIN attempts to invite OWNER -> throws WorkspacePermissionDeniedError
  await assert.rejects(
    async () => {
      await invitationService.createInvitation({
        workspaceId: ws1.id,
        actorUserId: "admin-1",
        email: "sneaky-owner@acme.com",
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
        email: "friend@acme.com",
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
        email: "friend@acme.com",
        role: "VIEWER",
      });
    },
    WorkspacePermissionDeniedError,
  );
});

test("createInvitation prevents duplicate pending invitations and inviting existing active members", async () => {
  const { ws1, invitationService, userRepo, workspaceService } = await setupTestContext();

  const user = await userRepo.create({
    email: "active-member@acme.com",
    passwordHash: "hash",
    displayName: "Active Member",
  });

  await workspaceService.addMember({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    targetUserId: user.id,
    role: "DEVELOPER",
  });

  // Attempting to invite active-member@acme.com -> throws WorkspaceMembershipAlreadyExistsError
  await assert.rejects(
    async () => {
      await invitationService.createInvitation({
        workspaceId: ws1.id,
        actorUserId: "owner-1",
        email: "active-member@acme.com",
        role: "DEVELOPER",
      });
    },
    WorkspaceMembershipAlreadyExistsError,
  );

  // Create pending invitation
  await invitationService.createInvitation({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    email: "pending@acme.com",
    role: "DEVELOPER",
  });

  // Duplicate pending creation -> throws InvitationAlreadyPendingError
  await assert.rejects(
    async () => {
      await invitationService.createInvitation({
        workspaceId: ws1.id,
        actorUserId: "owner-1",
        email: "pending@acme.com",
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
    email: "secure@acme.com",
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
  const { ws1, invitationService, workspaceRepo } = await setupTestContext();

  const createResult = await invitationService.createInvitation({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    email: "new-hire@acme.com",
    role: "DEVELOPER",
  });

  const membership = await invitationService.acceptInvitation({
    rawToken: createResult.rawToken,
    acceptingUserId: "new-hire-user-id",
  });

  assert.equal(membership.workspaceId, ws1.id);
  assert.equal(membership.userId, "new-hire-user-id");
  assert.equal(membership.role, "DEVELOPER");

  // Re-accepting throws InvitationAlreadyAcceptedError
  await assert.rejects(
    async () => {
      await invitationService.acceptInvitation({
        rawToken: createResult.rawToken,
        acceptingUserId: "new-hire-user-id",
      });
    },
    InvitationAlreadyAcceptedError,
  );
});

test("acceptInvitation rejects expired and revoked tokens", async () => {
  const { ws1, invitationService, invitationRepo } = await setupTestContext();

  // Expired token test
  const expiredResult = await invitationService.createInvitation({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    email: "expired-user@acme.com",
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

  // Revoked token test
  const revokedResult = await invitationService.createInvitation({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    email: "revoked-user@acme.com",
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
    email: "inv1@acme.com",
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

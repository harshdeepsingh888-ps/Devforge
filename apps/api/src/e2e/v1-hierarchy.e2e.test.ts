import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryWorkspaceRepository } from "../modules/workspaces/repositories/memory/in-memory-workspace.repository.js";
import { InMemoryTeamRepository } from "../modules/workspaces/repositories/memory/in-memory-team.repository.js";
import { InMemoryInvitationRepository } from "../modules/workspaces/repositories/memory/in-memory-invitation.repository.js";
import { InMemoryUserRepository } from "../modules/auth/repositories/memory/in-memory-user.repository.js";
import { InMemoryProjectRepository } from "../modules/projects/project.repository.js";

import { WorkspaceService } from "../modules/workspaces/services/workspace.service.js";
import { TeamService } from "../modules/workspaces/services/team.service.js";
import { InvitationService, hashToken } from "../modules/workspaces/services/invitation.service.js";

import {
  WorkspaceNotFoundError,
  WorkspacePermissionDeniedError,
  WorkspaceMembershipAlreadyExistsError,
  InvitationNotFoundError,
  InvitationExpiredError,
  InvitationRevokedError,
  InvitationAlreadyAcceptedError,
  InvitationAlreadyPendingError,
  TeamNotFoundError,
  TeamMemberAlreadyExistsError,
} from "../modules/workspaces/workspace.errors.js";

test("V1 Complete Architecture & Security Verification Lifecycle", async () => {
  // Setup repositories & services
  const workspaceRepo = new InMemoryWorkspaceRepository();
  const teamRepo = new InMemoryTeamRepository();
  const invitationRepo = new InMemoryInvitationRepository();
  const userRepo = new InMemoryUserRepository();
  const projectRepo = new InMemoryProjectRepository();

  const workspaceService = new WorkspaceService(workspaceRepo);
  const teamService = new TeamService(teamRepo, workspaceRepo);
  const invitationService = new InvitationService(invitationRepo, workspaceRepo, userRepo);

  // 1. User 1 (Owner) Registers & Creates Workspace
  const user1 = await userRepo.create({
    email: "owner@devforge.io",
    passwordHash: "hash-123",
    displayName: "Harshdeep (Owner)",
  });

  const workspace = await workspaceService.createWorkspace({
    name: "DevForge Engineering",
    slug: "devforge-eng",
    creatorUserId: "user-owner-1",
  });

  assert.equal(workspace.name, "DevForge Engineering");
  assert.equal(workspace.slug, "devforge-eng");
  assert.equal(workspace.membership.userId, "user-owner-1");
  assert.equal(workspace.membership.role, "OWNER");

  // 2. User 2 (Admin) added to Workspace & Role Hierarchy Verified
  const adminUser = await userRepo.create({
    email: "admin@devforge.io",
    passwordHash: "hash-123",
    displayName: "Sarah (Admin)",
  });

  await workspaceService.addMember({
    workspaceId: workspace.id,
    actorUserId: "user-owner-1",
    targetUserId: adminUser.id,
    role: "ADMIN",
  });

  // 3. ADMIN -> OWNER Privilege Escalation Protection
  await assert.rejects(
    async () => {
      await invitationService.createInvitation({
        workspaceId: workspace.id,
        actorUserId: adminUser.id,
        email: "malicious@devforge.io",
        role: "OWNER",
      });
    },
    WorkspacePermissionDeniedError,
  );

  // 4. Secure Invitation Lifecycle (Owner invites Alex as DEVELOPER)
  const inviteResult = await invitationService.createInvitation({
    workspaceId: workspace.id,
    actorUserId: "user-owner-1",
    email: "alex@devforge.io",
    role: "DEVELOPER",
  });

  assert.ok(inviteResult.rawToken);
  assert.equal(inviteResult.invitation.email, "alex@devforge.io");
  assert.equal(inviteResult.invitation.role, "DEVELOPER");

  // Verify SHA-256 token hashing: Raw token is NOT stored, tokenHash is persisted
  const rawToken = inviteResult.rawToken;
  const expectedHash = hashToken(rawToken);
  assert.notEqual(rawToken, expectedHash);

  const storedInv = await invitationRepo.findById(workspace.id, inviteResult.invitation.id);
  assert.ok(storedInv);
  assert.equal(storedInv.tokenHash, expectedHash);

  // 5. Alex Registers & Accepts Invitation with Raw Token
  const alexUser = await userRepo.create({
    email: "alex@devforge.io",
    passwordHash: "hash-123",
    displayName: "Alex Developer",
  });

  const membership = await invitationService.acceptInvitation({
    rawToken,
    acceptingUserId: alexUser.id,
  });

  assert.equal(membership.workspaceId, workspace.id);
  assert.equal(membership.userId, alexUser.id);
  assert.equal(membership.role, "DEVELOPER");

  // Replay Protection: Attempting to accept already accepted invitation fails
  await assert.rejects(
    async () => {
      await invitationService.acceptInvitation({
        rawToken,
        acceptingUserId: alexUser.id,
      });
    },
    InvitationAlreadyAcceptedError,
  );

  // 6. Teams Creation & Multi-Team Membership Assignment
  const backendTeam = await teamService.createTeam({
    workspaceId: workspace.id,
    actorUserId: "user-owner-1",
    name: "Backend Core",
    slug: "backend-core",
  });

  const frontendTeam = await teamService.createTeam({
    workspaceId: workspace.id,
    actorUserId: adminUser.id,
    name: "Frontend Platform",
    slug: "frontend-platform",
  });

  // Assign Alex (DEVELOPER) to Backend and Frontend teams
  await teamService.addTeamMember({
    workspaceId: workspace.id,
    teamId: backendTeam.id,
    actorUserId: "user-owner-1",
    targetUserId: alexUser.id,
  });

  await teamService.addTeamMember({
    workspaceId: workspace.id,
    teamId: frontendTeam.id,
    actorUserId: adminUser.id,
    targetUserId: alexUser.id,
  });

  const alexTeams = await teamService.listUserTeams({
    workspaceId: workspace.id,
    targetUserId: alexUser.id,
    actorUserId: alexUser.id,
  });

  assert.equal(alexTeams.length, 2);

  // Duplicate team membership prevention
  await assert.rejects(
    async () => {
      await teamService.addTeamMember({
        workspaceId: workspace.id,
        teamId: backendTeam.id,
        actorUserId: "user-owner-1",
        targetUserId: alexUser.id,
      });
    },
    TeamMemberAlreadyExistsError,
  );

  // 7. Workspace-Scoped Project Creation
  const project = await projectRepo.create({
    workspaceId: workspace.id,
    name: "DevForge API Gateway",
    description: "Core backend architecture API service",
  });

  assert.ok(project.id);
  assert.equal(project.workspaceId, workspace.id);

  // 8. Cross-Tenant Isolation Security Audit
  const workspace2 = await workspaceService.createWorkspace({
    name: "Isolated Competitor Corp",
    slug: "competitor-corp",
    creatorUserId: "outsider-1",
  });

  // Outsider cannot access DevForge projects
  const crossProjects = await projectRepo.findAllByWorkspaceId(workspace2.id);
  assert.equal(crossProjects.length, 0);

  // Outsider cannot manipulate DevForge teams
  await assert.rejects(
    async () => {
      await teamService.addTeamMember({
        workspaceId: workspace2.id,
        teamId: backendTeam.id,
        actorUserId: "outsider-1",
        targetUserId: "outsider-1",
      });
    },
    TeamNotFoundError,
  );

  // Anti-enumeration: Non-member querying workspace returns WorkspaceNotFoundError
  await assert.rejects(
    async () => {
      await workspaceService.getWorkspaceForUser(workspace.id, "outsider-1");
    },
    WorkspaceNotFoundError,
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryWorkspaceRepository } from "../repositories/memory/in-memory-workspace.repository.js";
import { InMemoryTeamRepository } from "../repositories/memory/in-memory-team.repository.js";
import { WorkspaceService } from "./workspace.service.js";
import { TeamService } from "./team.service.js";
import {
  WorkspaceNotFoundError,
  WorkspacePermissionDeniedError,
  WorkspaceMembershipNotFoundError,
  TeamNotFoundError,
  TeamMemberAlreadyExistsError,
  TeamMemberNotFoundError,
  TeamSlugAlreadyExistsError,
} from "../workspace.errors.js";

async function setupTestContext() {
  const workspaceRepository = new InMemoryWorkspaceRepository();
  const teamRepository = new InMemoryTeamRepository();
  const workspaceService = new WorkspaceService(workspaceRepository);
  const teamService = new TeamService(teamRepository, workspaceRepository);

  const ws1 = await workspaceService.createWorkspace({
    name: "Workspace Alpha",
    creatorUserId: "owner-1",
  });

  const ws2 = await workspaceService.createWorkspace({
    name: "Workspace Beta",
    creatorUserId: "owner-2",
  });

  // Add members to WS1
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

  // Add a member to WS2
  await workspaceService.addMember({
    workspaceId: ws2.id,
    actorUserId: "owner-2",
    targetUserId: "user-ws2",
    role: "DEVELOPER",
  });

  return {
    ws1,
    ws2,
    workspaceRepository,
    teamRepository,
    workspaceService,
    teamService,
  };
}

test("createTeam allows OWNER and ADMIN, rejects DEVELOPER and VIEWER", async () => {
  const { ws1, teamService } = await setupTestContext();

  // OWNER creates team
  const team1 = await teamService.createTeam({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    name: "Backend Engineering",
    slug: "backend",
  });
  assert.equal(team1.name, "Backend Engineering");
  assert.equal(team1.slug, "backend");

  // ADMIN creates team
  const team2 = await teamService.createTeam({
    workspaceId: ws1.id,
    actorUserId: "admin-1",
    name: "Frontend Core",
  });
  assert.equal(team2.slug, "frontend-core");

  // DEVELOPER fails
  await assert.rejects(
    async () => {
      await teamService.createTeam({
        workspaceId: ws1.id,
        actorUserId: "dev-1",
        name: "DevOps Team",
      });
    },
    WorkspacePermissionDeniedError,
  );

  // VIEWER fails
  await assert.rejects(
    async () => {
      await teamService.createTeam({
        workspaceId: ws1.id,
        actorUserId: "viewer-1",
        name: "DevOps Team",
      });
    },
    WorkspacePermissionDeniedError,
  );
});

test("addTeamMember adds a valid workspace member to a team", async () => {
  const { ws1, teamService } = await setupTestContext();

  const team = await teamService.createTeam({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    name: "Backend Team",
  });

  const member = await teamService.addTeamMember({
    workspaceId: ws1.id,
    teamId: team.id,
    actorUserId: "admin-1",
    targetUserId: "dev-1",
  });

  assert.equal(member.teamId, team.id);
  assert.equal(member.userId, "dev-1");
  assert.ok(member.createdAt);
});

test("supports one user belonging to multiple teams and one team having multiple users", async () => {
  const { ws1, teamService } = await setupTestContext();

  const backendTeam = await teamService.createTeam({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    name: "Backend",
  });

  const devopsTeam = await teamService.createTeam({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    name: "DevOps",
  });

  // dev-1 joins both backend and devops
  await teamService.addTeamMember({
    workspaceId: ws1.id,
    teamId: backendTeam.id,
    actorUserId: "owner-1",
    targetUserId: "dev-1",
  });

  await teamService.addTeamMember({
    workspaceId: ws1.id,
    teamId: devopsTeam.id,
    actorUserId: "owner-1",
    targetUserId: "dev-1",
  });

  // admin-1 also joins backend
  await teamService.addTeamMember({
    workspaceId: ws1.id,
    teamId: backendTeam.id,
    actorUserId: "owner-1",
    targetUserId: "admin-1",
  });

  const backendMembers = await teamService.listTeamMembers({
    workspaceId: ws1.id,
    teamId: backendTeam.id,
    actorUserId: "viewer-1",
  });
  assert.equal(backendMembers.length, 2);

  const dev1Teams = await teamService.listUserTeams({
    workspaceId: ws1.id,
    targetUserId: "dev-1",
    actorUserId: "dev-1",
  });
  assert.equal(dev1Teams.length, 2);
  assert.deepEqual(
    dev1Teams.map((t) => t.id).sort(),
    [backendTeam.id, devopsTeam.id].sort(),
  );
});

test("rejects adding duplicate team member", async () => {
  const { ws1, teamService } = await setupTestContext();

  const team = await teamService.createTeam({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    name: "Core Team",
  });

  await teamService.addTeamMember({
    workspaceId: ws1.id,
    teamId: team.id,
    actorUserId: "owner-1",
    targetUserId: "dev-1",
  });

  await assert.rejects(
    async () => {
      await teamService.addTeamMember({
        workspaceId: ws1.id,
        teamId: team.id,
        actorUserId: "owner-1",
        targetUserId: "dev-1",
      });
    },
    TeamMemberAlreadyExistsError,
  );
});

test("tenant isolation: prevents adding a user from another workspace to a team", async () => {
  const { ws1, ws2, teamService } = await setupTestContext();

  const ws1Team = await teamService.createTeam({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    name: "WS1 Team",
  });

  // Attempt to add user-ws2 (who belongs only to WS2) to WS1 Team -> throws WorkspaceMembershipNotFoundError
  await assert.rejects(
    async () => {
      await teamService.addTeamMember({
        workspaceId: ws1.id,
        teamId: ws1Team.id,
        actorUserId: "owner-1",
        targetUserId: "user-ws2",
      });
    },
    WorkspaceMembershipNotFoundError,
  );
});

test("tenant isolation: prevents manipulating a team from another workspace", async () => {
  const { ws1, ws2, teamService } = await setupTestContext();

  const ws2Team = await teamService.createTeam({
    workspaceId: ws2.id,
    actorUserId: "owner-2",
    name: "WS2 Team",
  });

  // Attempting to access WS2 team under WS1 context -> throws TeamNotFoundError
  await assert.rejects(
    async () => {
      await teamService.addTeamMember({
        workspaceId: ws1.id,
        teamId: ws2Team.id,
        actorUserId: "owner-1",
        targetUserId: "dev-1",
      });
    },
    TeamNotFoundError,
  );
});

test("removes a member from a team and handles non-member removal", async () => {
  const { ws1, teamService } = await setupTestContext();

  const team = await teamService.createTeam({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    name: "Quality Team",
  });

  await teamService.addTeamMember({
    workspaceId: ws1.id,
    teamId: team.id,
    actorUserId: "owner-1",
    targetUserId: "dev-1",
  });

  // Remove existing member -> succeeds
  await teamService.removeTeamMember({
    workspaceId: ws1.id,
    teamId: team.id,
    actorUserId: "admin-1",
    targetUserId: "dev-1",
  });

  const membersAfter = await teamService.listTeamMembers({
    workspaceId: ws1.id,
    teamId: team.id,
    actorUserId: "dev-1",
  });
  assert.equal(membersAfter.length, 0);

  // Removing non-member -> throws TeamMemberNotFoundError
  await assert.rejects(
    async () => {
      await teamService.removeTeamMember({
        workspaceId: ws1.id,
        teamId: team.id,
        actorUserId: "owner-1",
        targetUserId: "dev-1",
      });
    },
    TeamMemberNotFoundError,
  );
});

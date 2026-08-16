import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryTeamRepository } from "./in-memory-team.repository.js";
import { TeamSlugAlreadyExistsError } from "../../workspace.errors.js";

test("creates a team with generated id and timestamps", async () => {
  const repository = new InMemoryTeamRepository();

  const team = await repository.create({
    workspaceId: "ws-1",
    name: "Backend Engineering",
    slug: "backend-engineering",
  });

  assert.ok(team.id);
  assert.equal(team.workspaceId, "ws-1");
  assert.equal(team.name, "Backend Engineering");
  assert.equal(team.slug, "backend-engineering");
  assert.ok(team.createdAt);
  assert.ok(team.updatedAt);
  assert.equal(Number.isNaN(Date.parse(team.createdAt)), false);
});

test("retrieves a team by workspaceId and teamId", async () => {
  const repository = new InMemoryTeamRepository();

  const created = await repository.create({
    workspaceId: "ws-1",
    name: "Frontend Core",
    slug: "frontend-core",
  });

  const retrieved = await repository.findById("ws-1", created.id);

  assert.deepEqual(retrieved, created);
});

test("lists teams belonging to a specific workspace", async () => {
  const repository = new InMemoryTeamRepository();

  const team1 = await repository.create({
    workspaceId: "ws-1",
    name: "Backend Team",
    slug: "backend-team",
  });

  const team2 = await repository.create({
    workspaceId: "ws-1",
    name: "DevOps Team",
    slug: "devops-team",
  });

  const ws1Teams = await repository.findAllByWorkspaceId("ws-1");

  assert.equal(ws1Teams.length, 2);
  assert.deepEqual(
    ws1Teams.map((t) => t.id),
    [team1.id, team2.id],
  );
});

test("enforces tenant isolation and does not return teams belonging to another workspace", async () => {
  const repository = new InMemoryTeamRepository();

  const ws1Team = await repository.create({
    workspaceId: "ws-1",
    name: "Team Alpha",
    slug: "team-alpha",
  });

  await repository.create({
    workspaceId: "ws-2",
    name: "Team Beta",
    slug: "team-beta",
  });

  // Querying ws-1 teams returns only ws1Team
  const ws1Teams = await repository.findAllByWorkspaceId("ws-1");
  assert.equal(ws1Teams.length, 1);
  assert.equal(ws1Teams[0]?.id, ws1Team.id);

  // Querying findById with wrong workspaceId returns null
  const crossTenantResult = await repository.findById("ws-2", ws1Team.id);
  assert.equal(crossTenantResult, null);
});

test("finds a team by workspaceId and slug", async () => {
  const repository = new InMemoryTeamRepository();

  const created = await repository.create({
    workspaceId: "ws-1",
    name: "Security Engineering",
    slug: "security-engineering",
  });

  const found = await repository.findByWorkspaceAndSlug(
    "ws-1",
    "security-engineering",
  );

  assert.deepEqual(found, created);
});

test("rejects duplicate team slug within the same workspace", async () => {
  const repository = new InMemoryTeamRepository();

  await repository.create({
    workspaceId: "ws-1",
    name: "Backend Team",
    slug: "backend-team",
  });

  await assert.rejects(
    async () => {
      await repository.create({
        workspaceId: "ws-1",
        name: "Backend Team Duplicate",
        slug: "backend-team",
      });
    },
    TeamSlugAlreadyExistsError,
  );
});

test("allows identical team slug across different workspaces", async () => {
  const repository = new InMemoryTeamRepository();

  const teamWs1 = await repository.create({
    workspaceId: "ws-1",
    name: "Backend Team",
    slug: "backend-team",
  });

  const teamWs2 = await repository.create({
    workspaceId: "ws-2",
    name: "Backend Team",
    slug: "backend-team",
  });

  assert.equal(teamWs1.slug, "backend-team");
  assert.equal(teamWs2.slug, "backend-team");
  assert.notEqual(teamWs1.id, teamWs2.id);
  assert.notEqual(teamWs1.workspaceId, teamWs2.workspaceId);
});

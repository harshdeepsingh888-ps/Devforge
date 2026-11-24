import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";

import { prisma } from "../../../../infrastructure/database/prisma.js";
import { PrismaWorkspaceRepository } from "./prisma-workspace.repository.js";
import { WorkspaceOwnerRequiredError } from "../../workspace.errors.js";

/**
 * Runs against the real PostgreSQL database named by DATABASE_URL, like the
 * invitation integration test. It proves what the in-memory repository
 * cannot: that removing a member, clearing their team memberships and
 * unassigning their work items is one transaction, and that the
 * "keep an OWNER" rule holds even under concurrent removals.
 */
test("PrismaWorkspaceRepository.removeMember cleans teams and assignments atomically and keeps an OWNER", async (t) => {
  await prisma.$connect();

  const suffix = randomUUID();

  const createUser = (label: string) =>
    prisma.user.create({
      data: {
        email: `${label}-${suffix}@example.com`,
        passwordHash: "hash",
        displayName: label,
      },
    });

  const owner = await createUser("owner");
  const leaver = await createUser("leaver");
  const bystander = await createUser("bystander");

  const workspace = await prisma.workspace.create({
    data: { name: "Members Integration", slug: `members-integration-${suffix}` },
  });
  const otherWorkspace = await prisma.workspace.create({
    data: { name: "Other Integration", slug: `other-integration-${suffix}` },
  });

  t.after(async () => {
    await prisma.workspace.deleteMany({
      where: { id: { in: [workspace.id, otherWorkspace.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [owner.id, leaver.id, bystander.id] } },
    });
    await prisma.$disconnect();
  });

  const repository = new PrismaWorkspaceRepository(prisma);

  await repository.addMember({ workspaceId: workspace.id, userId: owner.id, role: "OWNER" });
  await repository.addMember({ workspaceId: workspace.id, userId: leaver.id, role: "DEVELOPER" });
  await repository.addMember({ workspaceId: workspace.id, userId: bystander.id, role: "DEVELOPER" });
  await repository.addMember({ workspaceId: otherWorkspace.id, userId: leaver.id, role: "OWNER" });

  const team = await prisma.team.create({
    data: {
      workspaceId: workspace.id,
      name: "Core",
      slug: "core",
      members: { create: [{ userId: leaver.id }, { userId: bystander.id }] },
    },
  });
  const otherTeam = await prisma.team.create({
    data: {
      workspaceId: otherWorkspace.id,
      name: "Other",
      slug: "other",
      members: { create: [{ userId: leaver.id }] },
    },
  });

  async function createWorkItem(workspaceId: string, assigneeUserId: string, title: string) {
    const project = await prisma.project.create({
      data: { workspaceId, name: `Project ${title}` },
    });
    const workflow = await prisma.workflow.create({
      data: {
        workspaceId,
        projectId: project.id,
        name: "Default",
        states: { create: [{ name: "Todo", position: 0, isInitial: true }] },
      },
      include: { states: true },
    });

    return prisma.workItem.create({
      data: {
        workspaceId,
        projectId: project.id,
        type: "TASK",
        title,
        workflowId: workflow.id,
        workflowStateId: workflow.states[0]!.id,
        assigneeUserId,
        reporterUserId: owner.id,
      },
    });
  }

  const leaverItem = await createWorkItem(workspace.id, leaver.id, "leaver");
  const bystanderItem = await createWorkItem(workspace.id, bystander.id, "bystander");
  const elsewhereItem = await createWorkItem(otherWorkspace.id, leaver.id, "elsewhere");

  // Removing a DEVELOPER takes their membership, team rows and assignments
  // in this workspace with them, and nothing in the other workspace.
  assert.equal(await repository.removeMember(workspace.id, leaver.id), true);

  assert.equal(await repository.findMembership(workspace.id, leaver.id), null);
  assert.equal(
    await prisma.teamMember.count({ where: { teamId: team.id, userId: leaver.id } }),
    0,
  );
  assert.equal(
    await prisma.teamMember.count({ where: { teamId: team.id, userId: bystander.id } }),
    1,
  );
  assert.equal(
    await prisma.teamMember.count({ where: { teamId: otherTeam.id, userId: leaver.id } }),
    1,
  );

  const leaverItemAfter = await prisma.workItem.findUniqueOrThrow({ where: { id: leaverItem.id } });
  assert.equal(leaverItemAfter.assigneeUserId, null);
  const bystanderItemAfter = await prisma.workItem.findUniqueOrThrow({
    where: { id: bystanderItem.id },
  });
  assert.equal(bystanderItemAfter.assigneeUserId, bystander.id);
  const elsewhereItemAfter = await prisma.workItem.findUniqueOrThrow({
    where: { id: elsewhereItem.id },
  });
  assert.equal(elsewhereItemAfter.assigneeUserId, leaver.id);

  const otherMembership = await repository.findMembership(otherWorkspace.id, leaver.id);
  assert.equal(otherMembership?.role, "OWNER");

  // Removing someone who is not a member is a no-op.
  assert.equal(await repository.removeMember(workspace.id, leaver.id), false);

  // The last OWNER cannot be removed or demoted; the transaction rolls back
  // before any of the cleanup runs.
  const ownerItem = await createWorkItem(workspace.id, owner.id, "owner");
  await prisma.teamMember.create({ data: { teamId: team.id, userId: owner.id } });

  await assert.rejects(
    () => repository.removeMember(workspace.id, owner.id),
    WorkspaceOwnerRequiredError,
  );
  await assert.rejects(
    () => repository.updateMemberRole(workspace.id, owner.id, "ADMIN"),
    WorkspaceOwnerRequiredError,
  );

  const ownerMembership = await repository.findMembership(workspace.id, owner.id);
  assert.equal(ownerMembership?.role, "OWNER");
  assert.equal(
    await prisma.teamMember.count({ where: { teamId: team.id, userId: owner.id } }),
    1,
  );
  const ownerItemAfter = await prisma.workItem.findUniqueOrThrow({ where: { id: ownerItem.id } });
  assert.equal(ownerItemAfter.assigneeUserId, owner.id);

  // Two OWNERs leaving at the same time: exactly one succeeds, because the
  // workspace row lock makes the second check see the first removal.
  await repository.updateMemberRole(workspace.id, bystander.id, "OWNER");
  assert.equal(await repository.countMembersWithRole(workspace.id, "OWNER"), 2);

  const outcomes = await Promise.all(
    [owner.id, bystander.id].map((userId) =>
      repository.removeMember(workspace.id, userId).then(
        (removed) => ({ removed, error: null as unknown }),
        (error: unknown) => ({ removed: false, error }),
      ),
    ),
  );

  const removals = outcomes.filter((outcome) => outcome.removed);
  const rejections = outcomes.filter((outcome) => outcome.error !== null);
  assert.equal(removals.length, 1);
  assert.equal(rejections.length, 1);
  assert.ok(rejections[0]?.error instanceof WorkspaceOwnerRequiredError);
  assert.equal(await repository.countMembersWithRole(workspace.id, "OWNER"), 1);
});

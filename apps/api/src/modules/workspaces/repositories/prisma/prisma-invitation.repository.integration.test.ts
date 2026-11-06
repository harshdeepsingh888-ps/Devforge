import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";

import { prisma } from "../../../../infrastructure/database/prisma.js";
import { PrismaInvitationRepository } from "./prisma-invitation.repository.js";
import { WorkspaceMembershipAlreadyExistsError } from "../../workspace.errors.js";

/**
 * Runs against the real PostgreSQL database named by DATABASE_URL, like the
 * work-management integration test. It exercises the one piece the in-memory
 * repository cannot prove: that accept() is a single transaction with
 * compare-and-set semantics.
 */
test("PrismaInvitationRepository.accept is atomic and single-use against a real database", async (t) => {
  await prisma.$connect();

  const suffix = randomUUID();
  const inviter = await prisma.user.create({
    data: {
      email: `inviter-${suffix}@example.com`,
      passwordHash: "hash",
      displayName: "Inviter",
    },
  });
  const invitee = await prisma.user.create({
    data: {
      email: `invitee-${suffix}@example.com`,
      passwordHash: "hash",
      displayName: "Invitee",
    },
  });
  const workspace = await prisma.workspace.create({
    data: { name: "Invite Integration", slug: `invite-integration-${suffix}` },
  });

  t.after(async () => {
    await prisma.workspace.delete({ where: { id: workspace.id } });
    await prisma.user.deleteMany({ where: { id: { in: [inviter.id, invitee.id] } } });
    await prisma.$disconnect();
  });

  const repository = new PrismaInvitationRepository(prisma);

  const invitation = await repository.create({
    workspaceId: workspace.id,
    email: invitee.email,
    role: "DEVELOPER",
    tokenHash: `hash-${suffix}`,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    invitedByUserId: inviter.id,
  });
  assert.equal(invitation.status, "PENDING");

  const membershipInput = {
    workspaceId: workspace.id,
    userId: invitee.id,
    role: "DEVELOPER" as const,
  };

  // Two concurrent accepts: exactly one wins, the other sees null
  const [first, second] = await Promise.all([
    repository.accept({ invitationId: invitation.id, membership: membershipInput }),
    repository.accept({ invitationId: invitation.id, membership: membershipInput }),
  ]);
  const winners = [first, second].filter((result) => result !== null);
  assert.equal(winners.length, 1);
  assert.equal(winners[0]?.invitation.status, "ACCEPTED");
  assert.equal(winners[0]?.membership.userId, invitee.id);

  const memberships = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id, userId: invitee.id },
  });
  assert.equal(memberships.length, 1);

  // A second invitation for someone who is already a member rolls back cleanly
  const duplicate = await repository.create({
    workspaceId: workspace.id,
    email: invitee.email,
    role: "VIEWER",
    tokenHash: `hash-dup-${suffix}`,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    invitedByUserId: inviter.id,
  });

  await assert.rejects(
    async () => {
      await repository.accept({ invitationId: duplicate.id, membership: membershipInput });
    },
    WorkspaceMembershipAlreadyExistsError,
  );

  const duplicateAfter = await repository.findById(workspace.id, duplicate.id);
  assert.equal(duplicateAfter?.status, "PENDING", "status flip must roll back with the failed insert");

  const stillOne = await prisma.workspaceMember.count({
    where: { workspaceId: workspace.id, userId: invitee.id },
  });
  assert.equal(stillOne, 1);
});

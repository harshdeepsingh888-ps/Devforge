import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryInvitationRepository } from "./in-memory-invitation.repository.js";

test("creates and retrieves an invitation by id and workspaceId", async () => {
  const repository = new InMemoryInvitationRepository();

  const invitation = await repository.create({
    workspaceId: "ws-1",
    email: "Developer@Example.com ",
    role: "DEVELOPER",
    tokenHash: "hash-123",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    invitedByUserId: "owner-1",
  });

  assert.ok(invitation.id);
  assert.equal(invitation.workspaceId, "ws-1");
  assert.equal(invitation.email, "developer@example.com");
  assert.equal(invitation.role, "DEVELOPER");
  assert.equal(invitation.tokenHash, "hash-123");
  assert.equal(invitation.status, "PENDING");

  const retrieved = await repository.findById("ws-1", invitation.id);
  assert.deepEqual(retrieved, invitation);

  const crossTenant = await repository.findById("ws-2", invitation.id);
  assert.equal(crossTenant, null);
});

test("finds an invitation by token hash", async () => {
  const repository = new InMemoryInvitationRepository();

  const created = await repository.create({
    workspaceId: "ws-1",
    email: "dev@example.com",
    role: "ADMIN",
    tokenHash: "secret-token-hash-999",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    invitedByUserId: "owner-1",
  });

  const found = await repository.findByTokenHash("secret-token-hash-999");
  assert.deepEqual(found, created);

  const missing = await repository.findByTokenHash("unknown-hash");
  assert.equal(missing, null);
});

test("finds pending invitation by workspace and normalized email", async () => {
  const repository = new InMemoryInvitationRepository();

  const created = await repository.create({
    workspaceId: "ws-1",
    email: "  Alice@Company.com  ",
    role: "DEVELOPER",
    tokenHash: "hash-alice",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    invitedByUserId: "owner-1",
  });

  const found = await repository.findPendingByWorkspaceAndEmail(
    "ws-1",
    "ALICE@COMPANY.COM",
  );
  assert.deepEqual(found, created);

  // Updating status to ACCEPTED means it is no longer pending
  await repository.updateStatus(created.id, "ACCEPTED");

  const afterAccepted = await repository.findPendingByWorkspaceAndEmail(
    "ws-1",
    "alice@company.com",
  );
  assert.equal(afterAccepted, null);
});

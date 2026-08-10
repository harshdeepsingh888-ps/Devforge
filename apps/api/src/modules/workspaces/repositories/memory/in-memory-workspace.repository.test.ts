import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryWorkspaceRepository } from "./in-memory-workspace.repository.js";

test("creates and retrieves a workspace", async () => {
  const repository =
    new InMemoryWorkspaceRepository();

  const workspace =
    await repository.create({
      name: "DevForge",
      slug: "devforge",
    });

  const result =
    await repository.findById(
      workspace.id,
    );

  assert.deepEqual(
    result,
    workspace,
  );
});

test("finds a workspace by slug", async () => {
  const repository =
    new InMemoryWorkspaceRepository();

  const workspace =
    await repository.create({
      name: "DevForge",
      slug: "devforge",
    });

  const result =
    await repository.findBySlug(
      "devforge",
    );

  assert.deepEqual(
    result,
    workspace,
  );
});

test("returns null for an unknown workspace", async () => {
  const repository =
    new InMemoryWorkspaceRepository();

  assert.equal(
    await repository.findById(
      "missing-workspace",
    ),
    null,
  );

  assert.equal(
    await repository.findBySlug(
      "missing-workspace",
    ),
    null,
  );
});

test("adds and retrieves workspace membership", async () => {
  const repository =
    new InMemoryWorkspaceRepository();

  const workspace =
    await repository.create({
      name: "DevForge",
      slug: "devforge",
    });

  const membership =
    await repository.addMember({
      workspaceId: workspace.id,
      userId: "user-1",
      role: "OWNER",
    });

  const result =
    await repository.findMembership(
      workspace.id,
      "user-1",
    );

  assert.deepEqual(
    result,
    membership,
  );
});

test("lists workspace memberships", async () => {
  const repository =
    new InMemoryWorkspaceRepository();

  const workspace =
    await repository.create({
      name: "DevForge",
      slug: "devforge",
    });

  await repository.addMember({
    workspaceId: workspace.id,
    userId: "user-1",
    role: "OWNER",
  });

  await repository.addMember({
    workspaceId: workspace.id,
    userId: "user-2",
    role: "MEMBER",
  });

  const memberships =
    await repository.listMemberships(
      workspace.id,
    );

  assert.equal(
    memberships.length,
    2,
  );

  assert.deepEqual(
    memberships.map(
      (membership) =>
        membership.userId,
    ),
    ["user-1", "user-2"],
  );
});

test("updates a member role", async () => {
  const repository =
    new InMemoryWorkspaceRepository();

  const workspace =
    await repository.create({
      name: "DevForge",
      slug: "devforge",
    });

  await repository.addMember({
    workspaceId: workspace.id,
    userId: "user-1",
    role: "MEMBER",
  });

  const updated =
    await repository.updateMemberRole(
      workspace.id,
      "user-1",
      "OWNER",
    );

  assert.equal(
    updated?.role,
    "OWNER",
  );
});

test("returns null when updating a missing membership", async () => {
  const repository =
    new InMemoryWorkspaceRepository();

  const result =
    await repository.updateMemberRole(
      "workspace-1",
      "user-1",
      "OWNER",
    );

  assert.equal(result, null);
});

test("removes a workspace member", async () => {
  const repository =
    new InMemoryWorkspaceRepository();

  const workspace =
    await repository.create({
      name: "DevForge",
      slug: "devforge",
    });

  await repository.addMember({
    workspaceId: workspace.id,
    userId: "user-1",
    role: "MEMBER",
  });

  assert.equal(
    await repository.removeMember(
      workspace.id,
      "user-1",
    ),
    true,
  );

  assert.equal(
    await repository.findMembership(
      workspace.id,
      "user-1",
    ),
    null,
  );
});

test("returns false when removing a missing membership", async () => {
  const repository =
    new InMemoryWorkspaceRepository();

  assert.equal(
    await repository.removeMember(
      "workspace-1",
      "user-1",
    ),
    false,
  );
});
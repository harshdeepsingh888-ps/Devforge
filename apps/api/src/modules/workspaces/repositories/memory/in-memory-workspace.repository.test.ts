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

test("finds all workspaces for a user with their membership", async () => {
  const repository =
    new InMemoryWorkspaceRepository();

  const workspaceOne =
    await repository.create({
      name: "DevForge",
      slug: "devforge",
    });

  const workspaceTwo =
    await repository.create({
      name: "SideProject",
      slug: "side-project",
    });

  await repository.addMember({
    workspaceId: workspaceOne.id,
    userId: "user-1",
    role: "OWNER",
  });

  await repository.addMember({
    workspaceId: workspaceTwo.id,
    userId: "user-1",
    role: "MEMBER",
  });

  await repository.addMember({
    workspaceId: workspaceTwo.id,
    userId: "user-2",
    role: "OWNER",
  });

  const workspaces =
    await repository.findForUser(
      "user-1",
    );

  assert.equal(
    workspaces.length,
    2,
  );

  assert.deepEqual(
    workspaces.map(
      (workspace) =>
        workspace.id,
    ),
    [
      workspaceOne.id,
      workspaceTwo.id,
    ],
  );

  assert.equal(
    workspaces[0]?.membership.userId,
    "user-1",
  );

  assert.equal(
    workspaces[0]?.membership.role,
    "OWNER",
  );

  assert.equal(
    workspaces[1]?.membership.userId,
    "user-1",
  );

  assert.equal(
    workspaces[1]?.membership.role,
    "MEMBER",
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
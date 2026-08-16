import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryWorkspaceRepository } from "../repositories/memory/in-memory-workspace.repository.js";
import {
  WorkspaceNotFoundError,
  WorkspaceSlugAlreadyExistsError,
  WorkspaceMembershipAlreadyExistsError,
} from "../workspace.errors.js";
import { WorkspaceService, slugify } from "./workspace.service.js";

test("slugify correctly formats workspace names and custom slugs", () => {
  assert.equal(slugify("DevForge SaaS Platform!"), "devforge-saas-platform");
  assert.equal(slugify("  My  Workspace _ 123 "), "my-workspace-123");
  assert.equal(slugify("---test--slug---"), "test-slug");
});

test("creates a workspace and automatically assigns creator as OWNER", async () => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);

  const result = await service.createWorkspace({
    name: "DevForge Engineering",
    creatorUserId: "user-owner-1",
  });

  assert.equal(result.name, "DevForge Engineering");
  assert.equal(result.slug, "devforge-engineering");
  assert.equal(result.membership.userId, "user-owner-1");
  assert.equal(result.membership.role, "OWNER");

  const fetched = await service.getWorkspaceForUser(
    result.id,
    "user-owner-1",
  );
  assert.equal(fetched.id, result.id);
});

test("prevents creating workspaces with duplicate slugs", async () => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);

  await service.createWorkspace({
    name: "DevForge",
    slug: "devforge",
    creatorUserId: "user-1",
  });

  await assert.rejects(
    async () => {
      await service.createWorkspace({
        name: "DevForge Alternate",
        slug: "devforge",
        creatorUserId: "user-2",
      });
    },
    WorkspaceSlugAlreadyExistsError,
  );
});

test("lists workspaces belonging to a user", async () => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);

  const ws1 = await service.createWorkspace({
    name: "Primary Workspace",
    creatorUserId: "user-1",
  });

  const ws2 = await service.createWorkspace({
    name: "Secondary Workspace",
    creatorUserId: "user-2",
  });

  await service.addMember({
    workspaceId: ws2.id,
    actorUserId: "user-2",
    targetUserId: "user-1",
    role: "MEMBER",
  });

  const userWorkspaces = await service.listUserWorkspaces("user-1");
  assert.equal(userWorkspaces.length, 2);
  assert.equal(userWorkspaces[0]?.id, ws1.id);
  assert.equal(userWorkspaces[0]?.membership.role, "OWNER");
  assert.equal(userWorkspaces[1]?.id, ws2.id);
  assert.equal(userWorkspaces[1]?.membership.role, "MEMBER");
});

test("hides workspace details from non-members by throwing WorkspaceNotFoundError", async () => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);

  const workspace = await service.createWorkspace({
    name: "Secret Team Workspace",
    creatorUserId: "user-1",
  });

  await assert.rejects(
    async () => {
      await service.getWorkspaceForUser(workspace.id, "unauthorized-user");
    },
    WorkspaceNotFoundError,
  );
});

test("only workspace OWNER can add new members", async () => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);

  const workspace = await service.createWorkspace({
    name: "Team Space",
    creatorUserId: "owner-id",
  });

  // Owner adds a member
  await service.addMember({
    workspaceId: workspace.id,
    actorUserId: "owner-id",
    targetUserId: "member-id",
    role: "MEMBER",
  });

  // Member attempts to add another member -> throws WorkspaceNotFoundError (authorization barrier)
  await assert.rejects(
    async () => {
      await service.addMember({
        workspaceId: workspace.id,
        actorUserId: "member-id",
        targetUserId: "other-id",
        role: "MEMBER",
      });
    },
    WorkspaceNotFoundError,
  );
});

test("prevents adding duplicate members to the same workspace", async () => {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceService(repository);

  const workspace = await service.createWorkspace({
    name: "Team Space",
    creatorUserId: "owner-id",
  });

  await service.addMember({
    workspaceId: workspace.id,
    actorUserId: "owner-id",
    targetUserId: "member-id",
    role: "MEMBER",
  });

  await assert.rejects(
    async () => {
      await service.addMember({
        workspaceId: workspace.id,
        actorUserId: "owner-id",
        targetUserId: "member-id",
        role: "MEMBER",
      });
    },
    WorkspaceMembershipAlreadyExistsError,
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../../../infrastructure/database/prisma.js";
import { PrismaWorkItemRepository } from "./prisma-work-item.repository.js";
import { PrismaWorkflowRepository } from "./prisma-workflow.repository.js";
import { PrismaCommentRepository } from "./prisma-comment.repository.js";
import { PrismaWorkItemHistoryRepository } from "./prisma-work-item-history.repository.js";
import { WorkItemService } from "../../services/work-item.service.js";

test("Real PostgreSQL Database V2 Integration & Persistence Verification", async () => {
  // Verify database connection
  await prisma.$connect();

  const workItemRepo = new PrismaWorkItemRepository(prisma);
  const workflowRepo = new PrismaWorkflowRepository(prisma);
  const commentRepo = new PrismaCommentRepository(prisma);
  const historyRepo = new PrismaWorkItemHistoryRepository(prisma);

  // Setup minimal DB entities in PostgreSQL
  const user = await prisma.user.create({
    data: {
      email: `db-test-${Date.now()}@devforge.io`,
      passwordHash: "hash-123",
      displayName: "Real DB Tester",
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: "Real DB Workspace",
      slug: `real-db-ws-${Date.now()}`,
    },
  });

  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      role: "OWNER",
    },
  });

  const project = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Real DB Project",
    },
  });

  // Mock workspace & project repos for WorkItemService
  const workspaceRepoMock: any = {
    findMembership: async (wsId: string, uId: string) => {
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: wsId, userId: uId } },
      });
      return member ? { workspaceId: member.workspaceId, role: member.role } : null;
    },
  };

  const projectRepoMock: any = {
    findById: async (wsId: string, pId: string) => {
      const p = await prisma.project.findFirst({ where: { id: pId, workspaceId: wsId } });
      return p ? { id: p.id, workspaceId: p.workspaceId, name: p.name } : null;
    },
  };

  const workItemService = new WorkItemService(
    workItemRepo,
    workflowRepo,
    workspaceRepoMock,
    projectRepoMock,
    undefined,
    commentRepo,
    historyRepo,
  );

  // 1. Create Workflow in PostgreSQL
  const workflow = await workflowRepo.createWorkflow({
    workspaceId: workspace.id,
    name: "Real DB Workflow",
    isDefault: true,
  });

  assert.ok(workflow.id);
  assert.equal(workflow.name, "Real DB Workflow");

  // 2. Create EPIC WorkItem in PostgreSQL
  const epic = await workItemService.createWorkItem({
    workspaceId: workspace.id,
    projectId: project.id,
    actorUserId: user.id,
    type: "EPIC",
    title: "PostgreSQL Real Epic",
    priority: "URGENT",
  });

  assert.ok(epic.id);
  assert.equal(epic.type, "EPIC");

  // 3. Create FEATURE under EPIC in PostgreSQL
  const feature = await workItemService.createWorkItem({
    workspaceId: workspace.id,
    projectId: project.id,
    actorUserId: user.id,
    type: "FEATURE",
    title: "PostgreSQL Real Feature",
    parentId: epic.id,
  });

  assert.equal(feature.parentId, epic.id);

  // 4. Transition State in PostgreSQL
  const states = await workflowRepo.findStatesByWorkflow(workflow.id);
  const inProgressState = states.find((s) => s.category === "STARTED")!;

  const transitioned = await workItemService.transitionState({
    workspaceId: workspace.id,
    workItemId: feature.id,
    actorUserId: user.id,
    targetStateId: inProgressState.id,
  });

  assert.equal(transitioned.workflowStateId, inProgressState.id);

  // 5. Add Comment in PostgreSQL
  const comment = await workItemService.addComment({
    workspaceId: workspace.id,
    workItemId: feature.id,
    actorUserId: user.id,
    content: "Persistence verified on PostgreSQL database.",
  });

  assert.equal(comment.content, "Persistence verified on PostgreSQL database.");

  // 6. Query Audit History from PostgreSQL
  const history = await historyRepo.findByWorkItem(workspace.id, feature.id);
  assert.ok(history.length >= 2);

  // Cleanup test data
  await prisma.workspace.delete({ where: { id: workspace.id } });
  await prisma.user.delete({ where: { id: user.id } });
});

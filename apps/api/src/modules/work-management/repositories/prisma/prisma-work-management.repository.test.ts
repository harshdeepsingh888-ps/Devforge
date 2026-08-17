import assert from "node:assert/strict";
import test from "node:test";

import { PrismaWorkItemRepository } from "./prisma-work-item.repository.js";
import { PrismaWorkflowRepository } from "./prisma-workflow.repository.js";
import { PrismaCommentRepository } from "./prisma-comment.repository.js";
import { PrismaWorkItemHistoryRepository } from "./prisma-work-item-history.repository.js";

test("Prisma Repositories Interface Adherence & Domain Mapping", async () => {
  const mockWorkItemDb = {
    workItem: {
      create: async (args: any) => ({ id: "item-1", ...args.data, createdAt: new Date(), updatedAt: new Date() }),
      findFirst: async (args: any) => ({ id: args.where.id ?? "item-1", workspaceId: args.where.workspaceId, projectId: "p-1", type: "TASK", title: "Task 1", workflowId: "wf-1", workflowStateId: "ws-1", reporterUserId: "user-1", priority: "MEDIUM", createdAt: new Date(), updatedAt: new Date() }),
      findMany: async (args: any) => [],
      update: async (args: any) => ({ id: args.where.id, ...args.data, updatedAt: new Date() }),
      delete: async (args: any) => ({ id: args.where.id }),
    },
  };

  const workItemRepo = new PrismaWorkItemRepository(mockWorkItemDb as any);

  const createdItem = await workItemRepo.create({
    workspaceId: "ws-1",
    projectId: "p-1",
    type: "TASK",
    title: "Test Prisma Task",
    workflowId: "wf-1",
    workflowStateId: "ws-1",
    reporterUserId: "user-1",
  });

  assert.equal(createdItem.title, "Test Prisma Task");
  assert.equal(createdItem.workspaceId, "ws-1");

  const fetchedItem = await workItemRepo.findById("ws-1", "item-1");
  assert.ok(fetchedItem);
  assert.equal(fetchedItem.id, "item-1");
});

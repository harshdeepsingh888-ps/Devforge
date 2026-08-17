import type { PrismaClient } from "../../../../generated/prisma/client.js";
import { prisma } from "../../../../infrastructure/database/prisma.js";
import type {
  CreateWorkItemInput,
  WorkItem,
} from "../../work-management.types.js";
import type { WorkItemRepository } from "../work-item.repository.js";

type WorkItemDatabaseClient = Pick<PrismaClient, "workItem">;

function toWorkItemDomain(raw: any): WorkItem {
  return {
    id: raw.id,
    workspaceId: raw.workspaceId,
    projectId: raw.projectId,
    type: raw.type,
    title: raw.title,
    description: raw.description ?? null,
    parentId: raw.parentId ?? null,
    workflowId: raw.workflowId,
    workflowStateId: raw.workflowStateId,
    assigneeUserId: raw.assigneeUserId ?? null,
    teamId: raw.teamId ?? null,
    reporterUserId: raw.reporterUserId,
    priority: raw.priority,
    storyPoints: raw.storyPoints ?? null,
    completedAt: raw.completedAt ? (raw.completedAt instanceof Date ? raw.completedAt.toISOString() : raw.completedAt) : null,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  } as WorkItem;
}

export class PrismaWorkItemRepository implements WorkItemRepository {
  constructor(
    private readonly database: WorkItemDatabaseClient = prisma,
  ) {}

  async create(input: CreateWorkItemInput): Promise<WorkItem> {
    const item = await this.database.workItem.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        type: input.type,
        title: input.title.trim(),
        description: input.description ?? null,
        parentId: input.parentId ?? null,
        workflowId: input.workflowId,
        workflowStateId: input.workflowStateId ?? "",
        assigneeUserId: input.assigneeUserId ?? null,
        teamId: input.teamId ?? null,
        reporterUserId: input.reporterUserId,
        priority: input.priority ?? "MEDIUM",
        storyPoints: input.storyPoints ?? null,
      },
    });

    return toWorkItemDomain(item);
  }

  async findById(
    workspaceId: string,
    workItemId: string,
  ): Promise<WorkItem | null> {
    const item = await this.database.workItem.findFirst({
      where: { id: workItemId, workspaceId },
    });
    return item ? toWorkItemDomain(item) : null;
  }

  async findByWorkspace(
    workspaceId: string,
    projectId?: string | undefined,
  ): Promise<WorkItem[]> {
    const items = await this.database.workItem.findMany({
      where: {
        workspaceId,
        ...(projectId && { projectId }),
      },
    });
    return items.map(toWorkItemDomain);
  }

  async findChildren(
    workspaceId: string,
    parentId: string,
  ): Promise<WorkItem[]> {
    const items = await this.database.workItem.findMany({
      where: { workspaceId, parentId },
    });
    return items.map(toWorkItemDomain);
  }

  async findAncestors(
    workspaceId: string,
    workItemId: string,
  ): Promise<WorkItem[]> {
    const ancestors: WorkItem[] = [];
    let currentId: string | null = workItemId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const current = await this.findById(workspaceId, currentId);
      if (!current || !current.parentId) break;

      const parent = await this.findById(workspaceId, current.parentId);
      if (!parent) break;

      ancestors.push(parent);
      currentId = parent.id;
    }

    return ancestors;
  }

  async update(
    workspaceId: string,
    workItemId: string,
    updates: Partial<WorkItem>,
  ): Promise<WorkItem | null> {
    const existing = await this.findById(workspaceId, workItemId);
    if (!existing) return null;

    const data: Record<string, any> = {};
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.priority !== undefined) data.priority = updates.priority;
    if (updates.storyPoints !== undefined) data.storyPoints = updates.storyPoints;
    if (updates.assigneeUserId !== undefined) data.assigneeUserId = updates.assigneeUserId;
    if (updates.teamId !== undefined) data.teamId = updates.teamId;
    if (updates.parentId !== undefined) data.parentId = updates.parentId;
    if (updates.workflowStateId !== undefined) data.workflowStateId = updates.workflowStateId;
    if (updates.completedAt !== undefined)
      data.completedAt = updates.completedAt ? new Date(updates.completedAt) : null;

    const updated = await this.database.workItem.update({
      where: { id: workItemId },
      data,
    });

    return toWorkItemDomain(updated);
  }

  async delete(workspaceId: string, workItemId: string): Promise<boolean> {
    const existing = await this.findById(workspaceId, workItemId);
    if (!existing) return false;

    await this.database.workItem.delete({
      where: { id: workItemId },
    });
    return true;
  }
}

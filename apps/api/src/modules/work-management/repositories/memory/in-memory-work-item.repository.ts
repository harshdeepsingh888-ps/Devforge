import { randomUUID } from "node:crypto";

import type {
  CreateWorkItemInput,
  WorkItem,
} from "../../work-management.types.js";
import type { WorkItemRepository } from "../work-item.repository.js";

export class InMemoryWorkItemRepository implements WorkItemRepository {
  private readonly workItems = new Map<string, WorkItem>();

  async create(input: CreateWorkItemInput): Promise<WorkItem> {
    const timestamp = new Date().toISOString();

    const base = {
      id: randomUUID(),
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
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const workItem = base as WorkItem;
    this.workItems.set(workItem.id, workItem);
    return workItem;
  }

  async findById(
    workspaceId: string,
    workItemId: string,
  ): Promise<WorkItem | null> {
    const item = this.workItems.get(workItemId);
    if (!item || item.workspaceId !== workspaceId) {
      return null;
    }
    return item;
  }

  async findByWorkspace(
    workspaceId: string,
    projectId?: string | undefined,
  ): Promise<WorkItem[]> {
    const results: WorkItem[] = [];
    for (const item of this.workItems.values()) {
      if (item.workspaceId === workspaceId) {
        if (!projectId || item.projectId === projectId) {
          results.push(item);
        }
      }
    }
    return results;
  }

  async findChildren(
    workspaceId: string,
    parentId: string,
  ): Promise<WorkItem[]> {
    const results: WorkItem[] = [];
    for (const item of this.workItems.values()) {
      if (item.workspaceId === workspaceId && item.parentId === parentId) {
        results.push(item);
      }
    }
    return results;
  }

  async findAncestors(
    workspaceId: string,
    workItemId: string,
  ): Promise<WorkItem[]> {
    const ancestors: WorkItem[] = [];
    let currentId: string | null = workItemId;

    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) {
        break; // Guard against existing cycles in store
      }
      visited.add(currentId);

      const currentItem = await this.findById(workspaceId, currentId);
      if (!currentItem || !currentItem.parentId) {
        break;
      }

      const parent = await this.findById(workspaceId, currentItem.parentId);
      if (!parent) {
        break;
      }

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
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    } as WorkItem;

    this.workItems.set(workItemId, updated);
    return updated;
  }

  async delete(workspaceId: string, workItemId: string): Promise<boolean> {
    const existing = await this.findById(workspaceId, workItemId);
    if (!existing) {
      return false;
    }
    return this.workItems.delete(workItemId);
  }
}

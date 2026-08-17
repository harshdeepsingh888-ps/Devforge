import type { CreateWorkItemInput, WorkItem } from "../work-management.types.js";

export interface WorkItemRepository {
  create(input: CreateWorkItemInput): Promise<WorkItem>;

  findById(
    workspaceId: string,
    workItemId: string,
  ): Promise<WorkItem | null>;

  findByWorkspace(
    workspaceId: string,
    projectId?: string | undefined,
  ): Promise<WorkItem[]>;

  findChildren(
    workspaceId: string,
    parentId: string,
  ): Promise<WorkItem[]>;

  findAncestors(
    workspaceId: string,
    workItemId: string,
  ): Promise<WorkItem[]>;

  update(
    workspaceId: string,
    workItemId: string,
    updates: Partial<WorkItem>,
  ): Promise<WorkItem | null>;

  delete(
    workspaceId: string,
    workItemId: string,
  ): Promise<boolean>;
}

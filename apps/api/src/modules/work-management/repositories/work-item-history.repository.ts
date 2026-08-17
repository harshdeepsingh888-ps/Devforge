import type { CreateWorkItemHistoryInput, WorkItemHistory } from "../work-management.types.js";

export interface WorkItemHistoryRepository {
  create(input: CreateWorkItemHistoryInput): Promise<WorkItemHistory>;
  findByWorkItem(workspaceId: string, workItemId: string): Promise<WorkItemHistory[]>;
}

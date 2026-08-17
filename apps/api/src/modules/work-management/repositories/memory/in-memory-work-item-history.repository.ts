import { randomUUID } from "node:crypto";

import type {
  CreateWorkItemHistoryInput,
  WorkItemHistory,
} from "../../work-management.types.js";
import type { WorkItemHistoryRepository } from "../work-item-history.repository.js";

export class InMemoryWorkItemHistoryRepository
  implements WorkItemHistoryRepository
{
  private readonly history = new Map<string, WorkItemHistory>();

  async create(input: CreateWorkItemHistoryInput): Promise<WorkItemHistory> {
    const entry: WorkItemHistory = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      workItemId: input.workItemId,
      actorUserId: input.actorUserId,
      action: input.action,
      fromStateId: input.fromStateId ?? null,
      toStateId: input.toStateId ?? null,
      fromAssigneeUserId: input.fromAssigneeUserId ?? null,
      toAssigneeUserId: input.toAssigneeUserId ?? null,
      metadataJson: input.metadataJson ?? null,
      createdAt: new Date().toISOString(),
    };

    this.history.set(entry.id, entry);
    return entry;
  }

  async findByWorkItem(
    workspaceId: string,
    workItemId: string,
  ): Promise<WorkItemHistory[]> {
    const results: WorkItemHistory[] = [];
    for (const entry of this.history.values()) {
      if (
        entry.workspaceId === workspaceId &&
        entry.workItemId === workItemId
      ) {
        results.push(entry);
      }
    }
    return results.sort(
      (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
    );
  }
}

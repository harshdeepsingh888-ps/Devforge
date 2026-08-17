import type { PrismaClient } from "../../../../generated/prisma/client.js";
import { prisma } from "../../../../infrastructure/database/prisma.js";
import type {
  CreateWorkItemHistoryInput,
  WorkItemHistory,
} from "../../work-management.types.js";
import type { WorkItemHistoryRepository } from "../work-item-history.repository.js";

type HistoryDatabaseClient = Pick<PrismaClient, "workItemHistory">;

function toHistoryDomain(raw: any): WorkItemHistory {
  return {
    id: raw.id,
    workspaceId: raw.workspaceId,
    workItemId: raw.workItemId,
    actorUserId: raw.actorUserId,
    action: raw.action,
    fromStateId: raw.fromStateId ?? null,
    toStateId: raw.toStateId ?? null,
    fromAssigneeUserId: raw.fromAssigneeUserId ?? null,
    toAssigneeUserId: raw.toAssigneeUserId ?? null,
    metadataJson: raw.metadataJson ?? null,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
  };
}

export class PrismaWorkItemHistoryRepository
  implements WorkItemHistoryRepository
{
  constructor(
    private readonly database: HistoryDatabaseClient = prisma,
  ) {}

  async create(input: CreateWorkItemHistoryInput): Promise<WorkItemHistory> {
    const entry = await this.database.workItemHistory.create({
      data: {
        workspaceId: input.workspaceId,
        workItemId: input.workItemId,
        actorUserId: input.actorUserId,
        action: input.action,
        fromStateId: input.fromStateId ?? null,
        toStateId: input.toStateId ?? null,
        fromAssigneeUserId: input.fromAssigneeUserId ?? null,
        toAssigneeUserId: input.toAssigneeUserId ?? null,
        metadataJson: input.metadataJson ?? null,
      },
    });

    return toHistoryDomain(entry);
  }

  async findByWorkItem(
    workspaceId: string,
    workItemId: string,
  ): Promise<WorkItemHistory[]> {
    const entries = await this.database.workItemHistory.findMany({
      where: { workspaceId, workItemId },
      orderBy: { createdAt: "asc" },
    });
    return entries.map(toHistoryDomain);
  }
}

import { randomUUID } from "node:crypto";
import type {
  ArchitectureDecision,
  CreateAdrInput,
  UpdateAdrInput,
  AdrStatus,
} from "../../architecture.types.js";
import type { ArchitectureDecisionRepository } from "../architecture.repository.js";

export class InMemoryArchitectureDecisionRepository
  implements ArchitectureDecisionRepository
{
  private readonly adrs = new Map<string, ArchitectureDecision>();

  async create(input: CreateAdrInput): Promise<ArchitectureDecision> {
    const timestamp = new Date().toISOString();
    const adr: ArchitectureDecision = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      title: input.title.trim(),
      status: "PROPOSED",
      context: input.context.trim(),
      decision: input.decision.trim(),
      consequences: input.consequences.trim(),
      createdByUserId: input.actorUserId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.adrs.set(adr.id, adr);
    return adr;
  }

  async findById(
    workspaceId: string,
    adrId: string,
  ): Promise<ArchitectureDecision | null> {
    const adr = this.adrs.get(adrId);
    if (!adr || adr.workspaceId !== workspaceId) {
      return null;
    }
    return adr;
  }

  async findByWorkspace(
    workspaceId: string,
    projectId?: string | null,
  ): Promise<ArchitectureDecision[]> {
    const results: ArchitectureDecision[] = [];
    for (const adr of this.adrs.values()) {
      if (adr.workspaceId !== workspaceId) continue;

      if (projectId !== undefined) {
        if (adr.projectId === projectId) {
          results.push(adr);
        }
      } else {
        results.push(adr);
      }
    }
    return results;
  }

  async update(
    workspaceId: string,
    adrId: string,
    updates: UpdateAdrInput,
  ): Promise<ArchitectureDecision | null> {
    const existing = await this.findById(workspaceId, adrId);
    if (!existing) return null;

    const updated: ArchitectureDecision = {
      ...existing,
      ...(updates.title !== undefined && { title: updates.title.trim() }),
      ...(updates.context !== undefined && { context: updates.context.trim() }),
      ...(updates.decision !== undefined && { decision: updates.decision.trim() }),
      ...(updates.consequences !== undefined && { consequences: updates.consequences.trim() }),
      updatedAt: new Date().toISOString(),
    };

    this.adrs.set(adrId, updated);
    return updated;
  }

  async updateStatus(
    workspaceId: string,
    adrId: string,
    status: AdrStatus,
  ): Promise<ArchitectureDecision | null> {
    const existing = await this.findById(workspaceId, adrId);
    if (!existing) return null;

    const updated: ArchitectureDecision = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };

    this.adrs.set(adrId, updated);
    return updated;
  }

  async delete(workspaceId: string, adrId: string): Promise<boolean> {
    const existing = await this.findById(workspaceId, adrId);
    if (!existing) return false;

    this.adrs.delete(adrId);
    return true;
  }
}

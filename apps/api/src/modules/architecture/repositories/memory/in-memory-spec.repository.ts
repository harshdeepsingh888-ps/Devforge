import { randomUUID } from "node:crypto";
import type {
  CreateSpecInput,
  SpecStatus,
  TechnicalSpecification,
  UpdateSpecInput,
} from "../../architecture.types.js";
import type { TechnicalSpecificationRepository } from "../spec.repository.js";

export class InMemoryTechnicalSpecificationRepository
  implements TechnicalSpecificationRepository
{
  private readonly specs = new Map<string, TechnicalSpecification>();

  async create(input: CreateSpecInput): Promise<TechnicalSpecification> {
    const timestamp = new Date().toISOString();
    const spec: TechnicalSpecification = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      title: input.title.trim(),
      summary: input.summary.trim(),
      content: input.content.trim(),
      status: "DRAFT",
      createdByUserId: input.actorUserId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.specs.set(spec.id, spec);
    return spec;
  }

  async findById(
    workspaceId: string,
    specId: string,
  ): Promise<TechnicalSpecification | null> {
    const spec = this.specs.get(specId);
    if (!spec || spec.workspaceId !== workspaceId) {
      return null;
    }
    return spec;
  }

  async findByProject(
    workspaceId: string,
    projectId: string,
  ): Promise<TechnicalSpecification[]> {
    const results: TechnicalSpecification[] = [];
    for (const spec of this.specs.values()) {
      if (
        spec.workspaceId === workspaceId &&
        spec.projectId === projectId
      ) {
        results.push(spec);
      }
    }
    return results;
  }

  async update(
    workspaceId: string,
    specId: string,
    updates: UpdateSpecInput,
  ): Promise<TechnicalSpecification | null> {
    const existing = await this.findById(workspaceId, specId);
    if (!existing) return null;

    const updated: TechnicalSpecification = {
      ...existing,
      ...(updates.title !== undefined && { title: updates.title.trim() }),
      ...(updates.summary !== undefined && { summary: updates.summary.trim() }),
      ...(updates.content !== undefined && { content: updates.content.trim() }),
      updatedAt: new Date().toISOString(),
    };

    this.specs.set(specId, updated);
    return updated;
  }

  async updateStatus(
    workspaceId: string,
    specId: string,
    status: SpecStatus,
  ): Promise<TechnicalSpecification | null> {
    const existing = await this.findById(workspaceId, specId);
    if (!existing) return null;

    const updated: TechnicalSpecification = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };

    this.specs.set(specId, updated);
    return updated;
  }

  async delete(workspaceId: string, specId: string): Promise<boolean> {
    const existing = await this.findById(workspaceId, specId);
    if (!existing) return false;

    this.specs.delete(specId);
    return true;
  }
}

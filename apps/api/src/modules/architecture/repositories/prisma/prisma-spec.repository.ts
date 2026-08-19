import type { PrismaClient } from "../../../../generated/prisma/client.js";
import type {
  CreateSpecInput,
  SpecStatus,
  TechnicalSpecification,
  UpdateSpecInput,
} from "../../architecture.types.js";
import type { TechnicalSpecificationRepository } from "../spec.repository.js";

export class PrismaTechnicalSpecificationRepository
  implements TechnicalSpecificationRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateSpecInput): Promise<TechnicalSpecification> {
    const created = await this.prisma.technicalSpecification.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        title: input.title,
        summary: input.summary,
        content: input.content,
        status: "DRAFT",
        createdByUserId: input.actorUserId,
      },
    });

    return this.mapToDomain(created);
  }

  async findById(
    workspaceId: string,
    specId: string,
  ): Promise<TechnicalSpecification | null> {
    const found = await this.prisma.technicalSpecification.findFirst({
      where: {
        id: specId,
        workspaceId,
      },
    });

    return found ? this.mapToDomain(found) : null;
  }

  async findByProject(
    workspaceId: string,
    projectId: string,
  ): Promise<TechnicalSpecification[]> {
    const records = await this.prisma.technicalSpecification.findMany({
      where: {
        workspaceId,
        projectId,
      },
      orderBy: { createdAt: "desc" },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async update(
    workspaceId: string,
    specId: string,
    updates: UpdateSpecInput,
  ): Promise<TechnicalSpecification | null> {
    const existing = await this.findById(workspaceId, specId);
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.technicalSpecification.update({
      where: { id: specId },
      data: {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.summary !== undefined && { summary: updates.summary }),
        ...(updates.content !== undefined && { content: updates.content }),
      },
    });

    return this.mapToDomain(updated);
  }

  async updateStatus(
    workspaceId: string,
    specId: string,
    status: SpecStatus,
  ): Promise<TechnicalSpecification | null> {
    const existing = await this.findById(workspaceId, specId);
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.technicalSpecification.update({
      where: { id: specId },
      data: { status },
    });

    return this.mapToDomain(updated);
  }

  async delete(workspaceId: string, specId: string): Promise<boolean> {
    const existing = await this.findById(workspaceId, specId);
    if (!existing) {
      return false;
    }

    await this.prisma.technicalSpecification.delete({
      where: { id: specId },
    });

    return true;
  }

  private mapToDomain(raw: any): TechnicalSpecification {
    return {
      id: raw.id,
      workspaceId: raw.workspaceId,
      projectId: raw.projectId,
      title: raw.title,
      summary: raw.summary,
      content: raw.content,
      status: raw.status as SpecStatus,
      createdByUserId: raw.createdByUserId,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    };
  }
}

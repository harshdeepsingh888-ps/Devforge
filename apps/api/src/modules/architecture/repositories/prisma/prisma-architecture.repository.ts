import type { PrismaClient } from "../../../../generated/prisma/client.js";
import type {
  AdrStatus,
  ArchitectureDecision,
  CreateAdrInput,
  UpdateAdrInput,
} from "../../architecture.types.js";
import type { ArchitectureDecisionRepository } from "../architecture.repository.js";

export class PrismaArchitectureDecisionRepository
  implements ArchitectureDecisionRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateAdrInput): Promise<ArchitectureDecision> {
    const created = await this.prisma.architectureDecision.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId ?? null,
        title: input.title,
        status: "PROPOSED",
        context: input.context,
        decision: input.decision,
        consequences: input.consequences,
        createdByUserId: input.actorUserId,
      },
    });

    return this.mapToDomain(created);
  }

  async findById(
    workspaceId: string,
    adrId: string,
  ): Promise<ArchitectureDecision | null> {
    const found = await this.prisma.architectureDecision.findFirst({
      where: {
        id: adrId,
        workspaceId,
      },
    });

    return found ? this.mapToDomain(found) : null;
  }

  async findByWorkspace(
    workspaceId: string,
    projectId?: string | null,
  ): Promise<ArchitectureDecision[]> {
    const where: any = { workspaceId };
    if (projectId !== undefined) {
      where.projectId = projectId;
    }

    const records = await this.prisma.architectureDecision.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async update(
    workspaceId: string,
    adrId: string,
    updates: UpdateAdrInput,
  ): Promise<ArchitectureDecision | null> {
    const existing = await this.findById(workspaceId, adrId);
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.architectureDecision.update({
      where: { id: adrId },
      data: {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.context !== undefined && { context: updates.context }),
        ...(updates.decision !== undefined && { decision: updates.decision }),
        ...(updates.consequences !== undefined && {
          consequences: updates.consequences,
        }),
      },
    });

    return this.mapToDomain(updated);
  }

  async updateStatus(
    workspaceId: string,
    adrId: string,
    status: AdrStatus,
  ): Promise<ArchitectureDecision | null> {
    const existing = await this.findById(workspaceId, adrId);
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.architectureDecision.update({
      where: { id: adrId },
      data: { status },
    });

    return this.mapToDomain(updated);
  }

  async delete(workspaceId: string, adrId: string): Promise<boolean> {
    const existing = await this.findById(workspaceId, adrId);
    if (!existing) {
      return false;
    }

    await this.prisma.architectureDecision.delete({
      where: { id: adrId },
    });

    return true;
  }

  private mapToDomain(raw: any): ArchitectureDecision {
    return {
      id: raw.id,
      workspaceId: raw.workspaceId,
      projectId: raw.projectId,
      title: raw.title,
      status: raw.status as AdrStatus,
      context: raw.context,
      decision: raw.decision,
      consequences: raw.consequences,
      createdByUserId: raw.createdByUserId,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    };
  }
}

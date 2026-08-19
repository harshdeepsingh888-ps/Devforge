import type { PrismaClient } from "../../../../generated/prisma/client.js";
import { DuplicateArchitectureLinkError } from "../../architecture.errors.js";
import type {
  AdrSpecLink,
  AdrWorkItemLink,
  CreateAdrSpecLinkInput,
  CreateAdrWorkItemLinkInput,
  CreateSpecWorkItemLinkInput,
  SpecWorkItemLink,
} from "../../architecture.types.js";
import type { ArchitectureLinkRepository } from "../architecture-link.repository.js";

export class PrismaArchitectureLinkRepository
  implements ArchitectureLinkRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async createAdrSpecLink(
    input: CreateAdrSpecLinkInput,
  ): Promise<AdrSpecLink> {
    try {
      const created = await this.prisma.adrSpecLink.create({
        data: {
          workspaceId: input.workspaceId,
          adrId: input.adrId,
          specId: input.specId,
        },
      });

      return {
        id: created.id,
        workspaceId: created.workspaceId,
        adrId: created.adrId,
        specId: created.specId,
        createdAt: created.createdAt.toISOString(),
      };
    } catch (e: any) {
      if (e.code === "P2002") {
        throw new DuplicateArchitectureLinkError(
          "Link already exists between this ADR and Spec.",
        );
      }
      throw e;
    }
  }

  async findAdrSpecLink(
    workspaceId: string,
    adrId: string,
    specId: string,
  ): Promise<AdrSpecLink | null> {
    const found = await this.prisma.adrSpecLink.findFirst({
      where: {
        workspaceId,
        adrId,
        specId,
      },
    });

    return found
      ? {
          id: found.id,
          workspaceId: found.workspaceId,
          adrId: found.adrId,
          specId: found.specId,
          createdAt: found.createdAt.toISOString(),
        }
      : null;
  }

  async findSpecsByAdr(
    workspaceId: string,
    adrId: string,
  ): Promise<AdrSpecLink[]> {
    const links = await this.prisma.adrSpecLink.findMany({
      where: {
        workspaceId,
        adrId,
      },
    });

    return links.map((l) => ({
      id: l.id,
      workspaceId: l.workspaceId,
      adrId: l.adrId,
      specId: l.specId,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async findAdrsBySpec(
    workspaceId: string,
    specId: string,
  ): Promise<AdrSpecLink[]> {
    const links = await this.prisma.adrSpecLink.findMany({
      where: {
        workspaceId,
        specId,
      },
    });

    return links.map((l) => ({
      id: l.id,
      workspaceId: l.workspaceId,
      adrId: l.adrId,
      specId: l.specId,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async deleteAdrSpecLink(
    workspaceId: string,
    adrId: string,
    specId: string,
  ): Promise<boolean> {
    const link = await this.findAdrSpecLink(workspaceId, adrId, specId);
    if (!link) {
      return false;
    }

    await this.prisma.adrSpecLink.delete({
      where: { id: link.id },
    });

    return true;
  }

  async createSpecWorkItemLink(
    input: CreateSpecWorkItemLinkInput,
  ): Promise<SpecWorkItemLink> {
    try {
      const created = await this.prisma.specWorkItemLink.create({
        data: {
          workspaceId: input.workspaceId,
          specId: input.specId,
          workItemId: input.workItemId,
        },
      });

      return {
        id: created.id,
        workspaceId: created.workspaceId,
        specId: created.specId,
        workItemId: created.workItemId,
        createdAt: created.createdAt.toISOString(),
      };
    } catch (e: any) {
      if (e.code === "P2002") {
        throw new DuplicateArchitectureLinkError(
          "Link already exists between this Spec and WorkItem.",
        );
      }
      throw e;
    }
  }

  async findSpecWorkItemLink(
    workspaceId: string,
    specId: string,
    workItemId: string,
  ): Promise<SpecWorkItemLink | null> {
    const found = await this.prisma.specWorkItemLink.findFirst({
      where: {
        workspaceId,
        specId,
        workItemId,
      },
    });

    return found
      ? {
          id: found.id,
          workspaceId: found.workspaceId,
          specId: found.specId,
          workItemId: found.workItemId,
          createdAt: found.createdAt.toISOString(),
        }
      : null;
  }

  async findWorkItemsBySpec(
    workspaceId: string,
    specId: string,
  ): Promise<SpecWorkItemLink[]> {
    const links = await this.prisma.specWorkItemLink.findMany({
      where: {
        workspaceId,
        specId,
      },
    });

    return links.map((l) => ({
      id: l.id,
      workspaceId: l.workspaceId,
      specId: l.specId,
      workItemId: l.workItemId,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async findSpecsByWorkItem(
    workspaceId: string,
    workItemId: string,
  ): Promise<SpecWorkItemLink[]> {
    const links = await this.prisma.specWorkItemLink.findMany({
      where: {
        workspaceId,
        workItemId,
      },
    });

    return links.map((l) => ({
      id: l.id,
      workspaceId: l.workspaceId,
      specId: l.specId,
      workItemId: l.workItemId,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async deleteSpecWorkItemLink(
    workspaceId: string,
    specId: string,
    workItemId: string,
  ): Promise<boolean> {
    const link = await this.findSpecWorkItemLink(
      workspaceId,
      specId,
      workItemId,
    );
    if (!link) {
      return false;
    }

    await this.prisma.specWorkItemLink.delete({
      where: { id: link.id },
    });

    return true;
  }

  async createAdrWorkItemLink(
    input: CreateAdrWorkItemLinkInput,
  ): Promise<AdrWorkItemLink> {
    try {
      const created = await this.prisma.adrWorkItemLink.create({
        data: {
          workspaceId: input.workspaceId,
          adrId: input.adrId,
          workItemId: input.workItemId,
        },
      });

      return {
        id: created.id,
        workspaceId: created.workspaceId,
        adrId: created.adrId,
        workItemId: created.workItemId,
        createdAt: created.createdAt.toISOString(),
      };
    } catch (e: any) {
      if (e.code === "P2002") {
        throw new DuplicateArchitectureLinkError(
          "Link already exists between this ADR and WorkItem.",
        );
      }
      throw e;
    }
  }

  async findAdrWorkItemLink(
    workspaceId: string,
    adrId: string,
    workItemId: string,
  ): Promise<AdrWorkItemLink | null> {
    const found = await this.prisma.adrWorkItemLink.findFirst({
      where: {
        workspaceId,
        adrId,
        workItemId,
      },
    });

    return found
      ? {
          id: found.id,
          workspaceId: found.workspaceId,
          adrId: found.adrId,
          workItemId: found.workItemId,
          createdAt: found.createdAt.toISOString(),
        }
      : null;
  }

  async findWorkItemsByAdr(
    workspaceId: string,
    adrId: string,
  ): Promise<AdrWorkItemLink[]> {
    const links = await this.prisma.adrWorkItemLink.findMany({
      where: {
        workspaceId,
        adrId,
      },
    });

    return links.map((l) => ({
      id: l.id,
      workspaceId: l.workspaceId,
      adrId: l.adrId,
      workItemId: l.workItemId,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async findAdrsByWorkItem(
    workspaceId: string,
    workItemId: string,
  ): Promise<AdrWorkItemLink[]> {
    const links = await this.prisma.adrWorkItemLink.findMany({
      where: {
        workspaceId,
        workItemId,
      },
    });

    return links.map((l) => ({
      id: l.id,
      workspaceId: l.workspaceId,
      adrId: l.adrId,
      workItemId: l.workItemId,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async deleteAdrWorkItemLink(
    workspaceId: string,
    adrId: string,
    workItemId: string,
  ): Promise<boolean> {
    const link = await this.findAdrWorkItemLink(
      workspaceId,
      adrId,
      workItemId,
    );
    if (!link) {
      return false;
    }

    await this.prisma.adrWorkItemLink.delete({
      where: { id: link.id },
    });

    return true;
  }
}

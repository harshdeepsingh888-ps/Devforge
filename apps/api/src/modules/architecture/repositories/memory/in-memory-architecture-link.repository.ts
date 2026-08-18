import { randomUUID } from "node:crypto";
import type {
  AdrSpecLink,
  AdrWorkItemLink,
  CreateAdrSpecLinkInput,
  CreateAdrWorkItemLinkInput,
  CreateSpecWorkItemLinkInput,
  SpecWorkItemLink,
} from "../../architecture.types.js";
import type { ArchitectureLinkRepository } from "../architecture-link.repository.js";

export class InMemoryArchitectureLinkRepository
  implements ArchitectureLinkRepository
{
  private readonly adrSpecLinks = new Map<string, AdrSpecLink>();
  private readonly specWorkItemLinks = new Map<string, SpecWorkItemLink>();
  private readonly adrWorkItemLinks = new Map<string, AdrWorkItemLink>();

  // ADR <-> Spec
  async createAdrSpecLink(input: CreateAdrSpecLinkInput): Promise<AdrSpecLink> {
    const timestamp = new Date().toISOString();
    const link: AdrSpecLink = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      adrId: input.adrId,
      specId: input.specId,
      createdAt: timestamp,
    };
    const key = `${input.workspaceId}:${input.adrId}:${input.specId}`;
    this.adrSpecLinks.set(key, link);
    return link;
  }

  async findAdrSpecLink(
    workspaceId: string,
    adrId: string,
    specId: string,
  ): Promise<AdrSpecLink | null> {
    const key = `${workspaceId}:${adrId}:${specId}`;
    return this.adrSpecLinks.get(key) ?? null;
  }

  async findSpecsByAdr(
    workspaceId: string,
    adrId: string,
  ): Promise<AdrSpecLink[]> {
    const results: AdrSpecLink[] = [];
    for (const link of this.adrSpecLinks.values()) {
      if (link.workspaceId === workspaceId && link.adrId === adrId) {
        results.push(link);
      }
    }
    return results;
  }

  async findAdrsBySpec(
    workspaceId: string,
    specId: string,
  ): Promise<AdrSpecLink[]> {
    const results: AdrSpecLink[] = [];
    for (const link of this.adrSpecLinks.values()) {
      if (link.workspaceId === workspaceId && link.specId === specId) {
        results.push(link);
      }
    }
    return results;
  }

  async deleteAdrSpecLink(
    workspaceId: string,
    adrId: string,
    specId: string,
  ): Promise<boolean> {
    const key = `${workspaceId}:${adrId}:${specId}`;
    return this.adrSpecLinks.delete(key);
  }

  // Spec <-> WorkItem
  async createSpecWorkItemLink(
    input: CreateSpecWorkItemLinkInput,
  ): Promise<SpecWorkItemLink> {
    const timestamp = new Date().toISOString();
    const link: SpecWorkItemLink = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      specId: input.specId,
      workItemId: input.workItemId,
      createdAt: timestamp,
    };
    const key = `${input.workspaceId}:${input.specId}:${input.workItemId}`;
    this.specWorkItemLinks.set(key, link);
    return link;
  }

  async findSpecWorkItemLink(
    workspaceId: string,
    specId: string,
    workItemId: string,
  ): Promise<SpecWorkItemLink | null> {
    const key = `${workspaceId}:${specId}:${workItemId}`;
    return this.specWorkItemLinks.get(key) ?? null;
  }

  async findWorkItemsBySpec(
    workspaceId: string,
    specId: string,
  ): Promise<SpecWorkItemLink[]> {
    const results: SpecWorkItemLink[] = [];
    for (const link of this.specWorkItemLinks.values()) {
      if (link.workspaceId === workspaceId && link.specId === specId) {
        results.push(link);
      }
    }
    return results;
  }

  async findSpecsByWorkItem(
    workspaceId: string,
    workItemId: string,
  ): Promise<SpecWorkItemLink[]> {
    const results: SpecWorkItemLink[] = [];
    for (const link of this.specWorkItemLinks.values()) {
      if (link.workspaceId === workspaceId && link.workItemId === workItemId) {
        results.push(link);
      }
    }
    return results;
  }

  async deleteSpecWorkItemLink(
    workspaceId: string,
    specId: string,
    workItemId: string,
  ): Promise<boolean> {
    const key = `${workspaceId}:${specId}:${workItemId}`;
    return this.specWorkItemLinks.delete(key);
  }

  // ADR <-> WorkItem
  async createAdrWorkItemLink(
    input: CreateAdrWorkItemLinkInput,
  ): Promise<AdrWorkItemLink> {
    const timestamp = new Date().toISOString();
    const link: AdrWorkItemLink = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      adrId: input.adrId,
      workItemId: input.workItemId,
      createdAt: timestamp,
    };
    const key = `${input.workspaceId}:${input.adrId}:${input.workItemId}`;
    this.adrWorkItemLinks.set(key, link);
    return link;
  }

  async findAdrWorkItemLink(
    workspaceId: string,
    adrId: string,
    workItemId: string,
  ): Promise<AdrWorkItemLink | null> {
    const key = `${workspaceId}:${adrId}:${workItemId}`;
    return this.adrWorkItemLinks.get(key) ?? null;
  }

  async findWorkItemsByAdr(
    workspaceId: string,
    adrId: string,
  ): Promise<AdrWorkItemLink[]> {
    const results: AdrWorkItemLink[] = [];
    for (const link of this.adrWorkItemLinks.values()) {
      if (link.workspaceId === workspaceId && link.adrId === adrId) {
        results.push(link);
      }
    }
    return results;
  }

  async findAdrsByWorkItem(
    workspaceId: string,
    workItemId: string,
  ): Promise<AdrWorkItemLink[]> {
    const results: AdrWorkItemLink[] = [];
    for (const link of this.adrWorkItemLinks.values()) {
      if (link.workspaceId === workspaceId && link.workItemId === workItemId) {
        results.push(link);
      }
    }
    return results;
  }

  async deleteAdrWorkItemLink(
    workspaceId: string,
    adrId: string,
    workItemId: string,
  ): Promise<boolean> {
    const key = `${workspaceId}:${adrId}:${workItemId}`;
    return this.adrWorkItemLinks.delete(key);
  }
}

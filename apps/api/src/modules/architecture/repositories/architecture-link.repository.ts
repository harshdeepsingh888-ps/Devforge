import type {
  AdrSpecLink,
  AdrWorkItemLink,
  CreateAdrSpecLinkInput,
  CreateAdrWorkItemLinkInput,
  CreateSpecWorkItemLinkInput,
  SpecWorkItemLink,
} from "../architecture.types.js";

export interface ArchitectureLinkRepository {
  createAdrSpecLink(input: CreateAdrSpecLinkInput): Promise<AdrSpecLink>;

  findAdrSpecLink(
    workspaceId: string,
    adrId: string,
    specId: string,
  ): Promise<AdrSpecLink | null>;

  findSpecsByAdr(workspaceId: string, adrId: string): Promise<AdrSpecLink[]>;

  findAdrsBySpec(workspaceId: string, specId: string): Promise<AdrSpecLink[]>;

  deleteAdrSpecLink(
    workspaceId: string,
    adrId: string,
    specId: string,
  ): Promise<boolean>;

  createSpecWorkItemLink(
    input: CreateSpecWorkItemLinkInput,
  ): Promise<SpecWorkItemLink>;

  findSpecWorkItemLink(
    workspaceId: string,
    specId: string,
    workItemId: string,
  ): Promise<SpecWorkItemLink | null>;

  findWorkItemsBySpec(
    workspaceId: string,
    specId: string,
  ): Promise<SpecWorkItemLink[]>;

  findSpecsByWorkItem(
    workspaceId: string,
    workItemId: string,
  ): Promise<SpecWorkItemLink[]>;

  deleteSpecWorkItemLink(
    workspaceId: string,
    specId: string,
    workItemId: string,
  ): Promise<boolean>;

  createAdrWorkItemLink(
    input: CreateAdrWorkItemLinkInput,
  ): Promise<AdrWorkItemLink>;

  findAdrWorkItemLink(
    workspaceId: string,
    adrId: string,
    workItemId: string,
  ): Promise<AdrWorkItemLink | null>;

  findWorkItemsByAdr(
    workspaceId: string,
    adrId: string,
  ): Promise<AdrWorkItemLink[]>;

  findAdrsByWorkItem(
    workspaceId: string,
    workItemId: string,
  ): Promise<AdrWorkItemLink[]>;

  deleteAdrWorkItemLink(
    workspaceId: string,
    adrId: string,
    workItemId: string,
  ): Promise<boolean>;
}

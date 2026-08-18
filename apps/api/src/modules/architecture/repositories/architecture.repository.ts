import type {
  ArchitectureDecision,
  CreateAdrInput,
  UpdateAdrInput,
  AdrStatus,
} from "../architecture.types.js";

export interface ArchitectureDecisionRepository {
  create(input: CreateAdrInput): Promise<ArchitectureDecision>;

  findById(
    workspaceId: string,
    adrId: string,
  ): Promise<ArchitectureDecision | null>;

  findByWorkspace(
    workspaceId: string,
    projectId?: string | null,
  ): Promise<ArchitectureDecision[]>;

  update(
    workspaceId: string,
    adrId: string,
    updates: UpdateAdrInput,
  ): Promise<ArchitectureDecision | null>;

  updateStatus(
    workspaceId: string,
    adrId: string,
    status: AdrStatus,
  ): Promise<ArchitectureDecision | null>;

  delete(workspaceId: string, adrId: string): Promise<boolean>;
}

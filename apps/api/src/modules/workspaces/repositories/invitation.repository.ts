import type {
  CreateInvitationInput,
  InvitationStatus,
  WorkspaceInvitation,
} from "../workspace.types.js";

export interface InvitationRepository {
  create(input: CreateInvitationInput): Promise<WorkspaceInvitation>;

  findById(
    workspaceId: string,
    invitationId: string,
  ): Promise<WorkspaceInvitation | null>;

  findByTokenHash(tokenHash: string): Promise<WorkspaceInvitation | null>;

  findPendingByWorkspaceAndEmail(
    workspaceId: string,
    email: string,
  ): Promise<WorkspaceInvitation | null>;

  findAllByWorkspaceId(
    workspaceId: string,
  ): Promise<WorkspaceInvitation[]>;

  updateStatus(
    invitationId: string,
    status: InvitationStatus,
  ): Promise<WorkspaceInvitation | null>;
}

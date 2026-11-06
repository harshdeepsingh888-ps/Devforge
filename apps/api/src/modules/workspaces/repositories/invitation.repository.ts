import type {
  AcceptInvitationInput,
  AcceptedInvitation,
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

  /**
   * Atomically marks a PENDING invitation ACCEPTED and creates the
   * workspace membership. Returns null when the invitation is no longer
   * PENDING (for example a concurrent accept or revoke won the race), in
   * which case nothing is written. Throws
   * WorkspaceMembershipAlreadyExistsError if the membership already exists.
   */
  accept(input: AcceptInvitationInput): Promise<AcceptedInvitation | null>;
}

import { createHash, randomBytes } from "node:crypto";

import type { InvitationRepository } from "../repositories/invitation.repository.js";
import type { WorkspaceRepository } from "../workspace.repository.js";
import type { UserRepository } from "../../auth/repositories/user.repository.js";
import type {
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole,
} from "../workspace.types.js";
import {
  WorkspaceNotFoundError,
  WorkspacePermissionDeniedError,
  WorkspaceMembershipAlreadyExistsError,
  InvitationNotFoundError,
  InvitationExpiredError,
  InvitationRevokedError,
  InvitationAlreadyAcceptedError,
  InvitationAlreadyPendingError,
  InvitationCannotBeRevokedError,
  InvitationEmailMismatchError,
} from "../workspace.errors.js";

export type SafeWorkspaceInvitation = Omit<WorkspaceInvitation, "tokenHash">;

/** What an invitee may see before accepting: the invitation plus the workspace it opens. */
export interface InvitationPreview extends SafeWorkspaceInvitation {
  workspace: Pick<Workspace, "id" | "name" | "slug">;
}

export function toSafeInvitation(
  invitation: WorkspaceInvitation,
): SafeWorkspaceInvitation {
  const { tokenHash, ...safe } = invitation;
  return safe;
}

export function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export interface CreateInvitationParams {
  workspaceId: string;
  actorUserId: string;
  email: string;
  role: WorkspaceRole;
  expiresInDays?: number | undefined;
}

export interface CreateInvitationResult {
  invitation: SafeWorkspaceInvitation;
  rawToken: string;
}

export interface AcceptInvitationParams {
  rawToken: string;
  acceptingUserId: string;
}

export interface RevokeInvitationParams {
  workspaceId: string;
  invitationId: string;
  actorUserId: string;
}

export interface ListWorkspaceInvitationsParams {
  workspaceId: string;
  actorUserId: string;
}

export class InvitationService {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Shared state checks for a token-addressed invitation. Lazily marks a
   * PENDING invitation EXPIRED once its expiry has passed.
   */
  private async loadPendingInvitation(rawToken: string): Promise<WorkspaceInvitation> {
    const tokenHash = hashToken(rawToken);
    const invitation = await this.invitationRepository.findByTokenHash(tokenHash);

    if (!invitation) {
      throw new InvitationNotFoundError();
    }

    if (invitation.status === "PENDING" && new Date(invitation.expiresAt) < new Date()) {
      await this.invitationRepository.updateStatus(invitation.id, "EXPIRED");
      throw new InvitationExpiredError();
    }

    if (invitation.status === "EXPIRED") {
      throw new InvitationExpiredError();
    }

    if (invitation.status === "REVOKED") {
      throw new InvitationRevokedError();
    }

    if (invitation.status === "ACCEPTED") {
      throw new InvitationAlreadyAcceptedError();
    }

    return invitation;
  }

  private async assertAdminOrOwnerActor(
    workspaceId: string,
    actorUserId: string,
  ) {
    const actorMembership = await this.workspaceRepository.findMembership(
      workspaceId,
      actorUserId,
    );

    if (!actorMembership) {
      throw new WorkspaceNotFoundError();
    }

    if (actorMembership.role !== "OWNER" && actorMembership.role !== "ADMIN") {
      throw new WorkspacePermissionDeniedError(
        "Action requires OWNER or ADMIN role in this workspace.",
      );
    }

    return actorMembership;
  }

  async createInvitation(
    params: CreateInvitationParams,
  ): Promise<CreateInvitationResult> {
    const actorMembership = await this.assertAdminOrOwnerActor(
      params.workspaceId,
      params.actorUserId,
    );

    // Security Rule: ADMIN cannot invite or grant OWNER privileges
    if (actorMembership.role === "ADMIN" && params.role === "OWNER") {
      throw new WorkspacePermissionDeniedError(
        "Only workspace OWNERs can assign or invite the OWNER role.",
      );
    }

    const normalizedEmail = params.email.toLowerCase().trim();

    // Check if target user is already a member of the workspace
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      const existingMembership = await this.workspaceRepository.findMembership(
        params.workspaceId,
        existingUser.id,
      );
      if (existingMembership) {
        throw new WorkspaceMembershipAlreadyExistsError();
      }
    }

    // Check existing pending invitation
    const existingPending =
      await this.invitationRepository.findPendingByWorkspaceAndEmail(
        params.workspaceId,
        normalizedEmail,
      );

    if (existingPending) {
      const isExpired = new Date(existingPending.expiresAt) < new Date();
      if (isExpired) {
        await this.invitationRepository.updateStatus(existingPending.id, "EXPIRED");
      } else {
        throw new InvitationAlreadyPendingError();
      }
    }

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);

    const expiresInDays = params.expiresInDays ?? 7;
    const expiresAt = new Date(Date.now() + expiresInDays * 86400 * 1000).toISOString();

    const invitation = await this.invitationRepository.create({
      workspaceId: params.workspaceId,
      email: normalizedEmail,
      role: params.role,
      tokenHash,
      expiresAt,
      invitedByUserId: params.actorUserId,
    });

    return {
      invitation: toSafeInvitation(invitation),
      rawToken,
    };
  }

  async getInvitationByToken(rawToken: string): Promise<InvitationPreview> {
    const invitation = await this.loadPendingInvitation(rawToken);

    const workspace = await this.workspaceRepository.findById(invitation.workspaceId);
    if (!workspace) {
      // The workspace was deleted; cascades should have removed the
      // invitation too, so treat the token as unknown.
      throw new InvitationNotFoundError();
    }

    return {
      ...toSafeInvitation(invitation),
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
    };
  }

  /**
   * Security rule: the invitation is addressed to an email, so only the
   * account registered with that email may redeem it. Otherwise the raw
   * token would be a bearer capability for anyone who sees the link.
   */
  private async assertAcceptingUserMatches(
    invitation: WorkspaceInvitation,
    acceptingUserId: string,
  ): Promise<void> {
    const user = await this.userRepository.findById(acceptingUserId);

    if (!user || user.email.toLowerCase().trim() !== invitation.email) {
      throw new InvitationEmailMismatchError();
    }
  }

  async acceptInvitation(
    params: AcceptInvitationParams,
  ): Promise<WorkspaceMember> {
    const invitation = await this.loadPendingInvitation(params.rawToken);

    await this.assertAcceptingUserMatches(invitation, params.acceptingUserId);

    // Already a member (added directly, or via another invitation): the
    // invitation is consumed and the existing membership is kept as is.
    const existingMembership = await this.workspaceRepository.findMembership(
      invitation.workspaceId,
      params.acceptingUserId,
    );

    if (existingMembership) {
      await this.invitationRepository.updateStatus(invitation.id, "ACCEPTED");
      return existingMembership;
    }

    // One atomic unit: flip PENDING -> ACCEPTED and insert the membership.
    const accepted = await this.invitationRepository.accept({
      invitationId: invitation.id,
      membership: {
        workspaceId: invitation.workspaceId,
        userId: params.acceptingUserId,
        role: invitation.role,
      },
    });

    if (!accepted) {
      // Lost a race with a concurrent accept or revoke. Re-read so the
      // caller gets the precise reason.
      await this.loadPendingInvitation(params.rawToken);
      throw new InvitationAlreadyAcceptedError();
    }

    return accepted.membership;
  }

  async revokeInvitation(
    params: RevokeInvitationParams,
  ): Promise<SafeWorkspaceInvitation> {
    await this.assertAdminOrOwnerActor(params.workspaceId, params.actorUserId);

    const invitation = await this.invitationRepository.findById(
      params.workspaceId,
      params.invitationId,
    );

    if (!invitation) {
      throw new InvitationNotFoundError();
    }

    if (invitation.status !== "PENDING") {
      throw new InvitationCannotBeRevokedError();
    }

    const updated = await this.invitationRepository.updateStatus(
      params.invitationId,
      "REVOKED",
    );

    if (!updated) {
      throw new InvitationNotFoundError();
    }

    return toSafeInvitation(updated);
  }

  async listWorkspaceInvitations(
    params: ListWorkspaceInvitationsParams,
  ): Promise<SafeWorkspaceInvitation[]> {
    await this.assertAdminOrOwnerActor(params.workspaceId, params.actorUserId);

    const invitations = await this.invitationRepository.findAllByWorkspaceId(
      params.workspaceId,
    );

    return invitations.map(toSafeInvitation);
  }
}

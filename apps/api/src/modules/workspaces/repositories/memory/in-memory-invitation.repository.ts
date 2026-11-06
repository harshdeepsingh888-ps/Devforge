import { randomUUID } from "node:crypto";

import type {
  AcceptInvitationInput,
  AcceptedInvitation,
  CreateInvitationInput,
  InvitationStatus,
  WorkspaceInvitation,
} from "../../workspace.types.js";
import type { InvitationRepository } from "../invitation.repository.js";
import type { WorkspaceRepository } from "../../workspace.repository.js";
import { WorkspaceMembershipAlreadyExistsError } from "../../workspace.errors.js";

export class InMemoryInvitationRepository implements InvitationRepository {
  private readonly invitations = new Map<string, WorkspaceInvitation>();

  /**
   * Accepting an invitation writes a membership, which lives in the
   * workspace repository. The Prisma implementation does this in one
   * transaction; here the two in-memory maps are updated back to back.
   */
  constructor(
    private readonly workspaceRepository?: WorkspaceRepository | undefined,
  ) {}

  async create(input: CreateInvitationInput): Promise<WorkspaceInvitation> {
    const timestamp = new Date().toISOString();
    const normalizedEmail = input.email.toLowerCase().trim();

    const invitation: WorkspaceInvitation = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      email: normalizedEmail,
      role: input.role,
      tokenHash: input.tokenHash,
      status: "PENDING",
      expiresAt: input.expiresAt,
      invitedByUserId: input.invitedByUserId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.invitations.set(invitation.id, invitation);
    return invitation;
  }

  async findById(
    workspaceId: string,
    invitationId: string,
  ): Promise<WorkspaceInvitation | null> {
    const invitation = this.invitations.get(invitationId);
    if (!invitation || invitation.workspaceId !== workspaceId) {
      return null;
    }
    return invitation;
  }

  async findByTokenHash(tokenHash: string): Promise<WorkspaceInvitation | null> {
    for (const invitation of this.invitations.values()) {
      if (invitation.tokenHash === tokenHash) {
        return invitation;
      }
    }
    return null;
  }

  async findPendingByWorkspaceAndEmail(
    workspaceId: string,
    email: string,
  ): Promise<WorkspaceInvitation | null> {
    const normalizedEmail = email.toLowerCase().trim();
    for (const invitation of this.invitations.values()) {
      if (
        invitation.workspaceId === workspaceId &&
        invitation.email === normalizedEmail &&
        invitation.status === "PENDING"
      ) {
        return invitation;
      }
    }
    return null;
  }

  async findAllByWorkspaceId(
    workspaceId: string,
  ): Promise<WorkspaceInvitation[]> {
    const results: WorkspaceInvitation[] = [];
    for (const invitation of this.invitations.values()) {
      if (invitation.workspaceId === workspaceId) {
        results.push(invitation);
      }
    }
    return results;
  }

  async updateStatus(
    invitationId: string,
    status: InvitationStatus,
  ): Promise<WorkspaceInvitation | null> {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) {
      return null;
    }

    const updated: WorkspaceInvitation = {
      ...invitation,
      status,
      updatedAt: new Date().toISOString(),
    };

    this.invitations.set(invitationId, updated);
    return updated;
  }

  async accept(input: AcceptInvitationInput): Promise<AcceptedInvitation | null> {
    if (!this.workspaceRepository) {
      throw new Error(
        "InMemoryInvitationRepository needs a WorkspaceRepository to accept invitations.",
      );
    }

    const invitation = this.invitations.get(input.invitationId);
    if (!invitation || invitation.status !== "PENDING") {
      return null;
    }

    const existingMembership = await this.workspaceRepository.findMembership(
      input.membership.workspaceId,
      input.membership.userId,
    );
    if (existingMembership) {
      throw new WorkspaceMembershipAlreadyExistsError();
    }

    const membership = await this.workspaceRepository.addMember(input.membership);

    const accepted: WorkspaceInvitation = {
      ...invitation,
      status: "ACCEPTED",
      updatedAt: new Date().toISOString(),
    };
    this.invitations.set(accepted.id, accepted);

    return { invitation: accepted, membership };
  }
}

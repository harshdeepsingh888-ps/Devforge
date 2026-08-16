import { randomUUID } from "node:crypto";

import type {
  CreateInvitationInput,
  InvitationStatus,
  WorkspaceInvitation,
} from "../../workspace.types.js";
import type { InvitationRepository } from "../invitation.repository.js";

export class InMemoryInvitationRepository implements InvitationRepository {
  private readonly invitations = new Map<string, WorkspaceInvitation>();

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
}

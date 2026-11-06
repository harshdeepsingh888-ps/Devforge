import type {
  Prisma,
  PrismaClient,
} from "../../../../generated/prisma/client.js";
import { prisma } from "../../../../infrastructure/database/prisma.js";
import type { InvitationRepository } from "../invitation.repository.js";
import { WorkspaceMembershipAlreadyExistsError } from "../../workspace.errors.js";
import type {
  AcceptInvitationInput,
  AcceptedInvitation,
  CreateInvitationInput,
  InvitationStatus,
  WorkspaceInvitation,
  WorkspaceMember,
} from "../../workspace.types.js";

type InvitationDatabaseClient = Pick<
  PrismaClient,
  "workspaceInvitation" | "workspaceMember" | "$transaction"
>;

interface RawInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceInvitation["role"];
  tokenHash: string;
  status: InvitationStatus;
  expiresAt: Date;
  invitedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RawMembership {
  workspaceId: string;
  userId: string;
  role: WorkspaceMember["role"];
  joinedAt: Date;
}

function toInvitationDomain(raw: RawInvitation): WorkspaceInvitation {
  return {
    id: raw.id,
    workspaceId: raw.workspaceId,
    email: raw.email,
    role: raw.role,
    tokenHash: raw.tokenHash,
    status: raw.status,
    expiresAt: raw.expiresAt.toISOString(),
    invitedByUserId: raw.invitedByUserId,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };
}

function toMembershipDomain(raw: RawMembership): WorkspaceMember {
  return {
    workspaceId: raw.workspaceId,
    userId: raw.userId,
    role: raw.role,
    joinedAt: raw.joinedAt.toISOString(),
  };
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

/**
 * Thrown inside the accept transaction to roll it back when the invitation
 * was not PENDING any more. Never escapes this module.
 */
class InvitationNotPendingSignal extends Error {}

export class PrismaInvitationRepository implements InvitationRepository {
  constructor(
    private readonly database: InvitationDatabaseClient = prisma,
  ) {}

  async create(input: CreateInvitationInput): Promise<WorkspaceInvitation> {
    const invitation = await this.database.workspaceInvitation.create({
      data: {
        workspaceId: input.workspaceId,
        email: input.email.toLowerCase().trim(),
        role: input.role,
        tokenHash: input.tokenHash,
        expiresAt: new Date(input.expiresAt),
        invitedByUserId: input.invitedByUserId,
      },
    });

    return toInvitationDomain(invitation);
  }

  async findById(
    workspaceId: string,
    invitationId: string,
  ): Promise<WorkspaceInvitation | null> {
    const invitation = await this.database.workspaceInvitation.findFirst({
      where: { id: invitationId, workspaceId },
    });

    return invitation ? toInvitationDomain(invitation) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<WorkspaceInvitation | null> {
    const invitation = await this.database.workspaceInvitation.findUnique({
      where: { tokenHash },
    });

    return invitation ? toInvitationDomain(invitation) : null;
  }

  async findPendingByWorkspaceAndEmail(
    workspaceId: string,
    email: string,
  ): Promise<WorkspaceInvitation | null> {
    const invitation = await this.database.workspaceInvitation.findFirst({
      where: {
        workspaceId,
        email: email.toLowerCase().trim(),
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    return invitation ? toInvitationDomain(invitation) : null;
  }

  async findAllByWorkspaceId(workspaceId: string): Promise<WorkspaceInvitation[]> {
    const invitations = await this.database.workspaceInvitation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return invitations.map(toInvitationDomain);
  }

  async updateStatus(
    invitationId: string,
    status: InvitationStatus,
  ): Promise<WorkspaceInvitation | null> {
    const result = await this.database.workspaceInvitation.updateMany({
      where: { id: invitationId },
      data: { status },
    });

    if (result.count === 0) {
      return null;
    }

    const invitation = await this.database.workspaceInvitation.findUnique({
      where: { id: invitationId },
    });

    return invitation ? toInvitationDomain(invitation) : null;
  }

  async accept(input: AcceptInvitationInput): Promise<AcceptedInvitation | null> {
    try {
      return await this.database.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // The status filter makes this a compare-and-set: a concurrent
          // accept or revoke that already moved the row out of PENDING
          // leaves count at 0 and nothing else is written.
          const flipped = await tx.workspaceInvitation.updateMany({
            where: { id: input.invitationId, status: "PENDING" },
            data: { status: "ACCEPTED" },
          });

          if (flipped.count === 0) {
            throw new InvitationNotPendingSignal();
          }

          const membership = await tx.workspaceMember.create({
            data: {
              workspaceId: input.membership.workspaceId,
              userId: input.membership.userId,
              role: input.membership.role,
            },
          });

          const invitation = await tx.workspaceInvitation.findUniqueOrThrow({
            where: { id: input.invitationId },
          });

          return {
            invitation: toInvitationDomain(invitation),
            membership: toMembershipDomain(membership),
          };
        },
      );
    } catch (error) {
      if (error instanceof InvitationNotPendingSignal) {
        return null;
      }

      // @@id([workspaceId, userId]) on WorkspaceMember: the user joined by
      // another path while this accept was in flight. The transaction has
      // rolled back, so the invitation is still PENDING.
      if (isUniqueConstraintViolation(error)) {
        throw new WorkspaceMembershipAlreadyExistsError();
      }

      throw error;
    }
  }
}

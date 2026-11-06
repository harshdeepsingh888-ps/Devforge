import type {
  Prisma,
  PrismaClient,
} from "../../../../generated/prisma/client.js";
import { prisma } from "../../../../infrastructure/database/prisma.js";

import { WorkspaceOwnerRequiredError } from "../../workspace.errors.js";
import type { WorkspaceRepository } from "../../workspace.repository.js";

import type {
  AddWorkspaceMemberInput,
  CreateWorkspaceInput,
  Workspace,
  WorkspaceMember,
  WorkspaceMemberWithUser,
  WorkspaceRole,
  WorkspaceWithMembership,
} from "../../workspace.types.js";

type WorkspaceDatabaseClient = Pick<
  PrismaClient,
  "workspace" | "workspaceMember" | "teamMember" | "workItem" | "$transaction"
>;

function toWorkspaceDomain(raw: any): Workspace {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,

    createdAt:
      raw.createdAt instanceof Date
        ? raw.createdAt.toISOString()
        : raw.createdAt,

    updatedAt:
      raw.updatedAt instanceof Date
        ? raw.updatedAt.toISOString()
        : raw.updatedAt,
  };
}

function toWorkspaceMemberDomain(
  raw: any,
): WorkspaceMember {
  return {
    workspaceId: raw.workspaceId,
    userId: raw.userId,
    role: raw.role,

    joinedAt:
      raw.joinedAt instanceof Date
        ? raw.joinedAt.toISOString()
        : raw.joinedAt,
  };
}

/**
 * Serialises membership changes per workspace for the rest of the
 * transaction. Two concurrent "last owner" checks would otherwise each see
 * the other owner still present and both succeed; with the workspace row
 * locked, the second one waits and then sees the first one's result.
 */
async function lockWorkspace(
  tx: Prisma.TransactionClient,
  workspaceId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "Workspace" WHERE "id" = ${workspaceId} FOR UPDATE`;
}

async function assertAnotherOwner(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  excludingUserId: string,
): Promise<void> {
  const otherOwners = await tx.workspaceMember.count({
    where: {
      workspaceId,
      role: "OWNER",
      userId: { not: excludingUserId },
    },
  });

  if (otherOwners === 0) {
    throw new WorkspaceOwnerRequiredError();
  }
}

export class PrismaWorkspaceRepository
  implements WorkspaceRepository
{
  constructor(
    private readonly database: WorkspaceDatabaseClient = prisma,
  ) {}

  async create(
    input: CreateWorkspaceInput,
  ): Promise<Workspace> {
    const workspace =
      await this.database.workspace.create({
        data: {
          name: input.name.trim(),
          slug: input.slug.trim(),
        },
      });

    return toWorkspaceDomain(workspace);
  }

  async findById(
    workspaceId: string,
  ): Promise<Workspace | null> {
    const workspace =
      await this.database.workspace.findUnique({
        where: {
          id: workspaceId,
        },
      });

    return workspace
      ? toWorkspaceDomain(workspace)
      : null;
  }

  async findBySlug(
    slug: string,
  ): Promise<Workspace | null> {
    const workspace =
      await this.database.workspace.findUnique({
        where: {
          slug,
        },
      });

    return workspace
      ? toWorkspaceDomain(workspace)
      : null;
  }

  async findForUser(
    userId: string,
  ): Promise<WorkspaceWithMembership[]> {
    const memberships =
      await this.database.workspaceMember.findMany({
        where: {
          userId,
        },

        include: {
          workspace: true,
        },

        orderBy: {
          joinedAt: "asc",
        },
      });

    return memberships.map(
      (membership: any) => ({
        ...toWorkspaceDomain(
          membership.workspace,
        ),

        membership:
          toWorkspaceMemberDomain(
            membership,
          ),
      }),
    );
  }

  async addMember(
    input: AddWorkspaceMemberInput,
  ): Promise<WorkspaceMember> {
    const membership =
      await this.database.workspaceMember.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          role: input.role,
        },
      });

    return toWorkspaceMemberDomain(
      membership,
    );
  }

  async findMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    const membership =
      await this.database.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
      });

    return membership
      ? toWorkspaceMemberDomain(
          membership,
        )
      : null;
  }

  async removeMember(
    workspaceId: string,
    userId: string,
  ): Promise<boolean> {
    return this.database.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await lockWorkspace(tx, workspaceId);

        const existing = await tx.workspaceMember.findUnique({
          where: {
            workspaceId_userId: { workspaceId, userId },
          },
        });

        if (!existing) {
          return false;
        }

        if (existing.role === "OWNER") {
          await assertAnotherOwner(tx, workspaceId, userId);
        }

        await tx.workspaceMember.delete({
          where: {
            workspaceId_userId: { workspaceId, userId },
          },
        });

        // TeamMember carries no workspaceId: scope the delete through the
        // team's workspace so memberships elsewhere are untouched.
        await tx.teamMember.deleteMany({
          where: {
            userId,
            team: { workspaceId },
          },
        });

        await tx.workItem.updateMany({
          where: {
            workspaceId,
            assigneeUserId: userId,
          },
          data: {
            assigneeUserId: null,
          },
        });

        return true;
      },
    );
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceMember | null> {
    return this.database.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await lockWorkspace(tx, workspaceId);

        const existing = await tx.workspaceMember.findUnique({
          where: {
            workspaceId_userId: { workspaceId, userId },
          },
        });

        if (!existing) {
          return null;
        }

        if (existing.role === "OWNER" && role !== "OWNER") {
          await assertAnotherOwner(tx, workspaceId, userId);
        }

        const updated = await tx.workspaceMember.update({
          where: {
            workspaceId_userId: { workspaceId, userId },
          },
          data: { role },
        });

        return toWorkspaceMemberDomain(updated);
      },
    );
  }

  async countMembersWithRole(
    workspaceId: string,
    role: WorkspaceRole,
  ): Promise<number> {
    return this.database.workspaceMember.count({
      where: { workspaceId, role },
    });
  }

  async listMemberships(
    workspaceId: string,
  ): Promise<WorkspaceMemberWithUser[]> {
    const memberships = await (this.database as any).workspaceMember.findMany({
      where: {
        workspaceId,
      },
      include: {
        user: true,
      },
      orderBy: {
        joinedAt: "asc",
      },
    });

    return memberships.map((m: any) => ({
      workspaceId: m.workspaceId,
      userId: m.userId,
      role: m.role,
      joinedAt:
        m.joinedAt instanceof Date
          ? m.joinedAt.toISOString()
          : m.joinedAt,
      user: {
        id: m.user.id,
        displayName: m.user.displayName,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl ?? null,
      },
    }));
  }
}

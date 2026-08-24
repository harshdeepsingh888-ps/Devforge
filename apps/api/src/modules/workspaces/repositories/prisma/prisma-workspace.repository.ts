import type { PrismaClient } from "../../../../generated/prisma/client.js";
import { prisma } from "../../../../infrastructure/database/prisma.js";

import type { WorkspaceRepository } from "../../workspace.repository.js";

import type {
  AddWorkspaceMemberInput,
  CreateWorkspaceInput,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceWithMembership,
} from "../../workspace.types.js";

type WorkspaceDatabaseClient = Pick<
  PrismaClient,
  "workspace" | "workspaceMember"
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
    const existing =
      await this.findMembership(
        workspaceId,
        userId,
      );

    if (!existing) {
      return false;
    }

    await this.database.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    return true;
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceMember | null> {
    const existing =
      await this.findMembership(
        workspaceId,
        userId,
      );

    if (!existing) {
      return null;
    }

    const updated =
      await this.database.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },

        data: {
          role,
        },
      });

    return toWorkspaceMemberDomain(
      updated,
    );
  }

  async listMemberships(
    workspaceId: string,
  ): Promise<import("../../workspace.types.js").WorkspaceMemberWithUser[]> {
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
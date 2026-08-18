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
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

function toMemberDomain(raw: any): WorkspaceMember {
  return {
    workspaceId: raw.workspaceId,
    userId: raw.userId,
    role: raw.role as WorkspaceRole,
    joinedAt: raw.joinedAt instanceof Date ? raw.joinedAt.toISOString() : raw.joinedAt,
  };
}

export class PrismaWorkspaceRepository implements WorkspaceRepository {
  constructor(
    private readonly database: WorkspaceDatabaseClient = prisma,
  ) {}

  async create(input: CreateWorkspaceInput): Promise<Workspace> {
    const workspace = await this.database.workspace.create({
      data: {
        name: input.name.trim(),
        slug: input.slug.trim(),
      },
    });

    return toWorkspaceDomain(workspace);
  }

  async findById(workspaceId: string): Promise<Workspace | null> {
    const workspace = await this.database.workspace.findUnique({
      where: { id: workspaceId },
    });
    return workspace ? toWorkspaceDomain(workspace) : null;
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    const workspace = await this.database.workspace.findUnique({
      where: { slug },
    });
    return workspace ? toWorkspaceDomain(workspace) : null;
  }

  async findForUser(userId: string): Promise<WorkspaceWithMembership[]> {
    const memberships = await this.database.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
    });

    return memberships.map((m: any) => ({
      ...toWorkspaceDomain(m.workspace),
      membership: toMemberDomain(m),
    }));
  }

  async addMember(input: AddWorkspaceMemberInput): Promise<WorkspaceMember> {
    const member = await this.database.workspaceMember.create({
      data: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        role: input.role,
      },
    });

    return toMemberDomain(member);
  }

  async findMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    const member = await this.database.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    return member ? toMemberDomain(member) : null;
  }

  async removeMember(workspaceId: string, userId: string): Promise<boolean> {
    const existing = await this.findMembership(workspaceId, userId);
    if (!existing) return false;

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
    const existing = await this.findMembership(workspaceId, userId);
    if (!existing) return null;

    const updated = await this.database.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      data: { role },
    });

    return toMemberDomain(updated);
  }
}

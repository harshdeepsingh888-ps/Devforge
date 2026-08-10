import { randomUUID } from "node:crypto";

import type {
  AddWorkspaceMemberInput,
  CreateWorkspaceInput,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from "../../workspace.types.js";
import type { WorkspaceRepository } from "../../workspace.repository.js";

export class InMemoryWorkspaceRepository
  implements WorkspaceRepository
{
  private readonly workspaces =
    new Map<string, Workspace>();

  private readonly memberships =
    new Map<string, WorkspaceMember>();

  async create(
    input: CreateWorkspaceInput,
  ): Promise<Workspace> {
    const timestamp =
      new Date().toISOString();

    const workspace: Workspace = {
      id: randomUUID(),
      name: input.name,
      slug: input.slug,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.workspaces.set(
      workspace.id,
      workspace,
    );

    return workspace;
  }

  async findById(
    workspaceId: string,
  ): Promise<Workspace | null> {
    return (
      this.workspaces.get(workspaceId) ??
      null
    );
  }

  async findBySlug(
    slug: string,
  ): Promise<Workspace | null> {
    for (const workspace of this.workspaces.values()) {
      if (workspace.slug === slug) {
        return workspace;
      }
    }

    return null;
  }

  async findMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    const key =
      this.membershipKey(
        workspaceId,
        userId,
      );

    return (
      this.memberships.get(key) ??
      null
    );
  }

  async listMemberships(
    workspaceId: string,
  ): Promise<WorkspaceMember[]> {
    return Array.from(
      this.memberships.values(),
    ).filter(
      (membership) =>
        membership.workspaceId ===
        workspaceId,
    );
  }

  async addMember(
    input: AddWorkspaceMemberInput,
  ): Promise<WorkspaceMember> {
    const membership: WorkspaceMember = {
      workspaceId:
        input.workspaceId,
      userId: input.userId,
      role: input.role,
      joinedAt:
        new Date().toISOString(),
    };

    this.memberships.set(
      this.membershipKey(
        input.workspaceId,
        input.userId,
      ),
      membership,
    );

    return membership;
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceMember | null> {
    const key =
      this.membershipKey(
        workspaceId,
        userId,
      );

    const membership =
      this.memberships.get(key);

    if (!membership) {
      return null;
    }

    const updatedMembership: WorkspaceMember = {
      ...membership,
      role,
    };

    this.memberships.set(
      key,
      updatedMembership,
    );

    return updatedMembership;
  }

  async removeMember(
    workspaceId: string,
    userId: string,
  ): Promise<boolean> {
    return this.memberships.delete(
      this.membershipKey(
        workspaceId,
        userId,
      ),
    );
  }

  private membershipKey(
    workspaceId: string,
    userId: string,
  ): string {
    return `${workspaceId}:${userId}`;
  }
}
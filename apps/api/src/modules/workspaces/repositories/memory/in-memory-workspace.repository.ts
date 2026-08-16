import { randomUUID } from "node:crypto";

import type {
  AddWorkspaceMemberInput,
  CreateWorkspaceInput,
  Workspace,
  WorkspaceMember,
  WorkspaceWithMembership,
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

  async findForUser(
    userId: string,
  ): Promise<WorkspaceWithMembership[]> {
    const results: WorkspaceWithMembership[] =
      [];

    for (const membership of this.memberships.values()) {
      if (membership.userId !== userId) {
        continue;
      }

      const workspace =
        this.workspaces.get(
          membership.workspaceId,
        );

      if (!workspace) {
        continue;
      }

      results.push({
        ...workspace,
        membership,
      });
    }

    return results;
  }

  async addMember(
    input: AddWorkspaceMemberInput,
  ): Promise<WorkspaceMember> {
    const membership: WorkspaceMember = {
      workspaceId: input.workspaceId,
      userId: input.userId,
      role: input.role,
      joinedAt: new Date().toISOString(),
    };

    const key = this.membershipKey(
      input.workspaceId,
      input.userId,
    );

    this.memberships.set(
      key,
      membership,
    );

    return membership;
  }

  async findMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    return (
      this.memberships.get(
        this.membershipKey(
          workspaceId,
          userId,
        ),
      ) ?? null
    );
  }

  async listMemberships(
    workspaceId: string,
  ): Promise<WorkspaceMember[]> {
    const results: WorkspaceMember[] = [];

    for (const membership of this.memberships.values()) {
      if (
        membership.workspaceId ===
        workspaceId
      ) {
        results.push(membership);
      }
    }

    return results;
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceMember["role"],
  ): Promise<WorkspaceMember | null> {
    const key = this.membershipKey(
      workspaceId,
      userId,
    );

    const membership =
      this.memberships.get(key);

    if (!membership) {
      return null;
    }

    const updatedMembership: WorkspaceMember =
      {
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
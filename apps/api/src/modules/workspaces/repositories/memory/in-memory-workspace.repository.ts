import { randomUUID } from "node:crypto";

import type { WorkItemRepository } from "../../../work-management/repositories/work-item.repository.js";
import { WorkspaceOwnerRequiredError } from "../../workspace.errors.js";
import type {
  AddWorkspaceMemberInput,
  CreateWorkspaceInput,
  Workspace,
  WorkspaceMember,
  WorkspaceMemberUser,
  WorkspaceMemberWithUser,
  WorkspaceRole,
  WorkspaceWithMembership,
} from "../../workspace.types.js";
import type { WorkspaceRepository } from "../../workspace.repository.js";
import type { TeamRepository } from "../team.repository.js";

/**
 * Removing a workspace member also touches teams and work items, which live
 * in their own in-memory repositories. The Prisma implementation does that
 * in one transaction; here the collaborators are updated back to back.
 */
export interface InMemoryWorkspaceRepositoryCollaborators {
  teamRepository?: TeamRepository | undefined;
  workItemRepository?: WorkItemRepository | undefined;
}

export class InMemoryWorkspaceRepository
  implements WorkspaceRepository
{
  private readonly workspaces =
    new Map<string, Workspace>();

  private readonly memberships =
    new Map<string, WorkspaceMember>();

  private readonly userMap = new Map<string, WorkspaceMemberUser>();

  constructor(
    private readonly collaborators: InMemoryWorkspaceRepositoryCollaborators = {},
  ) {}

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

  setUser(user: WorkspaceMemberUser): void {
    this.userMap.set(user.id, user);
  }

  async listMemberships(
    workspaceId: string,
  ): Promise<WorkspaceMemberWithUser[]> {
    const results: WorkspaceMemberWithUser[] = [];

    for (const membership of this.memberships.values()) {
      if (
        membership.workspaceId ===
        workspaceId
      ) {
        const user = this.userMap.get(membership.userId) ?? {
          id: membership.userId,
          displayName: membership.userId,
          email: `${membership.userId}@devforge.local`,
          avatarUrl: null,
        };

        results.push({
          ...membership,
          user,
        });
      }
    }

    return results;
  }

  async countMembersWithRole(
    workspaceId: string,
    role: WorkspaceRole,
  ): Promise<number> {
    let count = 0;

    for (const membership of this.memberships.values()) {
      if (
        membership.workspaceId === workspaceId &&
        membership.role === role
      ) {
        count += 1;
      }
    }

    return count;
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
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

    if (membership.role === "OWNER" && role !== "OWNER") {
      this.assertAnotherOwner(workspaceId, userId);
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
    const key = this.membershipKey(workspaceId, userId);
    const membership = this.memberships.get(key);

    if (!membership) {
      return false;
    }

    if (membership.role === "OWNER") {
      this.assertAnotherOwner(workspaceId, userId);
    }

    this.memberships.delete(key);

    const { teamRepository, workItemRepository } = this.collaborators;

    if (teamRepository) {
      const teams = await teamRepository.findTeamsForUser(workspaceId, userId);
      for (const team of teams) {
        await teamRepository.removeMember(team.id, userId);
      }
    }

    if (workItemRepository) {
      const workItems = await workItemRepository.findByWorkspace(workspaceId);
      for (const workItem of workItems) {
        if (workItem.assigneeUserId === userId) {
          await workItemRepository.update(workspaceId, workItem.id, {
            assigneeUserId: null,
          });
        }
      }
    }

    return true;
  }

  private assertAnotherOwner(
    workspaceId: string,
    excludingUserId: string,
  ): void {
    for (const membership of this.memberships.values()) {
      if (
        membership.workspaceId === workspaceId &&
        membership.role === "OWNER" &&
        membership.userId !== excludingUserId
      ) {
        return;
      }
    }

    throw new WorkspaceOwnerRequiredError();
  }

  private membershipKey(
    workspaceId: string,
    userId: string,
  ): string {
    return `${workspaceId}:${userId}`;
  }
}

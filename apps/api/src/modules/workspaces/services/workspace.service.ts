import {
  WorkspaceNotFoundError,
  WorkspaceSlugAlreadyExistsError,
  WorkspaceMembershipAlreadyExistsError,
  WorkspaceMembershipNotFoundError,
  WorkspaceOwnerRequiredError,
  WorkspacePermissionDeniedError,
} from "../workspace.errors.js";
import type { WorkspaceRepository } from "../workspace.repository.js";
import type {
  WorkspaceMember,
  WorkspaceMemberWithUser,
  WorkspaceRole,
  WorkspaceWithMembership,
} from "../workspace.types.js";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface CreateWorkspaceParams {
  name: string;
  slug?: string | undefined;
  creatorUserId: string;
}

export interface AddMemberParams {
  workspaceId: string;
  actorUserId: string;
  targetUserId: string;
  role: WorkspaceRole;
}

export interface ChangeMemberRoleParams {
  workspaceId: string;
  actorUserId: string;
  targetUserId: string;
  role: WorkspaceRole;
}

export interface RemoveMemberParams {
  workspaceId: string;
  actorUserId: string;
  targetUserId: string;
}

export class WorkspaceService {
  constructor(private readonly repository: WorkspaceRepository) {}

  async createWorkspace(
    input: CreateWorkspaceParams,
  ): Promise<WorkspaceWithMembership> {
    const rawSlug = input.slug && input.slug.trim().length > 0 ? input.slug : input.name;
    const slug = slugify(rawSlug);

    if (!slug) {
      throw new Error("Invalid workspace name or slug.");
    }

    const existing = await this.repository.findBySlug(slug);
    if (existing) {
      throw new WorkspaceSlugAlreadyExistsError();
    }

    const workspace = await this.repository.create({
      name: input.name.trim(),
      slug,
    });

    const membership = await this.repository.addMember({
      workspaceId: workspace.id,
      userId: input.creatorUserId,
      role: "OWNER",
    });

    return {
      ...workspace,
      membership,
    };
  }

  async listUserWorkspaces(
    userId: string,
  ): Promise<WorkspaceWithMembership[]> {
    return this.repository.findForUser(userId);
  }

  async getWorkspaceForUser(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceWithMembership> {
    const workspace = await this.repository.findById(workspaceId);
    if (!workspace) {
      throw new WorkspaceNotFoundError();
    }

    const membership = await this.repository.findMembership(
      workspaceId,
      userId,
    );
    if (!membership) {
      throw new WorkspaceNotFoundError();
    }

    return {
      ...workspace,
      membership,
    };
  }

  async addMember(
    params: AddMemberParams,
  ): Promise<WorkspaceMember> {
    const actorMembership = await this.repository.findMembership(
      params.workspaceId,
      params.actorUserId,
    );

    if (!actorMembership) {
      throw new WorkspaceNotFoundError();
    }

    // Only OWNER and ADMIN can invite/add workspace members
    if (actorMembership.role !== "OWNER" && actorMembership.role !== "ADMIN") {
      throw new WorkspaceNotFoundError();
    }

    // An ADMIN cannot assign the OWNER role (only an OWNER can grant OWNER role)
    if (actorMembership.role === "ADMIN" && params.role === "OWNER") {
      throw new WorkspacePermissionDeniedError("Only workspace OWNERs can assign the OWNER role.");
    }

    const existingMember = await this.repository.findMembership(
      params.workspaceId,
      params.targetUserId,
    );

    if (existingMember) {
      throw new WorkspaceMembershipAlreadyExistsError();
    }

    return this.repository.addMember({
      workspaceId: params.workspaceId,
      userId: params.targetUserId,
      role: params.role,
    });
  }

  async listWorkspaceMembers(
    workspaceId: string,
    actorUserId: string,
  ): Promise<WorkspaceMemberWithUser[]> {
    const membership = await this.repository.findMembership(
      workspaceId,
      actorUserId,
    );

    if (!membership) {
      throw new WorkspaceNotFoundError();
    }

    return this.repository.listMemberships(workspaceId);
  }

  /**
   * OWNER may set any role. ADMIN may set ADMIN, DEVELOPER or VIEWER, but
   * may neither grant OWNER nor touch an existing OWNER. Nobody may demote
   * the workspace's last OWNER.
   */
  async changeMemberRole(
    params: ChangeMemberRoleParams,
  ): Promise<WorkspaceMember> {
    const actor = await this.requireMembership(params.workspaceId, params.actorUserId);

    if (actor.role !== "OWNER" && actor.role !== "ADMIN") {
      throw new WorkspacePermissionDeniedError(
        "Only workspace OWNERs and ADMINs can change member roles.",
      );
    }

    const target = await this.repository.findMembership(
      params.workspaceId,
      params.targetUserId,
    );

    if (!target) {
      throw new WorkspaceMembershipNotFoundError();
    }

    if (actor.role === "ADMIN") {
      if (params.role === "OWNER") {
        throw new WorkspacePermissionDeniedError(
          "Only workspace OWNERs can grant the OWNER role.",
        );
      }

      if (target.role === "OWNER") {
        throw new WorkspacePermissionDeniedError(
          "Only workspace OWNERs can change an OWNER's role.",
        );
      }
    }

    if (target.role === "OWNER" && params.role !== "OWNER") {
      await this.assertAnotherOwner(params.workspaceId);
    }

    const updated = await this.repository.updateMemberRole(
      params.workspaceId,
      params.targetUserId,
      params.role,
    );

    if (!updated) {
      throw new WorkspaceMembershipNotFoundError();
    }

    return updated;
  }

  /**
   * Any member may remove themselves (leave). Beyond that, OWNER may remove
   * anyone and ADMIN may remove DEVELOPERs and VIEWERs. The last OWNER can
   * neither leave nor be removed.
   */
  async removeMember(params: RemoveMemberParams): Promise<void> {
    const actor = await this.requireMembership(params.workspaceId, params.actorUserId);

    const target = await this.repository.findMembership(
      params.workspaceId,
      params.targetUserId,
    );

    if (!target) {
      throw new WorkspaceMembershipNotFoundError();
    }

    const isLeaving = actor.userId === target.userId;

    if (!isLeaving) {
      if (actor.role === "ADMIN") {
        if (target.role === "OWNER" || target.role === "ADMIN") {
          throw new WorkspacePermissionDeniedError(
            "ADMINs can only remove DEVELOPERs and VIEWERs.",
          );
        }
      } else if (actor.role !== "OWNER") {
        throw new WorkspacePermissionDeniedError(
          "Only workspace OWNERs and ADMINs can remove other members.",
        );
      }
    }

    if (target.role === "OWNER") {
      await this.assertAnotherOwner(params.workspaceId);
    }

    const removed = await this.repository.removeMember(
      params.workspaceId,
      params.targetUserId,
    );

    if (!removed) {
      throw new WorkspaceMembershipNotFoundError();
    }
  }

  private async requireMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember> {
    const membership = await this.repository.findMembership(workspaceId, userId);

    if (!membership) {
      throw new WorkspaceNotFoundError();
    }

    return membership;
  }

  /**
   * Called only when the target is an OWNER, so a count above one means
   * somebody else holds the role too. The repository re-checks this inside
   * its transaction; this early check keeps the 409 path independent of
   * storage details.
   */
  private async assertAnotherOwner(workspaceId: string): Promise<void> {
    const owners = await this.repository.countMembersWithRole(workspaceId, "OWNER");

    if (owners <= 1) {
      throw new WorkspaceOwnerRequiredError();
    }
  }
}

import {
  WorkspaceNotFoundError,
  WorkspaceSlugAlreadyExistsError,
  WorkspaceMembershipAlreadyExistsError,
  WorkspacePermissionDeniedError,
} from "../workspace.errors.js";
import type { WorkspaceRepository } from "../workspace.repository.js";
import type {
  WorkspaceMember,
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
}

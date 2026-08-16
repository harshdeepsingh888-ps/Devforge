import {
  WorkspaceNotFoundError,
  WorkspacePermissionDeniedError,
  WorkspaceMembershipNotFoundError,
  TeamNotFoundError,
  TeamMemberAlreadyExistsError,
  TeamMemberNotFoundError,
} from "../workspace.errors.js";
import type { TeamRepository } from "../repositories/team.repository.js";
import type { WorkspaceRepository } from "../workspace.repository.js";
import type { Team, TeamMember } from "../workspace.types.js";
import { slugify } from "./workspace.service.js";

export interface CreateTeamParams {
  workspaceId: string;
  actorUserId: string;
  name: string;
  slug?: string | undefined;
}

export interface AddTeamMemberParams {
  workspaceId: string;
  teamId: string;
  actorUserId: string;
  targetUserId: string;
}

export interface RemoveTeamMemberParams {
  workspaceId: string;
  teamId: string;
  actorUserId: string;
  targetUserId: string;
}

export interface ListTeamMembersParams {
  workspaceId: string;
  teamId: string;
  actorUserId: string;
}

export interface ListUserTeamsParams {
  workspaceId: string;
  targetUserId: string;
  actorUserId: string;
}

export class TeamService {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly workspaceRepository: WorkspaceRepository,
  ) {}

  private async assertActorRole(
    workspaceId: string,
    actorUserId: string,
    allowedRoles: ("OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER")[] = ["OWNER", "ADMIN"],
  ) {
    const actorMembership = await this.workspaceRepository.findMembership(
      workspaceId,
      actorUserId,
    );

    if (!actorMembership) {
      throw new WorkspaceNotFoundError();
    }

    if (!allowedRoles.includes(actorMembership.role)) {
      throw new WorkspacePermissionDeniedError(
        `Action requires one of [${allowedRoles.join(", ")}] roles in this workspace.`,
      );
    }

    return actorMembership;
  }

  async createTeam(params: CreateTeamParams): Promise<Team> {
    await this.assertActorRole(params.workspaceId, params.actorUserId, ["OWNER", "ADMIN"]);

    const rawSlug = params.slug && params.slug.trim().length > 0 ? params.slug : params.name;
    const slug = slugify(rawSlug);

    if (!slug) {
      throw new Error("Invalid team name or slug.");
    }

    return this.teamRepository.create({
      workspaceId: params.workspaceId,
      name: params.name.trim(),
      slug,
    });
  }

  async addTeamMember(params: AddTeamMemberParams): Promise<TeamMember> {
    await this.assertActorRole(params.workspaceId, params.actorUserId, ["OWNER", "ADMIN"]);

    const team = await this.teamRepository.findById(params.workspaceId, params.teamId);
    if (!team) {
      throw new TeamNotFoundError();
    }

    // Invariant: Target user must be a member of the workspace
    const targetWorkspaceMember = await this.workspaceRepository.findMembership(
      params.workspaceId,
      params.targetUserId,
    );

    if (!targetWorkspaceMember) {
      throw new WorkspaceMembershipNotFoundError();
    }

    const existingTeamMember = await this.teamRepository.findMember(params.teamId, params.targetUserId);
    if (existingTeamMember) {
      throw new TeamMemberAlreadyExistsError();
    }

    return this.teamRepository.addMember(params.teamId, params.targetUserId);
  }

  async removeTeamMember(params: RemoveTeamMemberParams): Promise<void> {
    await this.assertActorRole(params.workspaceId, params.actorUserId, ["OWNER", "ADMIN"]);

    const team = await this.teamRepository.findById(params.workspaceId, params.teamId);
    if (!team) {
      throw new TeamNotFoundError();
    }

    const removed = await this.teamRepository.removeMember(params.teamId, params.targetUserId);
    if (!removed) {
      throw new TeamMemberNotFoundError();
    }
  }

  async listTeamMembers(params: ListTeamMembersParams): Promise<TeamMember[]> {
    await this.assertActorRole(params.workspaceId, params.actorUserId, ["OWNER", "ADMIN", "DEVELOPER", "VIEWER"]);

    const team = await this.teamRepository.findById(params.workspaceId, params.teamId);
    if (!team) {
      throw new TeamNotFoundError();
    }

    return this.teamRepository.listMembers(params.teamId);
  }

  async listUserTeams(params: ListUserTeamsParams): Promise<Team[]> {
    await this.assertActorRole(params.workspaceId, params.actorUserId, ["OWNER", "ADMIN", "DEVELOPER", "VIEWER"]);

    // Verify target user is a workspace member
    const targetWorkspaceMember = await this.workspaceRepository.findMembership(
      params.workspaceId,
      params.targetUserId,
    );

    if (!targetWorkspaceMember) {
      throw new WorkspaceMembershipNotFoundError();
    }

    return this.teamRepository.findTeamsForUser(params.workspaceId, params.targetUserId);
  }
}

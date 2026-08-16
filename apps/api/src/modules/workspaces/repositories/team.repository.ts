import type { CreateTeamInput, Team, TeamMember } from "../workspace.types.js";

export interface TeamRepository {
  create(input: CreateTeamInput): Promise<Team>;

  findById(
    workspaceId: string,
    teamId: string,
  ): Promise<Team | null>;

  findByWorkspaceAndSlug(
    workspaceId: string,
    slug: string,
  ): Promise<Team | null>;

  findAllByWorkspaceId(
    workspaceId: string,
  ): Promise<Team[]>;

  addMember(
    teamId: string,
    userId: string,
  ): Promise<TeamMember>;

  removeMember(
    teamId: string,
    userId: string,
  ): Promise<boolean>;

  findMember(
    teamId: string,
    userId: string,
  ): Promise<TeamMember | null>;

  listMembers(
    teamId: string,
  ): Promise<TeamMember[]>;

  findTeamsForUser(
    workspaceId: string,
    userId: string,
  ): Promise<Team[]>;
}

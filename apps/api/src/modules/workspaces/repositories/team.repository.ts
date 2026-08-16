import type { CreateTeamInput, Team } from "../workspace.types.js";

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
}

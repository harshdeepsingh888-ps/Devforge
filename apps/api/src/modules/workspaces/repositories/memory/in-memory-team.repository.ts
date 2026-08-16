import { randomUUID } from "node:crypto";

import { TeamSlugAlreadyExistsError } from "../../workspace.errors.js";
import type { CreateTeamInput, Team } from "../../workspace.types.js";
import type { TeamRepository } from "../team.repository.js";

export class InMemoryTeamRepository implements TeamRepository {
  private readonly teams = new Map<string, Team>();

  async create(input: CreateTeamInput): Promise<Team> {
    const existing = await this.findByWorkspaceAndSlug(
      input.workspaceId,
      input.slug,
    );

    if (existing) {
      throw new TeamSlugAlreadyExistsError();
    }

    const timestamp = new Date().toISOString();

    const team: Team = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      name: input.name,
      slug: input.slug,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.teams.set(team.id, team);

    return team;
  }

  async findById(
    workspaceId: string,
    teamId: string,
  ): Promise<Team | null> {
    const team = this.teams.get(teamId);

    if (!team || team.workspaceId !== workspaceId) {
      return null;
    }

    return team;
  }

  async findByWorkspaceAndSlug(
    workspaceId: string,
    slug: string,
  ): Promise<Team | null> {
    const normalizedSlug = slug.trim().toLowerCase();

    for (const team of this.teams.values()) {
      if (
        team.workspaceId === workspaceId &&
        team.slug === normalizedSlug
      ) {
        return team;
      }
    }

    return null;
  }

  async findAllByWorkspaceId(
    workspaceId: string,
  ): Promise<Team[]> {
    const results: Team[] = [];

    for (const team of this.teams.values()) {
      if (team.workspaceId === workspaceId) {
        results.push(team);
      }
    }

    return results;
  }
}

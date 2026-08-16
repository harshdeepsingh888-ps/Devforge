import { randomUUID } from "node:crypto";

import { TeamSlugAlreadyExistsError } from "../../workspace.errors.js";
import type { CreateTeamInput, Team, TeamMember } from "../../workspace.types.js";
import type { TeamRepository } from "../team.repository.js";

export class InMemoryTeamRepository implements TeamRepository {
  private readonly teams = new Map<string, Team>();
  private readonly members = new Map<string, TeamMember>();

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

  async addMember(teamId: string, userId: string): Promise<TeamMember> {
    const key = `${teamId}:${userId}`;
    const member: TeamMember = {
      teamId,
      userId,
      createdAt: new Date().toISOString(),
    };
    this.members.set(key, member);
    return member;
  }

  async removeMember(teamId: string, userId: string): Promise<boolean> {
    const key = `${teamId}:${userId}`;
    return this.members.delete(key);
  }

  async findMember(teamId: string, userId: string): Promise<TeamMember | null> {
    const key = `${teamId}:${userId}`;
    return this.members.get(key) ?? null;
  }

  async listMembers(teamId: string): Promise<TeamMember[]> {
    const results: TeamMember[] = [];
    for (const member of this.members.values()) {
      if (member.teamId === teamId) {
        results.push(member);
      }
    }
    return results;
  }

  async findTeamsForUser(
    workspaceId: string,
    userId: string,
  ): Promise<Team[]> {
    const matchingTeamIds = new Set<string>();
    for (const member of this.members.values()) {
      if (member.userId === userId) {
        matchingTeamIds.add(member.teamId);
      }
    }

    const results: Team[] = [];
    for (const teamId of matchingTeamIds) {
      const team = this.teams.get(teamId);
      if (team && team.workspaceId === workspaceId) {
        results.push(team);
      }
    }

    return results;
  }
}

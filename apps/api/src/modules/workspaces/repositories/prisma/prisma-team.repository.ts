import type { PrismaClient } from "../../../../generated/prisma/client.js";
import { prisma } from "../../../../infrastructure/database/prisma.js";
import type { TeamRepository } from "../team.repository.js";
import type { CreateTeamInput, Team, TeamMember } from "../../workspace.types.js";
import { TeamSlugAlreadyExistsError } from "../../workspace.errors.js";

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

type TeamDatabaseClient = Pick<
  PrismaClient,
  "team" | "teamMember"
>;

function toTeamDomain(raw: any): Team {
  return {
    id: raw.id,
    workspaceId: raw.workspaceId,
    name: raw.name,
    slug: raw.slug,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

function toTeamMemberDomain(raw: any): TeamMember {
  return {
    teamId: raw.teamId,
    userId: raw.userId,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
  };
}

export class PrismaTeamRepository implements TeamRepository {
  constructor(private readonly database: TeamDatabaseClient = prisma) {}

  async create(input: CreateTeamInput): Promise<Team> {
    try {
      const team = await this.database.team.create({
        data: {
          workspaceId: input.workspaceId,
          name: input.name.trim(),
          slug: input.slug.trim(),
        },
      });
      return toTeamDomain(team);
    } catch (error) {
      // @@unique([workspaceId, slug]) in schema.prisma; mirror the in-memory repository's behaviour.
      if (isUniqueConstraintViolation(error)) {
        throw new TeamSlugAlreadyExistsError();
      }
      throw error;
    }
  }

  async findById(workspaceId: string, teamId: string): Promise<Team | null> {
    const team = await this.database.team.findFirst({
      where: {
        id: teamId,
        workspaceId,
      },
    });
    return team ? toTeamDomain(team) : null;
  }

  async findByWorkspaceAndSlug(workspaceId: string, slug: string): Promise<Team | null> {
    const team = await this.database.team.findUnique({
      where: {
        workspaceId_slug: {
          workspaceId,
          slug,
        },
      },
    });
    return team ? toTeamDomain(team) : null;
  }

  async findAllByWorkspaceId(workspaceId: string): Promise<Team[]> {
    const teams = await this.database.team.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    });
    return teams.map(toTeamDomain);
  }

  async addMember(teamId: string, userId: string): Promise<TeamMember> {
    const member = await this.database.teamMember.create({
      data: { teamId, userId },
    });
    return toTeamMemberDomain(member);
  }

  async removeMember(teamId: string, userId: string): Promise<boolean> {
    const existing = await this.findMember(teamId, userId);
    if (!existing) return false;

    await this.database.teamMember.delete({
      where: {
        teamId_userId: { teamId, userId },
      },
    });
    return true;
  }

  async findMember(teamId: string, userId: string): Promise<TeamMember | null> {
    const member = await this.database.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
    });
    return member ? toTeamMemberDomain(member) : null;
  }

  async listMembers(teamId: string): Promise<TeamMember[]> {
    const members = await this.database.teamMember.findMany({
      where: { teamId },
      orderBy: { createdAt: "asc" },
    });
    return members.map(toTeamMemberDomain);
  }

  async findTeamsForUser(workspaceId: string, userId: string): Promise<Team[]> {
    const memberships = await (this.database as any).teamMember.findMany({
      where: {
        userId,
        team: { workspaceId },
      },
      include: { team: true },
    });
    return memberships.map((m: any) => toTeamDomain(m.team));
  }
}

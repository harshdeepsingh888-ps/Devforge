import type { PrismaClient } from "../../generated/prisma/client.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import type { ProjectRepository } from "./project.repository.js";
import type {
  CreateProjectInput,
  Project,
  ProjectStatus,
} from "./project.types.js";

type ProjectDatabaseClient = Pick<PrismaClient, "project">;

function toProjectDomain(raw: any): Project {
  return {
    id: raw.id,
    workspaceId: raw.workspaceId,
    name: raw.name,
    description: raw.description ?? null,
    status: raw.status as ProjectStatus,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

export class PrismaProjectRepository implements ProjectRepository {
  constructor(
    private readonly database: ProjectDatabaseClient = prisma,
  ) {}

  async create(input: CreateProjectInput): Promise<Project> {
    const project = await this.database.project.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name.trim(),
        description: input.description ?? null,
      },
    });

    return toProjectDomain(project);
  }

  async findAllByWorkspaceId(workspaceId: string): Promise<Project[]> {
    const projects = await this.database.project.findMany({
      where: { workspaceId },
    });
    return projects.map(toProjectDomain);
  }

  async findById(
    workspaceId: string,
    projectId: string,
  ): Promise<Project | null> {
    const project = await this.database.project.findFirst({
      where: { id: projectId, workspaceId },
    });
    return project ? toProjectDomain(project) : null;
  }

  async updateStatus(
    workspaceId: string,
    projectId: string,
    status: ProjectStatus,
  ): Promise<Project | null> {
    const existing = await this.findById(workspaceId, projectId);
    if (!existing) return null;

    const updated = await this.database.project.update({
      where: { id: projectId },
      data: { status },
    });

    return toProjectDomain(updated);
  }
}

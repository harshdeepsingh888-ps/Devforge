import { randomUUID } from "node:crypto";

import type {
  CreateProjectInput,
  Project,
  ProjectStatus,
} from "./project.types.js";

export interface ProjectRepository {
  create(input: CreateProjectInput): Promise<Project>;
  findAll(): Promise<Project[]>;
  findById(projectId: string): Promise<Project | null>;
  updateStatus(
    projectId: string,
    status: ProjectStatus,
  ): Promise<Project | null>;
}

export class InMemoryProjectRepository
  implements ProjectRepository
{
  private readonly projects = new Map<string, Project>();

  async create(
    input: CreateProjectInput,
  ): Promise<Project> {
    const timestamp = new Date().toISOString();

    const project: Project = {
      id: randomUUID(),
      name: input.name,
      description: input.description ?? null,
      status: "ACTIVE",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.projects.set(project.id, project);

    return project;
  }

  async findAll(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async findById(
    projectId: string,
  ): Promise<Project | null> {
    return this.projects.get(projectId) ?? null;
  }

  async updateStatus(
    projectId: string,
    status: ProjectStatus,
  ): Promise<Project | null> {
    const project = this.projects.get(projectId);

    if (!project) {
      return null;
    }

    const updatedProject: Project = {
      ...project,
      status,
      updatedAt: new Date().toISOString(),
    };

    this.projects.set(projectId, updatedProject);

    return updatedProject;
  }
}
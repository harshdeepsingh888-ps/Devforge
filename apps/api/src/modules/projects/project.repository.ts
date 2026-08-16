import { randomUUID } from "node:crypto";

import type {
  CreateProjectInput,
  Project,
  ProjectStatus,
} from "./project.types.js";

export interface ProjectRepository {
  create(input: CreateProjectInput): Promise<Project>;
  findAllByWorkspaceId(workspaceId: string): Promise<Project[]>;
  findById(
    workspaceId: string,
    projectId: string,
  ): Promise<Project | null>;
  updateStatus(
    workspaceId: string,
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
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description ?? null,
      status: "ACTIVE",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.projects.set(project.id, project);

    return project;
  }

  async findAllByWorkspaceId(workspaceId: string): Promise<Project[]> {
    const results: Project[] = [];
    for (const project of this.projects.values()) {
      if (project.workspaceId === workspaceId) {
        results.push(project);
      }
    }
    return results;
  }

  async findById(
    workspaceId: string,
    projectId: string,
  ): Promise<Project | null> {
    const project = this.projects.get(projectId);
    if (!project || project.workspaceId !== workspaceId) {
      return null;
    }
    return project;
  }

  async updateStatus(
    workspaceId: string,
    projectId: string,
    status: ProjectStatus,
  ): Promise<Project | null> {
    const project = await this.findById(workspaceId, projectId);

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
import { randomUUID } from "node:crypto";

import type {
  CreateProjectInput,
  Project,
} from "./project.types.js";

export interface ProjectRepository {
  create(input: CreateProjectInput): Promise<Project>;
  findAll(): Promise<Project[]>;
}

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<string, Project>();

  async create(input: CreateProjectInput): Promise<Project> {
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
}

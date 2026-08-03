import type { FastifyPluginAsync } from "fastify";

import type { ProjectRepository } from "./project.repository.js";
import {
  createProjectSchema,
  getProjectSchema,
  listProjectsSchema,
  updateProjectStatusSchema,
} from "./project.schemas.js";
import type { ProjectStatus } from "./project.types.js";

interface ProjectRoutesOptions {
  repository: ProjectRepository;
}

interface CreateProjectBody {
  name: string;
  description?: string;
}

interface ProjectParams {
  projectId: string;
}

interface UpdateProjectStatusBody {
  status: ProjectStatus;
}

export const projectRoutes: FastifyPluginAsync<
  ProjectRoutesOptions
> = async (app, options) => {
  app.get(
    "/",
    {
      schema: listProjectsSchema,
    },
    async () => {
      const projects = await options.repository.findAll();

      return {
        data: projects,
      };
    },
  );

  app.get<{
    Params: ProjectParams;
  }>(
    "/:projectId",
    {
      schema: getProjectSchema,
    },
    async (request, reply) => {
      const project = await options.repository.findById(
        request.params.projectId,
      );

      if (!project) {
        return reply.code(404).send({
          error: "PROJECT_NOT_FOUND",
          message: "Project not found.",
        });
      }

      return {
        data: project,
      };
    },
  );

  app.post<{
    Body: CreateProjectBody;
  }>(
    "/",
    {
      schema: createProjectSchema,
    },
    async (request, reply) => {
      const name = request.body.name.trim();
      const description =
        request.body.description?.trim();

      if (name.length === 0) {
        return reply.code(400).send({
          error: "VALIDATION_ERROR",
          message: "Project name cannot be empty.",
        });
      }

      const project = await options.repository.create({
        name,
        ...(description !== undefined && {
          description,
        }),
      });

      return reply.code(201).send({
        data: project,
      });
    },
  );

  app.patch<{
    Params: ProjectParams;
    Body: UpdateProjectStatusBody;
  }>(
    "/:projectId/status",
    {
      schema: updateProjectStatusSchema,
    },
    async (request, reply) => {
      const project =
        await options.repository.updateStatus(
          request.params.projectId,
          request.body.status,
        );

      if (!project) {
        return reply.code(404).send({
          error: "PROJECT_NOT_FOUND",
          message: "Project not found.",
        });
      }

      return {
        data: project,
      };
    },
  );
};
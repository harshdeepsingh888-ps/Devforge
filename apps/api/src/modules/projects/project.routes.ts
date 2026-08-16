import type { FastifyPluginAsync } from "fastify";

import type { ProjectRepository } from "./project.repository.js";
import {
  createProjectSchema,
  getProjectSchema,
  listProjectsSchema,
  updateProjectStatusSchema,
} from "./project.schemas.js";
import type { ProjectStatus } from "./project.types.js";
import type { WorkspaceService } from "../workspaces/services/workspace.service.js";
import { createWorkspaceTenantGuard } from "../workspaces/plugins/workspace-tenant.plugin.js";

interface ProjectRoutesOptions {
  repository: ProjectRepository;
  workspaceService: WorkspaceService;
}

interface CreateProjectBody {
  name: string;
  description?: string;
}

interface WorkspaceParams {
  workspaceId: string;
}

interface WorkspaceProjectParams extends WorkspaceParams {
  projectId: string;
}

interface UpdateProjectStatusBody {
  status: ProjectStatus;
}

export const projectRoutes: FastifyPluginAsync<
  ProjectRoutesOptions
> = async (app, options) => {
  const requireWorkspaceMember = createWorkspaceTenantGuard(options.workspaceService);

  app.addHook("preHandler", requireWorkspaceMember);

  app.get<{
    Params: WorkspaceParams;
  }>(
    "/",
    {
      schema: listProjectsSchema,
    },
    async (request) => {
      const projects = await options.repository.findAllByWorkspaceId(
        request.params.workspaceId,
      );

      return {
        data: projects,
      };
    },
  );

  app.get<{
    Params: WorkspaceProjectParams;
  }>(
    "/:projectId",
    {
      schema: getProjectSchema,
    },
    async (request, reply) => {
      const project = await options.repository.findById(
        request.params.workspaceId,
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
    Params: WorkspaceParams;
    Body: CreateProjectBody;
  }>(
    "/",
    {
      schema: createProjectSchema,
    },
    async (request, reply) => {
      const name = request.body.name.trim();
      const description = request.body.description?.trim();

      if (name.length === 0) {
        return reply.code(400).send({
          error: "VALIDATION_ERROR",
          message: "Project name cannot be empty.",
        });
      }

      const project = await options.repository.create({
        workspaceId: request.params.workspaceId,
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
    Params: WorkspaceProjectParams;
    Body: UpdateProjectStatusBody;
  }>(
    "/:projectId/status",
    {
      schema: updateProjectStatusSchema,
    },
    async (request, reply) => {
      const project = await options.repository.updateStatus(
        request.params.workspaceId,
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
import type { FastifyPluginAsync } from "fastify";
import {
  createWorkspaceSchema,
  listWorkspacesSchema,
  getWorkspaceSchema,
  addWorkspaceMemberSchema,
} from "../workspace.schemas.js";
import {
  WorkspaceNotFoundError,
  WorkspaceSlugAlreadyExistsError,
  WorkspaceMembershipAlreadyExistsError,
} from "../workspace.errors.js";
import type { WorkspaceService } from "../services/workspace.service.js";
import type { WorkspaceRole } from "../workspace.types.js";

export interface WorkspaceRoutesOptions {
  service: WorkspaceService;
}

export const workspaceRoutes: FastifyPluginAsync<WorkspaceRoutesOptions> = async (
  app,
  options,
) => {
  const { service } = options;

  app.addHook("preHandler", async (request, reply) => {
    const userId =
      request.auth?.userId ?? (request.headers["x-user-id"] as string | undefined);
    if (!userId) {
      return reply.code(401).send({
        error: "UNAUTHORIZED",
        message: "Authentication required to access workspaces.",
        requestId: request.id,
      });
    }
  });

  app.post<{
    Body: { name: string; slug?: string };
  }>("/", { schema: createWorkspaceSchema }, async (request, reply) => {
    const userId = (request.auth?.userId ?? request.headers["x-user-id"]) as string;
    try {
      const workspace = await service.createWorkspace({
        name: request.body.name,
        slug: request.body.slug,
        creatorUserId: userId,
      });

      return reply.code(201).send({ data: workspace });
    } catch (error) {
      if (error instanceof WorkspaceSlugAlreadyExistsError) {
        return reply.code(409).send({
          error: error.code,
          message: error.message,
        });
      }
      throw error;
    }
  });

  app.get("/", { schema: listWorkspacesSchema }, async (request, reply) => {
    const userId = (request.auth?.userId ?? request.headers["x-user-id"]) as string;
    const workspaces = await service.listUserWorkspaces(userId);
    return reply.code(200).send({ data: workspaces });
  });

  app.get<{
    Params: { workspaceId: string };
  }>("/:workspaceId", { schema: getWorkspaceSchema }, async (request, reply) => {
    const userId = (request.auth?.userId ?? request.headers["x-user-id"]) as string;
    try {
      const workspace = await service.getWorkspaceForUser(
        request.params.workspaceId,
        userId,
      );
      return reply.code(200).send({ data: workspace });
    } catch (error) {
      if (error instanceof WorkspaceNotFoundError) {
        return reply.code(404).send({
          error: error.code,
          message: error.message,
        });
      }
      throw error;
    }
  });

  app.post<{
    Params: { workspaceId: string };
    Body: { userId: string; role: WorkspaceRole };
  }>("/:workspaceId/members", { schema: addWorkspaceMemberSchema }, async (request, reply) => {
    const actorUserId = (request.auth?.userId ?? request.headers["x-user-id"]) as string;
    try {
      const member = await service.addMember({
        workspaceId: request.params.workspaceId,
        actorUserId,
        targetUserId: request.body.userId,
        role: request.body.role,
      });

      return reply.code(201).send({ data: member });
    } catch (error) {
      if (error instanceof WorkspaceNotFoundError) {
        return reply.code(404).send({
          error: error.code,
          message: error.message,
        });
      }
      if (error instanceof WorkspaceMembershipAlreadyExistsError) {
        return reply.code(409).send({
          error: error.code,
          message: error.message,
        });
      }
      throw error;
    }
  });
};

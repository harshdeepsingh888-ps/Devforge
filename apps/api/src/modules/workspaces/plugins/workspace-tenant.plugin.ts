import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import type { WorkspaceService } from "../services/workspace.service.js";
import type { WorkspaceWithMembership, WorkspaceRole } from "../workspace.types.js";
import { WorkspaceNotFoundError } from "../workspace.errors.js";

declare module "fastify" {
  interface FastifyRequest {
    workspaceContext: WorkspaceWithMembership | null;
  }
}

export interface WorkspaceTenantPluginOptions {
  workspaceService: WorkspaceService;
}

const workspaceTenantPluginImplementation: FastifyPluginAsync<
  WorkspaceTenantPluginOptions
> = async (app) => {
  app.decorateRequest("workspaceContext", null);
};

export const workspaceTenantPlugin = fp(
  workspaceTenantPluginImplementation,
  {
    name: "devforge-workspace-tenant",
  },
);

export function createWorkspaceTenantGuard(workspaceService: WorkspaceService) {
  return async function requireWorkspaceMember(
    request: FastifyRequest<{ Params: { workspaceId?: string } }>,
    reply: FastifyReply,
  ) {
    if (!request.auth) {
      return reply.code(401).send({
        error: "UNAUTHORIZED",
        message: "Authentication required to access workspace resources.",
        requestId: request.id,
      });
    }

    const userId = request.auth.userId;
    const workspaceId =
      request.params?.workspaceId ?? (request.headers["x-workspace-id"] as string | undefined);

    if (!workspaceId) {
      return reply.code(400).send({
        error: "MISSING_WORKSPACE_CONTEXT",
        message: "Workspace ID context must be specified in route parameter or header.",
        requestId: request.id,
      });
    }

    try {
      const workspaceContext = await workspaceService.getWorkspaceForUser(
        workspaceId,
        userId,
      );
      request.workspaceContext = workspaceContext;
    } catch (error) {
      if (error instanceof WorkspaceNotFoundError) {
        return reply.code(404).send({
          error: "WORKSPACE_NOT_FOUND",
          message: "Workspace not found.",
          requestId: request.id,
        });
      }
      throw error;
    }
  };
}

export function requireWorkspaceRole(requiredRole: WorkspaceRole) {
  return async function checkRole(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    if (!request.workspaceContext) {
      return reply.code(500).send({
        error: "TENANT_GUARD_MISSING",
        message: "requireWorkspaceMember guard must execute before requireWorkspaceRole.",
        requestId: request.id,
      });
    }

    if (request.workspaceContext.membership.role !== requiredRole) {
      return reply.code(403).send({
        error: "FORBIDDEN",
        message: `Action requires ${requiredRole} role in this workspace.`,
        requestId: request.id,
      });
    }
  };
}

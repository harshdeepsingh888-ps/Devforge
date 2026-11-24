import type { FastifyPluginAsync, FastifyReply } from "fastify";

import { createWorkspaceTenantGuard } from "../plugins/workspace-tenant.plugin.js";
import type { WorkspaceService } from "../services/workspace.service.js";
import type { WorkspaceRole } from "../workspace.types.js";
import {
  removeWorkspaceMemberSchema,
  updateWorkspaceMemberRoleSchema,
} from "../workspace.schemas.js";
import {
  WorkspaceMembershipNotFoundError,
  WorkspaceNotFoundError,
  WorkspaceOwnerRequiredError,
  WorkspacePermissionDeniedError,
} from "../workspace.errors.js";

/**
 * Maps membership domain errors to HTTP. Anything unknown is rethrown so the
 * global handler returns a safe 500 and logs it.
 */
export function handleMemberError(error: unknown, reply: FastifyReply) {
  if (
    error instanceof WorkspaceNotFoundError ||
    error instanceof WorkspaceMembershipNotFoundError
  ) {
    return reply.code(404).send({ error: error.code, message: error.message });
  }

  if (error instanceof WorkspacePermissionDeniedError) {
    return reply.code(403).send({ error: "FORBIDDEN", message: error.message });
  }

  if (error instanceof WorkspaceOwnerRequiredError) {
    return reply.code(409).send({ error: error.code, message: error.message });
  }

  throw error;
}

export interface WorkspaceMemberRoutesOptions {
  workspaceService: WorkspaceService;
}

/**
 * Per-member administration: registered under
 * /api/workspaces/:workspaceId/members. Every route requires workspace
 * membership (404 for outsiders); who may change or remove whom is decided
 * by WorkspaceService, since leaving is open to every role.
 */
export const workspaceMemberRoutes: FastifyPluginAsync<
  WorkspaceMemberRoutesOptions
> = async (app, options) => {
  const { workspaceService } = options;

  app.addHook("preHandler", createWorkspaceTenantGuard(workspaceService));

  app.patch<{
    Params: { workspaceId: string; userId: string };
    Body: { role: WorkspaceRole };
  }>("/:userId", { schema: updateWorkspaceMemberRoleSchema }, async (request, reply) => {
    try {
      const membership = await workspaceService.changeMemberRole({
        workspaceId: request.params.workspaceId,
        actorUserId: request.auth!.userId,
        targetUserId: request.params.userId,
        role: request.body.role,
      });

      return reply.code(200).send({ data: membership });
    } catch (error) {
      return handleMemberError(error, reply);
    }
  });

  app.delete<{
    Params: { workspaceId: string; userId: string };
  }>("/:userId", { schema: removeWorkspaceMemberSchema }, async (request, reply) => {
    try {
      await workspaceService.removeMember({
        workspaceId: request.params.workspaceId,
        actorUserId: request.auth!.userId,
        targetUserId: request.params.userId,
      });

      return reply.code(204).send();
    } catch (error) {
      return handleMemberError(error, reply);
    }
  });
};

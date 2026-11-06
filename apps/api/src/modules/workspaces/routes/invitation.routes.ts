import type { FastifyPluginAsync, FastifyReply } from "fastify";

import { requireAuth } from "../../auth/guards/require-auth.guard.js";
import {
  createWorkspaceTenantGuard,
  requireWorkspaceRole,
} from "../plugins/workspace-tenant.plugin.js";
import type { InvitationService } from "../services/invitation.service.js";
import type { WorkspaceService } from "../services/workspace.service.js";
import type { WorkspaceRole } from "../workspace.types.js";
import {
  acceptInvitationSchema,
  createInvitationSchema,
  listInvitationsSchema,
  lookupInvitationSchema,
  revokeInvitationSchema,
} from "../invitation.schemas.js";
import {
  InvitationAlreadyAcceptedError,
  InvitationAlreadyPendingError,
  InvitationCannotBeRevokedError,
  InvitationEmailMismatchError,
  InvitationExpiredError,
  InvitationNotFoundError,
  InvitationRevokedError,
  WorkspaceMembershipAlreadyExistsError,
  WorkspaceNotFoundError,
  WorkspacePermissionDeniedError,
} from "../workspace.errors.js";

/**
 * Maps invitation domain errors to HTTP. Anything unknown is rethrown so the
 * global handler returns a safe 500 and logs it.
 */
export function handleInvitationError(error: unknown, reply: FastifyReply) {
  if (
    error instanceof WorkspaceNotFoundError ||
    error instanceof InvitationNotFoundError
  ) {
    return reply.code(404).send({ error: error.code, message: error.message });
  }

  if (error instanceof WorkspacePermissionDeniedError) {
    return reply.code(403).send({ error: "FORBIDDEN", message: error.message });
  }

  if (error instanceof InvitationEmailMismatchError) {
    return reply.code(403).send({ error: error.code, message: error.message });
  }

  if (
    error instanceof InvitationAlreadyPendingError ||
    error instanceof InvitationAlreadyAcceptedError ||
    error instanceof InvitationCannotBeRevokedError ||
    error instanceof WorkspaceMembershipAlreadyExistsError
  ) {
    return reply.code(409).send({ error: error.code, message: error.message });
  }

  if (
    error instanceof InvitationExpiredError ||
    error instanceof InvitationRevokedError
  ) {
    return reply.code(410).send({ error: error.code, message: error.message });
  }

  throw error;
}

export interface WorkspaceInvitationRoutesOptions {
  workspaceService: WorkspaceService;
  invitationService: InvitationService;
}

/**
 * Workspace-scoped administration: registered under
 * /api/workspaces/:workspaceId/invitations. Every route requires workspace
 * membership (404 for outsiders) and the ADMIN role or higher.
 */
export const workspaceInvitationRoutes: FastifyPluginAsync<
  WorkspaceInvitationRoutesOptions
> = async (app, options) => {
  const { workspaceService, invitationService } = options;

  app.addHook("preHandler", createWorkspaceTenantGuard(workspaceService));
  app.addHook("preHandler", requireWorkspaceRole("ADMIN"));

  app.post<{
    Params: { workspaceId: string };
    Body: { email: string; role: WorkspaceRole; expiresInDays?: number };
  }>("/", { schema: createInvitationSchema }, async (request, reply) => {
    try {
      const result = await invitationService.createInvitation({
        workspaceId: request.params.workspaceId,
        actorUserId: request.auth!.userId,
        email: request.body.email,
        role: request.body.role,
        expiresInDays: request.body.expiresInDays,
      });

      return reply.code(201).send({
        data: {
          invitation: result.invitation,
          token: result.rawToken,
        },
      });
    } catch (error) {
      return handleInvitationError(error, reply);
    }
  });

  app.get<{
    Params: { workspaceId: string };
  }>("/", { schema: listInvitationsSchema }, async (request, reply) => {
    try {
      const invitations = await invitationService.listWorkspaceInvitations({
        workspaceId: request.params.workspaceId,
        actorUserId: request.auth!.userId,
      });

      return reply.code(200).send({ data: invitations });
    } catch (error) {
      return handleInvitationError(error, reply);
    }
  });

  app.delete<{
    Params: { workspaceId: string; invitationId: string };
  }>("/:invitationId", { schema: revokeInvitationSchema }, async (request, reply) => {
    try {
      const invitation = await invitationService.revokeInvitation({
        workspaceId: request.params.workspaceId,
        invitationId: request.params.invitationId,
        actorUserId: request.auth!.userId,
      });

      return reply.code(200).send({ data: invitation });
    } catch (error) {
      return handleInvitationError(error, reply);
    }
  });
};

export interface InvitationRoutesOptions {
  workspaceService: WorkspaceService;
  invitationService: InvitationService;
}

/**
 * Invitee-facing routes: registered under /api/invitations. They need an
 * authenticated user but no workspace membership, since the point is to
 * obtain one. Tokens travel in the body so they never reach request logs.
 */
export const invitationRoutes: FastifyPluginAsync<InvitationRoutesOptions> = async (
  app,
  options,
) => {
  const { workspaceService, invitationService } = options;

  app.addHook("preHandler", requireAuth);

  app.post<{
    Body: { token: string };
  }>("/lookup", { schema: lookupInvitationSchema }, async (request, reply) => {
    try {
      const preview = await invitationService.getInvitationByToken(request.body.token);

      return reply.code(200).send({ data: preview });
    } catch (error) {
      return handleInvitationError(error, reply);
    }
  });

  app.post<{
    Body: { token: string };
  }>("/accept", { schema: acceptInvitationSchema }, async (request, reply) => {
    try {
      const userId = request.auth!.userId;

      const membership = await invitationService.acceptInvitation({
        rawToken: request.body.token,
        acceptingUserId: userId,
      });

      const { membership: _membership, ...workspace } =
        await workspaceService.getWorkspaceForUser(membership.workspaceId, userId);

      return reply.code(200).send({ data: { workspace, membership } });
    } catch (error) {
      return handleInvitationError(error, reply);
    }
  });
};

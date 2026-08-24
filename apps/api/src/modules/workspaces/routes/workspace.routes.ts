import type { FastifyPluginAsync } from "fastify";
import {
  createWorkspaceSchema,
  listWorkspacesSchema,
  getWorkspaceSchema,
  addWorkspaceMemberSchema,
  listWorkspaceMembersSchema,
  listWorkspaceTeamsSchema,
  createTeamSchema,
} from "../workspace.schemas.js";
import {
  WorkspaceNotFoundError,
  WorkspaceSlugAlreadyExistsError,
  WorkspaceMembershipAlreadyExistsError,
} from "../workspace.errors.js";
import type { WorkspaceService } from "../services/workspace.service.js";
import type { TeamService } from "../services/team.service.js";
import type { WorkspaceRole } from "../workspace.types.js";
import { requireAuth } from "../../auth/guards/require-auth.guard.js";

export interface WorkspaceRoutesOptions {
  service: WorkspaceService;
  teamService?: TeamService | undefined;
}

export const workspaceRoutes: FastifyPluginAsync<WorkspaceRoutesOptions> = async (
  app,
  options,
) => {
  const { service, teamService } = options;

  app.addHook("preHandler", requireAuth);

  app.post<{
    Body: { name: string; slug?: string };
  }>("/", { schema: createWorkspaceSchema }, async (request, reply) => {
    const userId = request.auth!.userId;
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
    const userId = request.auth!.userId;
    const workspaces = await service.listUserWorkspaces(userId);
    return reply.code(200).send({ data: workspaces });
  });

  app.get<{
    Params: { workspaceId: string };
  }>("/:workspaceId", { schema: getWorkspaceSchema }, async (request, reply) => {
    const userId = request.auth!.userId;
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

  app.get<{
    Params: { workspaceId: string };
  }>("/:workspaceId/members", { schema: listWorkspaceMembersSchema }, async (request, reply) => {
    const userId = request.auth!.userId;
    try {
      const members = await service.listWorkspaceMembers(
        request.params.workspaceId,
        userId,
      );
      return reply.code(200).send({ data: members });
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
    const actorUserId = request.auth!.userId;
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

  app.get<{
    Params: { workspaceId: string };
  }>("/:workspaceId/teams", { schema: listWorkspaceTeamsSchema }, async (request, reply) => {
    const userId = request.auth!.userId;
    if (!teamService) {
      return reply.code(200).send({ data: [] });
    }

    try {
      const teams = await teamService.listWorkspaceTeams({
        workspaceId: request.params.workspaceId,
        actorUserId: userId,
      });
      return reply.code(200).send({ data: teams });
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
    Body: { name: string; slug?: string };
  }>("/:workspaceId/teams", { schema: createTeamSchema }, async (request, reply) => {
    const userId = request.auth!.userId;
    if (!teamService) {
      return reply.code(500).send({ error: "INTERNAL_SERVER_ERROR", message: "Team service not available." });
    }

    try {
      const team = await teamService.createTeam({
        workspaceId: request.params.workspaceId,
        actorUserId: userId,
        name: request.body.name,
        slug: request.body.slug,
      });
      return reply.code(201).send({ data: team });
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
};

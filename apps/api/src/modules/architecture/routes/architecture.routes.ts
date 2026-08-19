import type { FastifyPluginAsync } from "fastify";
import {
  createWorkspaceTenantGuard,
  requireWorkspaceRole,
} from "../../workspaces/plugins/workspace-tenant.plugin.js";
import type { WorkspaceService } from "../../workspaces/services/workspace.service.js";
import { handleArchitectureError } from "../architecture.error-mapper.js";
import {
  createAdrSchema,
  createSpecSchema,
  linkAdrSpecSchema,
  linkAdrWorkItemSchema,
  linkSpecWorkItemSchema,
  updateAdrSchema,
  updateSpecSchema,
} from "../architecture.schemas.js";
import type { ArchitectureService } from "../services/architecture.service.js";

export interface ArchitectureRoutesOptions {
  workspaceService: WorkspaceService;
  architectureService: ArchitectureService;
}

export const architectureRoutes: FastifyPluginAsync<
  ArchitectureRoutesOptions
> = async (app, options) => {
  const { workspaceService, architectureService } = options;

  const requireWorkspaceMember = createWorkspaceTenantGuard(workspaceService);
  app.addHook("preHandler", requireWorkspaceMember);

  // --------------------------------------------------------------------------
  // ADR ENDPOINTS
  // --------------------------------------------------------------------------

  // 1. Create ADR
  app.post<{
    Params: { workspaceId: string };
    Body: {
      projectId?: string | null;
      title: string;
      context: string;
      decision: string;
      consequences: string;
    };
  }>("/adrs", { schema: createAdrSchema }, async (request, reply) => {
    const actorUserId = request.auth!.userId;
    try {
      const adr = await architectureService.createAdr({
        workspaceId: request.params.workspaceId,
        projectId: request.body.projectId ?? null,
        actorUserId,
        title: request.body.title,
        context: request.body.context,
        decision: request.body.decision,
        consequences: request.body.consequences,
      });

      return reply.code(201).send({ data: adr });
    } catch (error) {
      return handleArchitectureError(error, reply);
    }
  });

  // 2. Get ADR
  app.get<{
    Params: { workspaceId: string; adrId: string };
  }>("/adrs/:adrId", async (request, reply) => {
    try {
      const adr = await architectureService.getAdr(
        request.params.workspaceId,
        request.params.adrId,
      );

      return reply.code(200).send({ data: adr });
    } catch (error) {
      return handleArchitectureError(error, reply);
    }
  });

  // 3. Update ADR
  app.patch<{
    Params: { workspaceId: string; adrId: string };
    Body: {
      title?: string;
      context?: string;
      decision?: string;
      consequences?: string;
    };
  }>("/adrs/:adrId", { schema: updateAdrSchema }, async (request, reply) => {
    const actorUserId = request.auth!.userId;
    try {
      const adr = await architectureService.updateAdr(
        request.params.workspaceId,
        request.params.adrId,
        actorUserId,
        request.body,
      );

      return reply.code(200).send({ data: adr });
    } catch (error) {
      return handleArchitectureError(error, reply);
    }
  });

  // 4. Accept ADR (Requires ADMIN+)
  app.post<{
    Params: { workspaceId: string; adrId: string };
  }>(
    "/adrs/:adrId/accept",
    { preHandler: [requireWorkspaceRole("ADMIN")] },
    async (request, reply) => {
      const actorUserId = request.auth!.userId;
      try {
        const adr = await architectureService.acceptAdr(
          request.params.workspaceId,
          request.params.adrId,
          actorUserId,
        );

        return reply.code(200).send({ data: adr });
      } catch (error) {
        return handleArchitectureError(error, reply);
      }
    },
  );

  // 5. Reject ADR (Requires ADMIN+)
  app.post<{
    Params: { workspaceId: string; adrId: string };
  }>(
    "/adrs/:adrId/reject",
    { preHandler: [requireWorkspaceRole("ADMIN")] },
    async (request, reply) => {
      const actorUserId = request.auth!.userId;
      try {
        const adr = await architectureService.rejectAdr(
          request.params.workspaceId,
          request.params.adrId,
          actorUserId,
        );

        return reply.code(200).send({ data: adr });
      } catch (error) {
        return handleArchitectureError(error, reply);
      }
    },
  );

  // 6. Deprecate ADR
  app.post<{
    Params: { workspaceId: string; adrId: string };
  }>("/adrs/:adrId/deprecate", async (request, reply) => {
    const actorUserId = request.auth!.userId;
    try {
      const adr = await architectureService.deprecateAdr(
        request.params.workspaceId,
        request.params.adrId,
        actorUserId,
      );

      return reply.code(200).send({ data: adr });
    } catch (error) {
      return handleArchitectureError(error, reply);
    }
  });

  // --------------------------------------------------------------------------
  // TECHNICAL SPECIFICATION ENDPOINTS
  // --------------------------------------------------------------------------

  // 1. Create Spec
  app.post<{
    Params: { workspaceId: string };
    Body: {
      projectId: string;
      title: string;
      summary: string;
      content: string;
    };
  }>("/specs", { schema: createSpecSchema }, async (request, reply) => {
    const actorUserId = request.auth!.userId;
    try {
      const spec = await architectureService.createSpec({
        workspaceId: request.params.workspaceId,
        projectId: request.body.projectId,
        actorUserId,
        title: request.body.title,
        summary: request.body.summary,
        content: request.body.content,
      });

      return reply.code(201).send({ data: spec });
    } catch (error) {
      return handleArchitectureError(error, reply);
    }
  });

  // 2. Get Spec
  app.get<{
    Params: { workspaceId: string; specId: string };
  }>("/specs/:specId", async (request, reply) => {
    try {
      const spec = await architectureService.getSpec(
        request.params.workspaceId,
        request.params.specId,
      );

      return reply.code(200).send({ data: spec });
    } catch (error) {
      return handleArchitectureError(error, reply);
    }
  });

  // 3. Update Spec
  app.patch<{
    Params: { workspaceId: string; specId: string };
    Body: {
      title?: string;
      summary?: string;
      content?: string;
    };
  }>("/specs/:specId", { schema: updateSpecSchema }, async (request, reply) => {
    const actorUserId = request.auth!.userId;
    try {
      const spec = await architectureService.updateSpec(
        request.params.workspaceId,
        request.params.specId,
        actorUserId,
        request.body,
      );

      return reply.code(200).send({ data: spec });
    } catch (error) {
      return handleArchitectureError(error, reply);
    }
  });

  // 4. Approve Spec (Requires ADMIN+)
  app.post<{
    Params: { workspaceId: string; specId: string };
  }>(
    "/specs/:specId/approve",
    { preHandler: [requireWorkspaceRole("ADMIN")] },
    async (request, reply) => {
      const actorUserId = request.auth!.userId;
      try {
        const spec = await architectureService.approveSpec(
          request.params.workspaceId,
          request.params.specId,
          actorUserId,
        );

        return reply.code(200).send({ data: spec });
      } catch (error) {
        return handleArchitectureError(error, reply);
      }
    },
  );

  // 5. Archive Spec
  app.post<{
    Params: { workspaceId: string; specId: string };
  }>("/specs/:specId/archive", async (request, reply) => {
    const actorUserId = request.auth!.userId;
    try {
      const spec = await architectureService.archiveSpec(
        request.params.workspaceId,
        request.params.specId,
        actorUserId,
      );

      return reply.code(200).send({ data: spec });
    } catch (error) {
      return handleArchitectureError(error, reply);
    }
  });

  // --------------------------------------------------------------------------
  // TRACEABILITY LINKING ENDPOINTS
  // --------------------------------------------------------------------------

  // 1. Link ADR ↔ Spec
  app.post<{
    Params: { workspaceId: string };
    Body: { adrId: string; specId: string };
  }>(
    "/architecture/links/adr-spec",
    { schema: linkAdrSpecSchema },
    async (request, reply) => {
      const actorUserId = request.auth!.userId;
      try {
        const link = await architectureService.linkAdrToSpec(
          request.params.workspaceId,
          request.body.adrId,
          request.body.specId,
          actorUserId,
        );

        return reply.code(201).send({ data: link });
      } catch (error) {
        return handleArchitectureError(error, reply);
      }
    },
  );

  // 2. Link Spec ↔ WorkItem
  app.post<{
    Params: { workspaceId: string };
    Body: { specId: string; workItemId: string };
  }>(
    "/architecture/links/spec-work-item",
    { schema: linkSpecWorkItemSchema },
    async (request, reply) => {
      const actorUserId = request.auth!.userId;
      try {
        const link = await architectureService.linkSpecToWorkItem(
          request.params.workspaceId,
          request.body.specId,
          request.body.workItemId,
          actorUserId,
        );

        return reply.code(201).send({ data: link });
      } catch (error) {
        return handleArchitectureError(error, reply);
      }
    },
  );

  // 3. Link ADR ↔ WorkItem
  app.post<{
    Params: { workspaceId: string };
    Body: { adrId: string; workItemId: string };
  }>(
    "/architecture/links/adr-work-item",
    { schema: linkAdrWorkItemSchema },
    async (request, reply) => {
      const actorUserId = request.auth!.userId;
      try {
        const link = await architectureService.linkAdrToWorkItem(
          request.params.workspaceId,
          request.body.adrId,
          request.body.workItemId,
          actorUserId,
        );

        return reply.code(201).send({ data: link });
      } catch (error) {
        return handleArchitectureError(error, reply);
      }
    },
  );
};

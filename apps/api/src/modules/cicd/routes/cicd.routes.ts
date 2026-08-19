import type { FastifyPluginAsync } from "fastify";
import { createWorkspaceTenantGuard } from "../../workspaces/plugins/workspace-tenant.plugin.js";
import type { WorkspaceService } from "../../workspaces/services/workspace.service.js";
import { handleCicdError } from "../cicd.error-mapper.js";
import {
  createPipelineSchema,
  ingestPipelineRunSchema,
  recordDeploymentSchema,
} from "../cicd.schemas.js";
import type {
  DeploymentEnvironment,
  DeploymentStatus,
  PipelineProvider,
  PipelineRunStatus,
} from "../cicd.types.js";
import type { CicdService } from "../services/cicd.service.js";

export interface CicdRoutesOptions {
  workspaceService: WorkspaceService;
  cicdService: CicdService;
}

export const cicdRoutes: FastifyPluginAsync<CicdRoutesOptions> = async (
  app,
  options,
) => {
  const { workspaceService, cicdService } = options;

  const requireWorkspaceMember = createWorkspaceTenantGuard(workspaceService);
  app.addHook("preHandler", requireWorkspaceMember);

  // 1. POST /pipelines - Create Pipeline
  app.post<{
    Params: { workspaceId: string };
    Body: {
      projectId: string;
      provider?: PipelineProvider;
      name: string;
      externalId: string;
    };
  }>("/pipelines", { schema: createPipelineSchema }, async (request, reply) => {
    const { workspaceId } = request.params;
    try {
      const pipeline = await cicdService.createPipeline({
        workspaceId,
        projectId: request.body.projectId,
        provider: request.body.provider ?? "GITHUB_ACTIONS",
        name: request.body.name,
        externalId: request.body.externalId,
      });

      return reply.code(201).send({ data: pipeline });
    } catch (error) {
      return handleCicdError(error, reply);
    }
  });

  // 2. POST /pipelines/:pipelineId/runs - Ingest Pipeline Run
  app.post<{
    Params: { workspaceId: string; pipelineId: string };
    Body: {
      commitId: string;
      status?: PipelineRunStatus;
      startedAt?: string;
      finishedAt?: string | null;
      durationMs?: number | null;
      triggeredByUserId?: string | null;
      externalRunId: string;
    };
  }>(
    "/pipelines/:pipelineId/runs",
    { schema: ingestPipelineRunSchema },
    async (request, reply) => {
      const { workspaceId, pipelineId } = request.params;
      try {
        const run = await cicdService.ingestPipelineRun({
          workspaceId,
          pipelineId,
          commitId: request.body.commitId,
          status: request.body.status,
          startedAt: request.body.startedAt,
          finishedAt: request.body.finishedAt,
          durationMs: request.body.durationMs,
          triggeredByUserId: request.body.triggeredByUserId,
          externalRunId: request.body.externalRunId,
        });

        return reply.code(201).send({ data: run });
      } catch (error) {
        return handleCicdError(error, reply);
      }
    },
  );

  // 3. GET /pipelines/:pipelineId/runs - List Runs for Pipeline
  app.get<{
    Params: { workspaceId: string; pipelineId: string };
  }>("/pipelines/:pipelineId/runs", async (request, reply) => {
    const { workspaceId, pipelineId } = request.params;
    try {
      const runs = await cicdService.listRunsForPipeline(
        workspaceId,
        pipelineId,
      );

      return reply.code(200).send({ data: runs });
    } catch (error) {
      return handleCicdError(error, reply);
    }
  });

  // 4. POST /runs/:runId/deploy - Record Deployment
  app.post<{
    Params: { workspaceId: string; runId: string };
    Body: {
      environment: DeploymentEnvironment;
      status?: DeploymentStatus;
      deployedAt?: string;
    };
  }>(
    "/runs/:runId/deploy",
    { schema: recordDeploymentSchema },
    async (request, reply) => {
      const { workspaceId, runId } = request.params;
      try {
        const deployment = await cicdService.recordDeployment({
          workspaceId,
          pipelineRunId: runId,
          environment: request.body.environment,
          status: request.body.status,
          deployedAt: request.body.deployedAt,
        });

        return reply.code(201).send({ data: deployment });
      } catch (error) {
        return handleCicdError(error, reply);
      }
    },
  );

  // 5. GET /runs/:runId - Get Pipeline Run Trace
  app.get<{
    Params: { workspaceId: string; runId: string };
  }>("/runs/:runId", async (request, reply) => {
    const { workspaceId, runId } = request.params;
    try {
      const trace = await cicdService.getPipelineRunTrace(workspaceId, runId);
      return reply.code(200).send({ data: trace });
    } catch (error) {
      return handleCicdError(error, reply);
    }
  });
};

import type { FastifyPluginAsync } from "fastify";
import { createWorkspaceTenantGuard } from "../../workspaces/plugins/workspace-tenant.plugin.js";
import type { WorkspaceService } from "../../workspaces/services/workspace.service.js";
import { handleGitError } from "../git.error-mapper.js";
import {
  createRepositorySchema,
  getCommitTraceSchema,
  ingestCommitSchema,
  linkCommitToAdrSchema,
  linkCommitToWorkItemSchema,
} from "../git.schemas.js";
import type { GitProvider } from "../git.types.js";
import type { GitService } from "../services/git.service.js";

export interface GitRoutesOptions {
  workspaceService: WorkspaceService;
  gitService: GitService;
}

export const gitRoutes: FastifyPluginAsync<GitRoutesOptions> = async (
  app,
  options,
) => {
  const { workspaceService, gitService } = options;

  const requireWorkspaceMember = createWorkspaceTenantGuard(workspaceService);
  app.addHook("preHandler", requireWorkspaceMember);

  // 1. Create Repository
  app.post<{
    Params: { workspaceId: string };
    Body: {
      name: string;
      provider?: GitProvider;
      externalId: string;
      url: string;
    };
  }>(
    "/repositories",
    { schema: createRepositorySchema },
    async (request, reply) => {
      const { workspaceId } = request.params;
      try {
        const repo = await gitService.createRepository({
          workspaceId,
          name: request.body.name,
          provider: request.body.provider ?? "GITHUB",
          externalId: request.body.externalId,
          url: request.body.url,
        });

        return reply.code(201).send({ data: repo });
      } catch (error) {
        return handleGitError(error, reply);
      }
    },
  );

  // 2. Ingest Commit
  app.post<{
    Params: { workspaceId: string; repoId: string };
    Body: {
      externalId: string;
      message: string;
      authorName: string;
      authorEmail: string;
      committedAt: string;
      url: string;
    };
  }>(
    "/repositories/:repoId/commits",
    { schema: ingestCommitSchema },
    async (request, reply) => {
      const { workspaceId, repoId } = request.params;
      try {
        const commit = await gitService.ingestCommit({
          workspaceId,
          repositoryId: repoId,
          externalId: request.body.externalId,
          message: request.body.message,
          authorName: request.body.authorName,
          authorEmail: request.body.authorEmail,
          committedAt: request.body.committedAt,
          url: request.body.url,
        });

        return reply.code(201).send({ data: commit });
      } catch (error) {
        return handleGitError(error, reply);
      }
    },
  );

  // 3. Get Commit Trace
  app.get<{
    Params: { workspaceId: string; commitId: string };
  }>(
    "/commits/:commitId",
    { schema: getCommitTraceSchema },
    async (request, reply) => {
      const { workspaceId, commitId } = request.params;
      try {
        const trace = await gitService.getCommitTrace(commitId, workspaceId);
        return reply.code(200).send({ data: trace });
      } catch (error) {
        return handleGitError(error, reply);
      }
    },
  );

  // 4. Link Commit to WorkItem
  app.post<{
    Params: { workspaceId: string; commitId: string };
    Body: { workItemId: string };
  }>(
    "/commits/:commitId/link/work-items",
    { schema: linkCommitToWorkItemSchema },
    async (request, reply) => {
      const { workspaceId, commitId } = request.params;
      try {
        const link = await gitService.linkCommitToWorkItem(
          commitId,
          request.body.workItemId,
          workspaceId,
        );
        return reply.code(201).send({ data: link });
      } catch (error) {
        return handleGitError(error, reply);
      }
    },
  );

  // 5. Link Commit to ADR
  app.post<{
    Params: { workspaceId: string; commitId: string };
    Body: { adrId: string };
  }>(
    "/commits/:commitId/link/adrs",
    { schema: linkCommitToAdrSchema },
    async (request, reply) => {
      const { workspaceId, commitId } = request.params;
      try {
        const link = await gitService.linkCommitToAdr(
          commitId,
          request.body.adrId,
          workspaceId,
        );
        return reply.code(201).send({ data: link });
      } catch (error) {
        return handleGitError(error, reply);
      }
    },
  );
};

import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, {
  LogController,
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";

import {
  authRoutes,
  type AuthenticationServiceContract,
} from "./modules/auth/routes/auth.routes.js";
import {
  InMemoryProjectRepository,
  type ProjectRepository,
} from "./modules/projects/project.repository.js";
import { projectRoutes } from "./modules/projects/project.routes.js";
import { readinessRoutes } from "./routes/readiness.routes.js";
import type { AccessTokenService } from "./modules/auth/security/jwt.service.js";
import { JwtAccessTokenService } from "./modules/auth/security/jwt.service.js";
import { authenticationPlugin } from "./modules/auth/plugins/authentication.plugin.js";
import { InMemoryWorkspaceRepository } from "./modules/workspaces/repositories/memory/in-memory-workspace.repository.js";
import type { WorkspaceRepository } from "./modules/workspaces/workspace.repository.js";
import { WorkspaceService } from "./modules/workspaces/services/workspace.service.js";
import { workspaceRoutes } from "./modules/workspaces/routes/workspace.routes.js";
import { InMemoryTeamRepository } from "./modules/workspaces/repositories/memory/in-memory-team.repository.js";
import type { TeamRepository } from "./modules/workspaces/repositories/team.repository.js";
import { InMemoryWorkflowRepository } from "./modules/work-management/repositories/memory/in-memory-workflow.repository.js";
import type { WorkflowRepository } from "./modules/work-management/repositories/workflow.repository.js";
import { InMemoryWorkItemRepository } from "./modules/work-management/repositories/memory/in-memory-work-item.repository.js";
import type { WorkItemRepository } from "./modules/work-management/repositories/work-item.repository.js";
import { InMemoryCommentRepository } from "./modules/work-management/repositories/memory/in-memory-comment.repository.js";
import type { CommentRepository } from "./modules/work-management/repositories/comment.repository.js";
import { InMemoryWorkItemHistoryRepository } from "./modules/work-management/repositories/memory/in-memory-work-item-history.repository.js";
import type { WorkItemHistoryRepository } from "./modules/work-management/repositories/work-item-history.repository.js";
import { WorkItemService } from "./modules/work-management/services/work-item.service.js";
import { workManagementRoutes } from "./modules/work-management/work-management.routes.js";
import { InMemoryRepositoryRepository } from "./modules/git/repositories/memory/in-memory-repository.repository.js";
import type { RepositoryRepository } from "./modules/git/repositories/repository.repository.js";
import { InMemoryCommitRepository } from "./modules/git/repositories/memory/in-memory-commit.repository.js";
import type { CommitRepository } from "./modules/git/repositories/commit.repository.js";
import { InMemoryGitLinkRepository } from "./modules/git/repositories/memory/in-memory-git-link.repository.js";
import type { GitLinkRepository } from "./modules/git/repositories/git-link.repository.js";
import { InMemoryArchitectureDecisionRepository } from "./modules/architecture/repositories/memory/in-memory-architecture.repository.js";
import type { ArchitectureDecisionRepository } from "./modules/architecture/repositories/architecture.repository.js";
import { GitService } from "./modules/git/services/git.service.js";
import { gitRoutes } from "./modules/git/routes/git.routes.js";
import { InMemoryTechnicalSpecificationRepository } from "./modules/architecture/repositories/memory/in-memory-spec.repository.js";
import type { TechnicalSpecificationRepository } from "./modules/architecture/repositories/spec.repository.js";
import { InMemoryArchitectureLinkRepository } from "./modules/architecture/repositories/memory/in-memory-architecture-link.repository.js";
import type { ArchitectureLinkRepository } from "./modules/architecture/repositories/architecture-link.repository.js";
import { ArchitectureService } from "./modules/architecture/services/architecture.service.js";
import { architectureRoutes } from "./modules/architecture/routes/architecture.routes.js";

export const API_BODY_LIMIT_BYTES = 16 * 1024;

const DEFAULT_JWT_SECRET =
  "devforge-default-development-jwt-signing-secret-key-32bytes";

function isValidationError(
  error: unknown,
): error is {
  validation: unknown;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "validation" in error
  );
}

function isHttpError(
  error: unknown,
): error is {
  statusCode: number;
  code?: string;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  );
}

export interface BuildAppOptions {
  serverOptions?: FastifyServerOptions;
  projectRepository?: ProjectRepository;
  workspaceRepository?: WorkspaceRepository;
  workspaceService?: WorkspaceService;
  teamRepository?: TeamRepository;
  workflowRepository?: WorkflowRepository;
  workItemRepository?: WorkItemRepository;
  commentRepository?: CommentRepository;
  workItemHistoryRepository?: WorkItemHistoryRepository;
  workItemService?: WorkItemService;
  authenticationService?:
    AuthenticationServiceContract;
  accessTokenService?: AccessTokenService;
  gitService?: GitService;
  repositoryRepository?: RepositoryRepository;
  commitRepository?: CommitRepository;
  gitLinkRepository?: GitLinkRepository;
  adrRepository?: ArchitectureDecisionRepository;
  specRepository?: TechnicalSpecificationRepository;
  architectureLinkRepository?: ArchitectureLinkRepository;
  architectureService?: ArchitectureService;
}

export function buildApp(
  options: BuildAppOptions = {},
): FastifyInstance {
  const app = Fastify({
    logger: true,
    logController: new LogController({
      disableRequestLogging: true,
    }),
    bodyLimit: API_BODY_LIMIT_BYTES,
    ajv: {
      customOptions: {
        removeAdditional: false,
      },
    },
    ...options.serverOptions,
  });

  const accessTokenService =
    options.accessTokenService ??
    new JwtAccessTokenService({
      secret: DEFAULT_JWT_SECRET,
      issuer: "devforge",
      audience: "devforge-api",
      expiresInSeconds: 900,
    });

  void app.register(authenticationPlugin, {
    accessTokens: accessTokenService,
  });

  const projectRepository =
    options.projectRepository ??
    new InMemoryProjectRepository();

  const workspaceRepository =
    options.workspaceRepository ??
    new InMemoryWorkspaceRepository();

  const workspaceService =
    options.workspaceService ??
    new WorkspaceService(workspaceRepository);

  const teamRepository =
    options.teamRepository ?? new InMemoryTeamRepository();

  const workflowRepository =
    options.workflowRepository ?? new InMemoryWorkflowRepository();

  const workItemRepository =
    options.workItemRepository ?? new InMemoryWorkItemRepository();

  const commentRepository =
    options.commentRepository ?? new InMemoryCommentRepository();

  const workItemHistoryRepository =
    options.workItemHistoryRepository ?? new InMemoryWorkItemHistoryRepository();

  const workItemService =
    options.workItemService ??
    new WorkItemService(
      workItemRepository,
      workflowRepository,
      workspaceRepository,
      projectRepository,
      teamRepository,
      commentRepository,
      workItemHistoryRepository,
    );

  const gitRepositoryRepository =
    options.repositoryRepository ?? new InMemoryRepositoryRepository();

  const commitRepository =
    options.commitRepository ?? new InMemoryCommitRepository();

  const gitLinkRepository =
    options.gitLinkRepository ?? new InMemoryGitLinkRepository();

  const adrRepository =
    options.adrRepository ?? new InMemoryArchitectureDecisionRepository();

  const specRepository =
    options.specRepository ?? new InMemoryTechnicalSpecificationRepository();

  const architectureLinkRepository =
    options.architectureLinkRepository ?? new InMemoryArchitectureLinkRepository();

  const architectureService =
    options.architectureService ??
    new ArchitectureService(
      adrRepository,
      specRepository,
      architectureLinkRepository,
      workspaceRepository,
      projectRepository,
      workItemRepository,
    );

  const gitService =
    options.gitService ??
    new GitService(
      gitRepositoryRepository,
      commitRepository,
      gitLinkRepository,
      workItemRepository,
      adrRepository,
    );

  void app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "DevForge API",
        description:
          "Backend API for the DevForge developer operating system.",
        version: "0.1.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Enter your DevForge JWT access token.",
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
      tags: [
        {
          name: "System",
          description:
            "API health and readiness endpoints.",
        },
        {
          name: "Authentication",
          description:
            "User registration and authentication endpoints.",
        },
        {
          name: "Workspaces",
          description:
            "DevForge organization & multi-tenant workspace management endpoints.",
        },
        {
          name: "Projects",
          description:
            "DevForge project management endpoints.",
        },
        {
          name: "Work Management",
          description:
            "DevForge work items, hierarchy, state transitions, workflows, and comments endpoints.",
        },
      ],
    },
  });

  void app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  void app.register(helmet);

  app.addHook(
    "onResponse",
    async (request, reply) => {
      request.log.info(
        {
          requestId: request.id,
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          durationMs: reply.elapsedTime,
        },
        "Request completed",
      );
    },
  );

  app.setErrorHandler(
    (error, request, reply) => {
      request.log.error(
        {
          err: error,
          requestId: request.id,
          method: request.method,
          url: request.url,
        },
        "Request error",
      );

      if (isValidationError(error)) {
        return reply.code(400).send({
          error: "VALIDATION_ERROR",
          message:
            "Request validation failed.",
          requestId: request.id,
        });
      }

      if (
        isHttpError(error) &&
        error.statusCode === 413
      ) {
        return reply.code(413).send({
          error: "PAYLOAD_TOO_LARGE",
          message:
            "Request payload exceeds the allowed size.",
          requestId: request.id,
        });
      }

      if (
        isHttpError(error) &&
        error.statusCode === 429
      ) {
        return reply.code(429).send({
          error: "RATE_LIMIT_EXCEEDED",
          message:
            "Too many requests. Please try again later.",
          requestId: request.id,
        });
      }

      return reply.code(500).send({
        error: "INTERNAL_SERVER_ERROR",
        message:
          "An unexpected error occurred.",
        requestId: request.id,
      });
    },
  );

  void app.register(
    async function applicationRoutes(
      application,
    ) {
      await application.register(
        rateLimit,
        {
          global: true,
          max: 100,
          timeWindow: "1 minute",
          keyGenerator: (request) =>
            request.ip,
        },
      );

      application.get(
        "/health",
        {
          schema: {
            tags: ["System"],
            summary: "Check API health",
            description:
              "Confirms that the DevForge API process is running.",
          },
        },
        async () => ({
          status: "ok",
          service: "devforge-api",
          timestamp:
            new Date().toISOString(),
        }),
      );

      await application.register(
        readinessRoutes,
      );

      if (options.authenticationService) {
        await application.register(
          authRoutes,
          {
            prefix: "/api/auth",
            authenticationService:
              options.authenticationService,
          },
        );
      }

      await application.register(
        workspaceRoutes,
        {
          prefix: "/api/workspaces",
          service: workspaceService,
        },
      );

      await application.register(
        projectRoutes,
        {
          prefix: "/api/workspaces/:workspaceId/projects",
          repository: projectRepository,
          workspaceService,
        },
      );

      await application.register(
        workManagementRoutes,
        {
          prefix: "/api/workspaces/:workspaceId",
          workspaceService,
          workItemService,
          workflowRepository,
          workItemRepository,
          commentRepository,
          workItemHistoryRepository,
        },
      );

      await application.register(
        gitRoutes,
        {
          prefix: "/api/workspaces/:workspaceId",
          workspaceService,
          gitService,
        },
      );

      await application.register(
        architectureRoutes,
        {
          prefix: "/api/workspaces/:workspaceId",
          workspaceService,
          architectureService,
        },
      );
    },
  );

  return app;
}
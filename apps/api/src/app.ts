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
import { authenticationPlugin } from "./modules/auth/plugins/authentication.plugin.js";

export const API_BODY_LIMIT_BYTES = 16 * 1024;

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
  authenticationService?:
    AuthenticationServiceContract;
  accessTokenService?: AccessTokenService;
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

  if (options.accessTokenService) {
  void app.register(
    authenticationPlugin,
    {
      accessTokens:
        options.accessTokenService,
    },
  );
}

  const projectRepository =
    options.projectRepository ??
    new InMemoryProjectRepository();

  void app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "DevForge API",
        description:
          "Backend API for the DevForge developer operating system.",
        version: "0.1.0",
      },
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
          name: "Projects",
          description:
            "DevForge project management endpoints.",
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
        projectRoutes,
        {
          prefix: "/api/projects",
          repository:
            projectRepository,
        },
      );
    },
  );

  return app;
}
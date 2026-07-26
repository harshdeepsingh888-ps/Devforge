import helmet from "@fastify/helmet";

import Fastify, {
  LogController,
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";

import {
  InMemoryProjectRepository,
  type ProjectRepository,
} from "./modules/projects/project.repository.js";
import { projectRoutes } from "./modules/projects/project.routes.js";

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

  void app.register(helmet);

  const projectRepository =
    options.projectRepository ??
    new InMemoryProjectRepository();

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "devforge-api",
      timestamp: new Date().toISOString(),
    };
  });
  app.addHook("onResponse", async (request, reply) => {
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
});

  app.setErrorHandler((error, request, reply) => {
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
        message: "Request validation failed.",
        requestId: request.id,
      });
    }

    if (isHttpError(error) && error.statusCode === 413) {
      return reply.code(413).send({
        error: "PAYLOAD_TOO_LARGE",
        message: "Request payload exceeds the allowed size.",
        requestId: request.id,
      });
    }

    return reply.code(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
      requestId: request.id,
    });
  });

  void app.register(projectRoutes, {
    prefix: "/api/projects",
    repository: projectRepository,
  });

  return app;
}
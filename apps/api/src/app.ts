import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";

import {
  InMemoryProjectRepository,
  type ProjectRepository,
} from "./modules/projects/project.repository.js";
import { projectRoutes } from "./modules/projects/project.routes.js";

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

export interface BuildAppOptions {
  serverOptions?: FastifyServerOptions;
  projectRepository?: ProjectRepository;
}

export function buildApp(
  options: BuildAppOptions = {},
): FastifyInstance {
  const app = Fastify({
    logger: true,
    ajv: {
      customOptions: {
        removeAdditional: false,
      },
    },
    ...options.serverOptions,
  });

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

  app.setErrorHandler((error, request, reply) => {
    request.log.error(
      {
        err: error,
        requestId: request.id,
        method: request.method,
        url: request.url,
      },
      "Unhandled request error",
    );

    if (isValidationError(error)) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "Request validation failed.",
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
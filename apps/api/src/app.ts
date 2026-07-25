import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";

import {
  InMemoryProjectRepository,
  type ProjectRepository,
} from "./modules/projects/project.repository.js";
import { projectRoutes } from "./modules/projects/project.routes.js";

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

  void app.register(projectRoutes, {
    prefix: "/api/projects",
    repository: projectRepository,
  });

  return app;
}

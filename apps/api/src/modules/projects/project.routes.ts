import type { FastifyPluginAsync } from "fastify";

import type { ProjectRepository } from "./project.repository.js";

interface ProjectRoutesOptions {
  repository: ProjectRepository;
}

interface CreateProjectBody {
  name: string;
  description?: string;
}

export const projectRoutes: FastifyPluginAsync<
  ProjectRoutesOptions
> = async (app, options) => {
  app.get("/", async () => {
    const projects = await options.repository.findAll();

    return {
      data: projects,
    };
  });
  app.get<{
  Params: {
    projectId: string;
  };
}>("/:projectId", async (request, reply) => {
  const project = await options.repository.findById(
    request.params.projectId,
  );

  if (!project) {
    return reply.code(404).send({
      error: "PROJECT_NOT_FOUND",
      message: "Project not found.",
    });
  }

  return {
    data: project,
  };
});

  app.post<{
    Body: CreateProjectBody;
  }>(
    "/",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["name"],
          properties: {
            name: {
              type: "string",
              minLength: 1,
              maxLength: 100,
            },
            description: {
              type: "string",
              maxLength: 500,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const name = request.body.name.trim();
      const description = request.body.description?.trim();

      if (name.length === 0) {
        return reply.code(400).send({
          error: "VALIDATION_ERROR",
          message: "Project name cannot be empty.",
        });
      }

      const project = await options.repository.create({
        name,
        ...(description !== undefined && {
          description,
        }),
      });

      return reply.code(201).send({
        data: project,
      });
    },
  );
};

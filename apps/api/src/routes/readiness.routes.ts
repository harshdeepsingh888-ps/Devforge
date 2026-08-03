import type { FastifyInstance } from "fastify";

export async function readinessRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get(
    "/ready",
    {
      schema: {
        tags: ["System"],
        summary: "Check API readiness",
        description:
          "Confirms that the DevForge API is ready to accept traffic.",
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: ["status"],
            properties: {
              status: {
                type: "string",
                const: "ready",
              },
            },
          },
        },
      },
    },
    async () => {
      return {
        status: "ready",
      };
    },
  );
}
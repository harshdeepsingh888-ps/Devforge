import type { FastifyInstance } from "fastify";

export async function readinessRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/ready", async () => {
    return {
      status: "ready",
    };
  });
}
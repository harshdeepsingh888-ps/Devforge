import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";

export function buildApp(
  options: FastifyServerOptions = {},
): FastifyInstance {
  const app = Fastify({
    logger: true,
    ...options,
  });

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "devforge-api",
      timestamp: new Date().toISOString(),
    };
  });

  return app;
}

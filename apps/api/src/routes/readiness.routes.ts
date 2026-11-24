import type { FastifyPluginAsync } from "fastify";

const DEFAULT_TIMEOUT_MS = 2_000;

export interface ReadinessRoutesOptions {
  /**
   * Resolves when the database answers and rejects when it does not.
   *
   * Production must pass this (server.ts does). Without it /ready can only say
   * the process is up, which is all a bare test app needs. CI starts the real
   * built server with an unreachable database and requires /ready to answer
   * 503, so forgetting to wire it in fails the build rather than lying to a
   * deploy gate.
   */
  checkDatabase?: (() => Promise<void>) | undefined;

  /** How long to wait for the database before answering 503. */
  timeoutMs?: number | undefined;
}

/**
 * Races the check against a timeout. The timer is cleared in both outcomes so
 * a fast success does not keep the process alive for the full timeout.
 */
async function runWithTimeout(
  check: () => Promise<void>,
  timeoutMs: number,
): Promise<void> {
  let timer: NodeJS.Timeout | undefined;

  try {
    await Promise.race([
      check(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Readiness check timed out.")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export const readinessRoutes: FastifyPluginAsync<
  ReadinessRoutesOptions
> = async (app, options) => {
  const { checkDatabase, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  app.get(
    "/ready",
    {
      schema: {
        tags: ["System"],
        summary: "Check API readiness",
        description:
          "Reports whether the API can serve traffic, which includes reaching the database. Answers 503 when it cannot. /health is the liveness probe and never touches the database.",
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
          503: {
            type: "object",
            additionalProperties: false,
            required: ["status"],
            properties: {
              status: {
                type: "string",
                const: "unavailable",
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!checkDatabase) {
        return { status: "ready" };
      }

      try {
        await runWithTimeout(checkDatabase, timeoutMs);
        return { status: "ready" };
      } catch (error) {
        // The reason stays in the server log only. Driver errors can name the
        // database host and port, which a public probe must not reveal.
        request.log.error({ err: error }, "Readiness check failed");

        return reply.code(503).send({ status: "unavailable" });
      }
    },
  );
};

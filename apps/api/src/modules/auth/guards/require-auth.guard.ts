import type { FastifyRequest, FastifyReply } from "fastify";

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!request.auth) {
    return reply.code(401).send({
      error: "UNAUTHORIZED",
      message: "Authentication required to access this resource.",
      requestId: request.id,
    });
  }
}

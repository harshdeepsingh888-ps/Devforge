import type {
  FastifyReply,
  FastifyRequest,
} from "fastify";

export async function requireAuthentication(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (request.auth) {
    return;
  }

  await reply.code(401).send({
    error: "UNAUTHORIZED",
    message: "Authentication is required.",
    requestId: request.id,
  });
}
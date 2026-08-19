import type { FastifyReply } from "fastify";
import {
  AdrNotFoundError,
  ArchitectureDecisionImmutableError,
  ArchitectureError,
  ArchitecturePermissionDeniedError,
  ArchitectureProjectMismatchError,
  ArchitectureTenantMismatchError,
  DuplicateArchitectureLinkError,
  SpecNotFoundError,
  TechnicalSpecificationImmutableError,
} from "./architecture.errors.js";

export function handleArchitectureError(error: unknown, reply: FastifyReply) {
  if (
    error instanceof AdrNotFoundError ||
    error instanceof SpecNotFoundError ||
    error instanceof ArchitectureTenantMismatchError
  ) {
    return reply.code(404).send({
      message: error.message,
      error: "Not Found",
      statusCode: 404,
    });
  }

  if (error instanceof ArchitecturePermissionDeniedError) {
    return reply.code(403).send({
      message: error.message,
      error: "Forbidden",
      statusCode: 403,
    });
  }

  if (
    error instanceof ArchitectureDecisionImmutableError ||
    error instanceof TechnicalSpecificationImmutableError ||
    error instanceof DuplicateArchitectureLinkError ||
    error instanceof ArchitectureProjectMismatchError
  ) {
    return reply.code(409).send({
      message: error.message,
      error: "Conflict",
      statusCode: 409,
    });
  }

  if (error instanceof ArchitectureError) {
    return reply.code(400).send({
      message: error.message,
      error: "Bad Request",
      statusCode: 400,
    });
  }

  throw error;
}

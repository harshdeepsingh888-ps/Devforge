import type { FastifyReply } from "fastify";
import {
  CommitNotFoundError,
  DuplicateCommitError,
  DuplicateCommitLinkError,
  GitError,
  GitTenantMismatchError,
  RepositoryNotFoundError,
} from "./git.errors.js";

export function handleGitError(error: unknown, reply: FastifyReply) {
  if (
    error instanceof CommitNotFoundError ||
    error instanceof RepositoryNotFoundError ||
    error instanceof GitTenantMismatchError
  ) {
    return reply.code(404).send({
      message: error.message,
      error: "Not Found",
      statusCode: 404,
    });
  }

  if (
    error instanceof DuplicateCommitError ||
    error instanceof DuplicateCommitLinkError
  ) {
    return reply.code(409).send({
      message: error.message,
      error: "Conflict",
      statusCode: 409,
    });
  }

  if (error instanceof GitError) {
    return reply.code(400).send({
      message: error.message,
      error: "Bad Request",
      statusCode: 400,
    });
  }

  throw error;
}

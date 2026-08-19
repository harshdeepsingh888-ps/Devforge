import type { FastifyReply } from "fastify";
import {
  CicdError,
  CicdTenantMismatchError,
  DuplicatePipelineError,
  DuplicatePipelineRunError,
  PipelineNotFoundError,
  PipelineRunNotFoundError,
  PipelineRunNotSuccessfulError,
} from "./cicd.errors.js";

export function handleCicdError(error: unknown, reply: FastifyReply) {
  if (
    error instanceof PipelineNotFoundError ||
    error instanceof PipelineRunNotFoundError ||
    error instanceof CicdTenantMismatchError
  ) {
    return reply.code(404).send({
      message: error.message,
      error: "Not Found",
      statusCode: 404,
    });
  }

  if (
    error instanceof DuplicatePipelineError ||
    error instanceof DuplicatePipelineRunError ||
    error instanceof PipelineRunNotSuccessfulError
  ) {
    return reply.code(409).send({
      message: error.message,
      error: "Conflict",
      statusCode: 409,
    });
  }

  if (error instanceof CicdError) {
    return reply.code(400).send({
      message: error.message,
      error: "Bad Request",
      statusCode: 400,
    });
  }

  throw error;
}

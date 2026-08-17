import type { FastifyReply } from "fastify";
import {
  WorkItemTitleRequiredError,
  WorkItemTypeInvalidError,
  WorkItemHierarchyInvalidError,
  WorkItemHierarchyCycleError,
  WorkItemTenantMismatchError,
  InvalidStateTransitionError,
  WorkflowNotFoundError,
  WorkflowStateNotFoundError,
  WorkflowMultipleInitialStatesError,
  WorkflowStateDuplicatePositionError,
  DuplicateStateTransitionError,
  WorkItemNotFoundError,
  CommentNotFoundError,
} from "./work-management.errors.js";
import {
  WorkspaceNotFoundError,
  WorkspacePermissionDeniedError,
} from "../workspaces/workspace.errors.js";

export function handleWorkManagementError(error: unknown, reply: FastifyReply) {
  if (error instanceof WorkspaceNotFoundError || error instanceof WorkItemNotFoundError) {
    return reply.code(404).send({
      error: error.code ?? "NOT_FOUND",
      message: error.message,
    });
  }

  if (error instanceof WorkflowNotFoundError || error instanceof WorkflowStateNotFoundError) {
    return reply.code(404).send({
      error: error.code,
      message: error.message,
    });
  }

  if (error instanceof CommentNotFoundError) {
    return reply.code(404).send({
      error: error.code,
      message: error.message,
    });
  }

  if (error instanceof WorkspacePermissionDeniedError) {
    return reply.code(403).send({
      error: "FORBIDDEN",
      message: error.message,
    });
  }

  if (
    error instanceof WorkItemTitleRequiredError ||
    error instanceof WorkItemTypeInvalidError ||
    error instanceof WorkItemHierarchyInvalidError ||
    error instanceof WorkItemHierarchyCycleError ||
    error instanceof WorkItemTenantMismatchError ||
    error instanceof InvalidStateTransitionError ||
    error instanceof WorkflowMultipleInitialStatesError ||
    error instanceof WorkflowStateDuplicatePositionError ||
    error instanceof DuplicateStateTransitionError
  ) {
    return reply.code(400).send({
      error: error.code,
      message: error.message,
    });
  }

  throw error; // Re-throw unhandled internal errors for Fastify global error handler
}

import type { FastifyPluginAsync } from "fastify";
import type { WorkspaceService } from "../workspaces/services/workspace.service.js";
import type { WorkItemService } from "./services/work-item.service.js";
import type { WorkflowRepository } from "./repositories/workflow.repository.js";
import type { WorkItemRepository } from "./repositories/work-item.repository.js";
import type { CommentRepository } from "./repositories/comment.repository.js";
import type { WorkItemHistoryRepository } from "./repositories/work-item-history.repository.js";
import {
  createWorkspaceTenantGuard,
  requireWorkspaceRole,
} from "../workspaces/plugins/workspace-tenant.plugin.js";
import { handleWorkManagementError } from "./work-management.error-mapper.js";
import {
  createWorkItemSchema,
  listWorkItemsSchema,
  getWorkItemSchema,
  updateWorkItemSchema,
  transitionWorkItemSchema,
  getChildrenSchema,
  getWorkItemHistorySchema,
  createWorkflowSchema,
  listWorkflowsSchema,
  getWorkflowSchema,
  createCommentSchema,
  listCommentsSchema,
  updateCommentSchema,
  deleteCommentSchema,
} from "./work-management.schemas.js";
import type {
  WorkItemPriority,
  WorkItemType,
} from "./work-management.types.js";
import { CommentNotFoundError, WorkItemNotFoundError } from "./work-management.errors.js";

export interface WorkManagementRoutesOptions {
  workspaceService: WorkspaceService;
  workItemService: WorkItemService;
  workflowRepository: WorkflowRepository;
  workItemRepository: WorkItemRepository;
  commentRepository: CommentRepository;
  workItemHistoryRepository: WorkItemHistoryRepository;
}

export const workManagementRoutes: FastifyPluginAsync<
  WorkManagementRoutesOptions
> = async (app, options) => {
  const {
    workspaceService,
    workItemService,
    workflowRepository,
    workItemRepository,
    commentRepository,
    workItemHistoryRepository,
  } = options;

  const requireWorkspaceMember = createWorkspaceTenantGuard(workspaceService);

  app.addHook("preHandler", requireWorkspaceMember);

  // --------------------------------------------------------------------------
  // WORK ITEM ENDPOINTS
  // --------------------------------------------------------------------------

  // CREATE WORK ITEM
  app.post<{
    Params: { workspaceId: string; projectId: string };
    Body: {
      type: WorkItemType;
      title: string;
      description?: string | null;
      parentId?: string | null;
      workflowId?: string | null;
      assigneeUserId?: string | null;
      teamId?: string | null;
      priority?: WorkItemPriority;
      storyPoints?: number | null;
    };
  }>(
    "/projects/:projectId/work-items",
    {
      preHandler: [requireWorkspaceRole("DEVELOPER")],
      schema: createWorkItemSchema,
    },
    async (request, reply) => {
      const actorUserId = request.auth!.userId;
      try {
        const item = await workItemService.createWorkItem({
          workspaceId: request.params.workspaceId,
          projectId: request.params.projectId,
          actorUserId,
          type: request.body.type,
          title: request.body.title,
          description: request.body.description,
          parentId: request.body.parentId,
          workflowId: request.body.workflowId ?? undefined,
          assigneeUserId: request.body.assigneeUserId,
          teamId: request.body.teamId,
          priority: request.body.priority,
          storyPoints: request.body.storyPoints,
        });

        return reply.code(201).send({ data: item });
      } catch (error) {
        return handleWorkManagementError(error, reply);
      }
    },
  );

  // LIST WORK ITEMS (FILTERING & PAGINATION)
  app.get<{
    Params: { workspaceId: string; projectId: string };
    Querystring: {
      type?: WorkItemType;
      workflowStateId?: string;
      assigneeUserId?: string;
      teamId?: string;
      priority?: WorkItemPriority;
      parentId?: string;
      page?: number;
      limit?: number;
      orderBy?: "createdAt" | "updatedAt";
      order?: "asc" | "desc";
    };
  }>(
    "/projects/:projectId/work-items",
    {
      preHandler: [requireWorkspaceRole("VIEWER")],
      schema: listWorkItemsSchema,
    },
    async (request, reply) => {
      try {
        const { workspaceId, projectId } = request.params;
        const allItems = await workItemRepository.findByWorkspace(
          workspaceId,
          projectId,
        );

        const {
          type,
          workflowStateId,
          assigneeUserId,
          teamId,
          priority,
          parentId,
          page = 1,
          limit = 20,
          orderBy = "createdAt",
          order = "desc",
        } = request.query;

        let filtered = allItems;
        if (type) filtered = filtered.filter((i) => i.type === type);
        if (workflowStateId)
          filtered = filtered.filter((i) => i.workflowStateId === workflowStateId);
        if (assigneeUserId)
          filtered = filtered.filter((i) => i.assigneeUserId === assigneeUserId);
        if (teamId) filtered = filtered.filter((i) => i.teamId === teamId);
        if (priority) filtered = filtered.filter((i) => i.priority === priority);
        if (parentId) filtered = filtered.filter((i) => i.parentId === parentId);

        filtered.sort((a, b) => {
          const valA = Date.parse(a[orderBy]);
          const valB = Date.parse(b[orderBy]);
          return order === "asc" ? valA - valB : valB - valA;
        });

        const total = filtered.length;
        const startIndex = (page - 1) * limit;
        const paginated = filtered.slice(startIndex, startIndex + limit);

        return reply.code(200).send({
          data: paginated,
          meta: { page, limit, total },
        });
      } catch (error) {
        return handleWorkManagementError(error, reply);
      }
    },
  );

  // GET SINGLE WORK ITEM
  app.get<{
    Params: { workspaceId: string; workItemId: string };
  }>(
    "/work-items/:workItemId",
    {
      preHandler: [requireWorkspaceRole("VIEWER")],
      schema: getWorkItemSchema,
    },
    async (request, reply) => {
      try {
        const item = await workItemRepository.findById(
          request.params.workspaceId,
          request.params.workItemId,
        );

        if (!item) {
          throw new WorkItemNotFoundError();
        }

        return reply.code(200).send({ data: item });
      } catch (error) {
        return handleWorkManagementError(error, reply);
      }
    },
  );

  // UPDATE WORK ITEM
  app.patch<{
    Params: { workspaceId: string; workItemId: string };
    Body: {
      title?: string;
      description?: string | null;
      priority?: WorkItemPriority;
      storyPoints?: number | null;
      assigneeUserId?: string | null;
      teamId?: string | null;
      parentId?: string | null;
    };
  }>(
    "/work-items/:workItemId",
    {
      preHandler: [requireWorkspaceRole("DEVELOPER")],
      schema: updateWorkItemSchema,
    },
    async (request, reply) => {
      try {
        const { workspaceId, workItemId } = request.params;
        const existing = await workItemRepository.findById(workspaceId, workItemId);
        if (!existing) {
          throw new WorkItemNotFoundError();
        }

        const updates: Partial<typeof existing> = {};
        if (request.body.title !== undefined) updates.title = request.body.title;
        if (request.body.description !== undefined)
          updates.description = request.body.description;
        if (request.body.priority !== undefined)
          updates.priority = request.body.priority;
        if (request.body.storyPoints !== undefined)
          updates.storyPoints = request.body.storyPoints;
        if (request.body.assigneeUserId !== undefined)
          updates.assigneeUserId = request.body.assigneeUserId;
        if (request.body.teamId !== undefined) updates.teamId = request.body.teamId;
        if (request.body.parentId !== undefined) updates.parentId = request.body.parentId;

        const updated = await workItemRepository.update(
          workspaceId,
          workItemId,
          updates,
        );

        return reply.code(200).send({ data: updated });
      } catch (error) {
        return handleWorkManagementError(error, reply);
      }
    },
  );

  // GET CHILDREN OF WORK ITEM
  app.get<{
    Params: { workspaceId: string; workItemId: string };
  }>(
    "/work-items/:workItemId/children",
    {
      preHandler: [requireWorkspaceRole("VIEWER")],
      schema: getChildrenSchema,
    },
    async (request, reply) => {
      try {
        const parent = await workItemRepository.findById(
          request.params.workspaceId,
          request.params.workItemId,
        );
        if (!parent) {
          throw new WorkItemNotFoundError();
        }

        const children = await workItemRepository.findChildren(
          request.params.workspaceId,
          request.params.workItemId,
        );

        return reply.code(200).send({ data: children });
      } catch (error) {
        return handleWorkManagementError(error, reply);
      }
    },
  );

  // GET HISTORY OF WORK ITEM
  app.get<{
    Params: { workspaceId: string; workItemId: string };
  }>(
    "/work-items/:workItemId/history",
    {
      preHandler: [requireWorkspaceRole("VIEWER")],
      schema: getWorkItemHistorySchema,
    },
    async (request, reply) => {
      try {
        const item = await workItemRepository.findById(
          request.params.workspaceId,
          request.params.workItemId,
        );
        if (!item) {
          throw new WorkItemNotFoundError();
        }

        const history = await workItemHistoryRepository.findByWorkItem(
          request.params.workspaceId,
          request.params.workItemId,
        );

        return reply.code(200).send({ data: history });
      } catch (error) {
        return handleWorkManagementError(error, reply);
      }
    },
  );

  // TRANSITION WORK ITEM STATE
  app.post<{
    Params: { workspaceId: string; workItemId: string };
    Body: { targetStateId: string };
  }>(
    "/work-items/:workItemId/transition",
    {
      preHandler: [requireWorkspaceRole("DEVELOPER")],
      schema: transitionWorkItemSchema,
    },
    async (request, reply) => {
      const actorUserId = request.auth!.userId;
      try {
        const transitioned = await workItemService.transitionState({
          workspaceId: request.params.workspaceId,
          workItemId: request.params.workItemId,
          actorUserId,
          targetStateId: request.body.targetStateId,
        });

        return reply.code(200).send({ data: transitioned });
      } catch (error) {
        return handleWorkManagementError(error, reply);
      }
    },
  );

  // --------------------------------------------------------------------------
  // WORKFLOW ENDPOINTS
  // --------------------------------------------------------------------------

  // CREATE WORKFLOW (ADMIN+)
  app.post<{
    Params: { workspaceId: string };
    Body: { name: string; projectId?: string | null; isDefault?: boolean };
  }>(
    "/workflows",
    {
      preHandler: [requireWorkspaceRole("ADMIN")],
      schema: createWorkflowSchema,
    },
    async (request, reply) => {
      try {
        const workflow = await workflowRepository.createWorkflow({
          workspaceId: request.params.workspaceId,
          name: request.body.name,
          projectId: request.body.projectId,
          isDefault: request.body.isDefault,
        });

        return reply.code(201).send({ data: workflow });
      } catch (error) {
        return handleWorkManagementError(error, reply);
      }
    },
  );

  // LIST WORKFLOWS (VIEWER+)
  app.get<{
    Params: { workspaceId: string };
  }>(
    "/workflows",
    {
      preHandler: [requireWorkspaceRole("VIEWER")],
      schema: listWorkflowsSchema,
    },
    async (request, reply) => {
      try {
        const workflows = await workflowRepository.findWorkflowsByWorkspace(
          request.params.workspaceId,
        );

        return reply.code(200).send({ data: workflows });
      } catch (error) {
        return handleWorkManagementError(error, reply);
      }
    },
  );

  // GET WORKFLOW DETAIL (VIEWER+)
  app.get<{
    Params: { workspaceId: string; workflowId: string };
  }>(
    "/workflows/:workflowId",
    {
      preHandler: [requireWorkspaceRole("VIEWER")],
      schema: getWorkflowSchema,
    },
    async (request, reply) => {
      try {
        const workflow = await workflowRepository.findWorkflowById(
          request.params.workspaceId,
          request.params.workflowId,
        );

        if (!workflow) {
          throw new WorkItemNotFoundError(); // Triggers 404
        }

        const states = await workflowRepository.findStatesByWorkflow(
          workflow.id,
        );
        const transitions = await workflowRepository.findTransitionsByWorkflow(
          workflow.id,
        );

        return reply.code(200).send({
          data: {
            workflow,
            states,
            transitions,
          },
        });
      } catch (error) {
        return handleWorkManagementError(error, reply);
      }
    },
  );

  // --------------------------------------------------------------------------
  // COMMENTS ENDPOINTS
  // --------------------------------------------------------------------------

  // ADD COMMENT (DEVELOPER+)
  app.post<{
    Params: { workspaceId: string; workItemId: string };
    Body: { content: string };
  }>(
    "/work-items/:workItemId/comments",
    {
      preHandler: [requireWorkspaceRole("DEVELOPER")],
      schema: createCommentSchema,
    },
    async (request, reply) => {
      const actorUserId = request.auth!.userId;
      try {
        const comment = await workItemService.addComment({
          workspaceId: request.params.workspaceId,
          workItemId: request.params.workItemId,
          actorUserId,
          content: request.body.content,
        });

        return reply.code(201).send({ data: comment });
      } catch (error) {
        return handleWorkManagementError(error, reply);
      }
    },
  );

  // LIST COMMENTS (VIEWER+)
  app.get<{
    Params: { workspaceId: string; workItemId: string };
  }>(
    "/work-items/:workItemId/comments",
    {
      preHandler: [requireWorkspaceRole("VIEWER")],
      schema: listCommentsSchema,
    },
    async (request, reply) => {
      try {
        const item = await workItemRepository.findById(
          request.params.workspaceId,
          request.params.workItemId,
        );
        if (!item) {
          throw new WorkItemNotFoundError();
        }

        const comments = await commentRepository.findByWorkItem(
          request.params.workspaceId,
          request.params.workItemId,
        );

        return reply.code(200).send({ data: comments });
      } catch (error) {
        return handleWorkManagementError(error, reply);
      }
    },
  );

  // UPDATE COMMENT (DEVELOPER+ / AUTHOR ONLY)
  app.patch<{
    Params: { workspaceId: string; commentId: string };
    Body: { content: string };
  }>(
    "/comments/:commentId",
    {
      preHandler: [requireWorkspaceRole("DEVELOPER")],
      schema: updateCommentSchema,
    },
    async (request, reply) => {
      const actorUserId = request.auth!.userId;
      try {
        const comment = await commentRepository.findById(
          request.params.workspaceId,
          request.params.commentId,
        );

        if (!comment) {
          throw new CommentNotFoundError();
        }

        if (comment.authorUserId !== actorUserId) {
          return reply.code(403).send({
            error: "FORBIDDEN",
            message: "Only the comment author may edit this comment.",
          });
        }

        const updated = await commentRepository.update(
          request.params.workspaceId,
          request.params.commentId,
          request.body.content,
        );

        return reply.code(200).send({ data: updated });
      } catch (error) {
        return handleWorkManagementError(error, reply);
      }
    },
  );

  // DELETE COMMENT (AUTHOR / ADMIN / OWNER)
  app.delete<{
    Params: { workspaceId: string; commentId: string };
  }>(
    "/comments/:commentId",
    {
      preHandler: [requireWorkspaceRole("DEVELOPER")],
      schema: deleteCommentSchema,
    },
    async (request, reply) => {
      const actorUserId = request.auth!.userId;
      const userRole = request.workspaceContext!.membership.role;
      try {
        const comment = await commentRepository.findById(
          request.params.workspaceId,
          request.params.commentId,
        );

        if (!comment) {
          throw new CommentNotFoundError();
        }

        const isAuthor = comment.authorUserId === actorUserId;
        const isAdminOrOwner = userRole === "ADMIN" || userRole === "OWNER";

        if (!isAuthor && !isAdminOrOwner) {
          return reply.code(403).send({
            error: "FORBIDDEN",
            message: "Action requires author or workspace administrator role.",
          });
        }

        await commentRepository.delete(
          request.params.workspaceId,
          request.params.commentId,
        );

        return reply.code(204).send();
      } catch (error) {
        return handleWorkManagementError(error, reply);
      }
    },
  );
};

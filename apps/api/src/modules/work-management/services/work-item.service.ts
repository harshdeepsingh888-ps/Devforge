import type { WorkItemRepository } from "../repositories/work-item.repository.js";
import type { WorkflowRepository } from "../repositories/workflow.repository.js";
import type { CommentRepository } from "../repositories/comment.repository.js";
import type { WorkItemHistoryRepository } from "../repositories/work-item-history.repository.js";
import type { WorkspaceRepository } from "../../workspaces/workspace.repository.js";
import type { TeamRepository } from "../../workspaces/repositories/team.repository.ts";
import type { ProjectRepository } from "../../projects/project.repository.js";
import type {
  CreateCommentInput,
  CreateWorkItemInput,
  WorkItem,
  WorkItemPriority,
  WorkItemType,
} from "../work-management.types.js";
import {
  WorkItemTitleRequiredError,
  WorkItemTypeInvalidError,
  WorkItemHierarchyInvalidError,
  WorkItemHierarchyCycleError,
  WorkItemTenantMismatchError,
  InvalidStateTransitionError,
  WorkItemNotFoundError,
  WorkflowNotFoundError,
  WorkflowStateNotFoundError,
  CommentNotFoundError,
} from "../work-management.errors.js";
import {
  WorkspaceNotFoundError,
  WorkspacePermissionDeniedError,
} from "../../workspaces/workspace.errors.js";

export interface CreateWorkItemParams {
  workspaceId: string;
  projectId: string;
  actorUserId: string;
  type: WorkItemType;
  title: string;
  description?: string | null | undefined;
  parentId?: string | null | undefined;
  workflowId?: string | undefined;
  assigneeUserId?: string | null | undefined;
  teamId?: string | null | undefined;
  priority?: WorkItemPriority | undefined;
  storyPoints?: number | null | undefined;
}

export interface TransitionStateParams {
  workspaceId: string;
  workItemId: string;
  actorUserId: string;
  targetStateId: string;
}

export interface AddCommentParams {
  workspaceId: string;
  workItemId: string;
  actorUserId: string;
  content: string;
}

export class WorkItemService {
  constructor(
    private readonly workItemRepo: WorkItemRepository,
    private readonly workflowRepo: WorkflowRepository,
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly projectRepo: ProjectRepository,
    private readonly teamRepo?: TeamRepository | undefined,
    private readonly commentRepo?: CommentRepository | undefined,
    private readonly historyRepo?: WorkItemHistoryRepository | undefined,
  ) {}

  private async assertActorWorkspaceMember(
    workspaceId: string,
    actorUserId: string,
  ) {
    const membership = await this.workspaceRepo.findMembership(
      workspaceId,
      actorUserId,
    );
    if (!membership) {
      throw new WorkspaceNotFoundError();
    }
    return membership;
  }

  async createWorkItem(params: CreateWorkItemParams): Promise<WorkItem> {
    const actorMembership = await this.assertActorWorkspaceMember(
      params.workspaceId,
      params.actorUserId,
    );

    if (actorMembership.role === "VIEWER") {
      throw new WorkspacePermissionDeniedError(
        "Action requires DEVELOPER or higher role.",
      );
    }

    if (!params.title || params.title.trim().length === 0) {
      throw new WorkItemTitleRequiredError();
    }

    // Verify project belongs to workspace
    const project = await this.projectRepo.findById(
      params.workspaceId,
      params.projectId,
    );
    if (!project) {
      throw new WorkItemTenantMismatchError("Project not found in this workspace.");
    }

    // Determine workflow
    let workflowId = params.workflowId;
    if (!workflowId) {
      const defaultWorkflow = await this.workflowRepo.findDefaultWorkflow(
        params.workspaceId,
      );
      if (!defaultWorkflow) {
        throw new WorkflowNotFoundError();
      }
      workflowId = defaultWorkflow.id;
    } else {
      const workflow = await this.workflowRepo.findWorkflowById(
        params.workspaceId,
        workflowId,
      );
      if (!workflow) {
        throw new WorkflowNotFoundError();
      }
    }

    const initialState = await this.workflowRepo.findInitialState(workflowId);
    if (!initialState) {
      throw new WorkflowStateNotFoundError();
    }

    // Validate parent relationship & hierarchy invariants
    if (params.parentId) {
      await this.validateParentHierarchy({
        workspaceId: params.workspaceId,
        projectId: params.projectId,
        childType: params.type,
        parentId: params.parentId,
      });
    } else {
      if (params.type === "FEATURE") {
        throw new WorkItemHierarchyInvalidError("FEATURE must have an EPIC parent.");
      }
    }

    // Validate assignee membership if provided
    if (params.assigneeUserId) {
      const assigneeMembership = await this.workspaceRepo.findMembership(
        params.workspaceId,
        params.assigneeUserId,
      );
      if (!assigneeMembership) {
        throw new WorkItemTenantMismatchError(
          "Assignee user is not an active member of this workspace.",
        );
      }
    }

    // Validate team if provided
    if (params.teamId && this.teamRepo) {
      const team = await this.teamRepo.findById(params.workspaceId, params.teamId);
      if (!team) {
        throw new WorkItemTenantMismatchError("Team not found in this workspace.");
      }
    }

    const workItem = await this.workItemRepo.create({
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      type: params.type,
      title: params.title,
      description: params.description,
      parentId: params.parentId,
      workflowId,
      workflowStateId: initialState.id,
      assigneeUserId: params.assigneeUserId,
      teamId: params.teamId,
      reporterUserId: params.actorUserId,
      priority: params.priority ?? "MEDIUM",
      storyPoints: params.storyPoints,
    });

    if (this.historyRepo) {
      await this.historyRepo.create({
        workspaceId: params.workspaceId,
        workItemId: workItem.id,
        actorUserId: params.actorUserId,
        action: "CREATED",
        toStateId: initialState.id,
        toAssigneeUserId: workItem.assigneeUserId,
      });
    }

    return workItem;
  }

  private async validateParentHierarchy(params: {
    workspaceId: string;
    projectId: string;
    childType: WorkItemType;
    parentId: string;
    childId?: string | undefined;
  }) {
    const parent = await this.workItemRepo.findById(
      params.workspaceId,
      params.parentId,
    );

    if (!parent) {
      throw new WorkItemHierarchyInvalidError("Parent work item not found in workspace.");
    }

    if (parent.projectId !== params.projectId) {
      throw new WorkItemTenantMismatchError("Parent work item belongs to a different project.");
    }

    // Specific V2.1 Hierarchy Depth Rules:
    // EPIC: parentId MUST be null
    if (params.childType === "EPIC") {
      throw new WorkItemHierarchyInvalidError("EPIC cannot have a parent item.");
    }

    // FEATURE: parent MUST be EPIC
    if (params.childType === "FEATURE") {
      if (parent.type !== "EPIC") {
        throw new WorkItemHierarchyInvalidError("FEATURE parent must be an EPIC.");
      }
    }

    // TASK: parent MAY be EPIC or FEATURE. No TASK under TASK in V2.1
    if (params.childType === "TASK") {
      if (parent.type !== "EPIC" && parent.type !== "FEATURE") {
        throw new WorkItemHierarchyInvalidError(
          "TASK parent must be an EPIC or a FEATURE. Sub-tasks under TASK are not permitted.",
        );
      }
    }

    // BUG: parent MAY be EPIC or FEATURE. No BUG as parent.
    if (params.childType === "BUG") {
      if (parent.type !== "EPIC" && parent.type !== "FEATURE") {
        throw new WorkItemHierarchyInvalidError("BUG parent must be an EPIC or a FEATURE.");
      }
    }

    // Cycle Prevention Check
    if (params.childId) {
      if (params.parentId === params.childId) {
        throw new WorkItemHierarchyCycleError();
      }
      const ancestors = await this.workItemRepo.findAncestors(
        params.workspaceId,
        params.parentId,
      );
      if (ancestors.some((ancestor) => ancestor.id === params.childId)) {
        throw new WorkItemHierarchyCycleError();
      }
    }
  }

  async transitionState(params: TransitionStateParams): Promise<WorkItem> {
    const actorMembership = await this.assertActorWorkspaceMember(
      params.workspaceId,
      params.actorUserId,
    );

    const workItem = await this.workItemRepo.findById(
      params.workspaceId,
      params.workItemId,
    );
    if (!workItem) {
      throw new WorkItemNotFoundError();
    }

    const currentStateId = workItem.workflowStateId;
    if (currentStateId === params.targetStateId) {
      return workItem; // Already in target state
    }

    const transition = await this.workflowRepo.findTransition(
      workItem.workflowId,
      currentStateId,
      params.targetStateId,
    );

    if (!transition) {
      throw new InvalidStateTransitionError(currentStateId, params.targetStateId);
    }

    if (transition.requiredRole) {
      const hierarchy: Record<string, number> = {
        OWNER: 4,
        ADMIN: 3,
        DEVELOPER: 2,
        VIEWER: 1,
      };
      if ((hierarchy[actorMembership.role] ?? 0) < (hierarchy[transition.requiredRole] ?? 0)) {
        throw new WorkspacePermissionDeniedError(
          `State transition requires ${transition.requiredRole} role.`,
        );
      }
    }

    const targetState = await this.workflowRepo.findStateById(
      workItem.workflowId,
      params.targetStateId,
    );
    if (!targetState) {
      throw new WorkflowStateNotFoundError();
    }

    const completedAt =
      targetState.category === "COMPLETED" || targetState.category === "CANCELED"
        ? new Date().toISOString()
        : null;

    const updated = await this.workItemRepo.update(
      params.workspaceId,
      params.workItemId,
      {
        workflowStateId: params.targetStateId,
        completedAt,
      },
    );

    if (!updated) {
      throw new WorkItemNotFoundError();
    }

    if (this.historyRepo) {
      await this.historyRepo.create({
        workspaceId: params.workspaceId,
        workItemId: updated.id,
        actorUserId: params.actorUserId,
        action: "TRANSITIONED",
        fromStateId: currentStateId,
        toStateId: params.targetStateId,
      });
    }

    return updated;
  }

  async addComment(params: AddCommentParams) {
    const actorMembership = await this.assertActorWorkspaceMember(
      params.workspaceId,
      params.actorUserId,
    );

    if (actorMembership.role === "VIEWER") {
      throw new WorkspacePermissionDeniedError(
        "Action requires DEVELOPER or higher role.",
      );
    }

    const workItem = await this.workItemRepo.findById(
      params.workspaceId,
      params.workItemId,
    );
    if (!workItem) {
      throw new WorkItemNotFoundError();
    }

    if (!params.content || params.content.trim().length === 0) {
      throw new Error("Comment content cannot be empty.");
    }

    if (!this.commentRepo) {
      throw new Error("Comment repository not attached.");
    }

    const comment = await this.commentRepo.create({
      workspaceId: params.workspaceId,
      workItemId: params.workItemId,
      authorUserId: params.actorUserId,
      content: params.content,
    });

    if (this.historyRepo) {
      await this.historyRepo.create({
        workspaceId: params.workspaceId,
        workItemId: params.workItemId,
        actorUserId: params.actorUserId,
        action: "COMMENTED",
      });
    }

    return comment;
  }
}

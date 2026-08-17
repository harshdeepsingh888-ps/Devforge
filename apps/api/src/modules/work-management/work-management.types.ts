export const WORK_ITEM_TYPES = ["EPIC", "FEATURE", "TASK", "BUG"] as const;
export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];

export const WORK_ITEM_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
] as const;
export type WorkItemPriority = (typeof WORK_ITEM_PRIORITIES)[number];

export const STATE_CATEGORIES = [
  "BACKLOG",
  "UNSTARTED",
  "STARTED",
  "COMPLETED",
  "CANCELED",
] as const;
export type StateCategory = (typeof STATE_CATEGORIES)[number];

export const WORK_ITEM_ACTIONS = [
  "CREATED",
  "UPDATED",
  "TRANSITIONED",
  "ASSIGNED",
  "COMMENTED",
  "ARCHIVED",
] as const;
export type WorkItemAction = (typeof WORK_ITEM_ACTIONS)[number];

export interface Workflow {
  id: string;
  workspaceId: string;
  projectId: string | null;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowInput {
  workspaceId: string;
  projectId?: string | null | undefined;
  name: string;
  isDefault?: boolean | undefined;
}

export interface WorkflowState {
  id: string;
  workflowId: string;
  name: string;
  category: StateCategory;
  position: number;
  isInitial: boolean;
  isTerminal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowStateInput {
  workflowId: string;
  name: string;
  category: StateCategory;
  position: number;
  isInitial?: boolean | undefined;
  isTerminal?: boolean | undefined;
}

export interface StateTransition {
  id: string;
  workflowId: string;
  fromStateId: string;
  toStateId: string;
  name?: string | null | undefined;
  requiredRole?: "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER" | null | undefined;
  createdAt: string;
}

export interface CreateStateTransitionInput {
  workflowId: string;
  fromStateId: string;
  toStateId: string;
  name?: string | null | undefined;
  requiredRole?: "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER" | null | undefined;
}

export interface BaseWorkItem {
  id: string;
  workspaceId: string;
  projectId: string;
  type: WorkItemType;
  title: string;
  description: string | null;
  parentId: string | null;
  workflowId: string;
  workflowStateId: string;
  assigneeUserId: string | null;
  teamId: string | null;
  reporterUserId: string;
  priority: WorkItemPriority;
  storyPoints: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EpicWorkItem = BaseWorkItem & { type: "EPIC"; parentId: null };
export type FeatureWorkItem = BaseWorkItem & { type: "FEATURE" };
export type TaskWorkItem = BaseWorkItem & { type: "TASK" };
export type BugWorkItem = BaseWorkItem & { type: "BUG" };

export type WorkItem =
  | EpicWorkItem
  | FeatureWorkItem
  | TaskWorkItem
  | BugWorkItem;

export interface CreateWorkItemInput {
  workspaceId: string;
  projectId: string;
  type: WorkItemType;
  title: string;
  description?: string | null | undefined;
  parentId?: string | null | undefined;
  workflowId: string;
  workflowStateId?: string | undefined;
  assigneeUserId?: string | null | undefined;
  teamId?: string | null | undefined;
  reporterUserId: string;
  priority?: WorkItemPriority | undefined;
  storyPoints?: number | null | undefined;
}

export interface Comment {
  id: string;
  workspaceId: string;
  workItemId: string;
  authorUserId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentInput {
  workspaceId: string;
  workItemId: string;
  authorUserId: string;
  content: string;
}

export interface WorkItemHistory {
  id: string;
  workspaceId: string;
  workItemId: string;
  actorUserId: string;
  action: WorkItemAction;
  fromStateId: string | null;
  toStateId: string | null;
  fromAssigneeUserId: string | null;
  toAssigneeUserId: string | null;
  metadataJson: string | null;
  createdAt: string;
}

export interface CreateWorkItemHistoryInput {
  workspaceId: string;
  workItemId: string;
  actorUserId: string;
  action: WorkItemAction;
  fromStateId?: string | null | undefined;
  toStateId?: string | null | undefined;
  fromAssigneeUserId?: string | null | undefined;
  toAssigneeUserId?: string | null | undefined;
  metadataJson?: string | null | undefined;
}

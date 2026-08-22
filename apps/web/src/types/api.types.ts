export type WorkItemPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Workspace {
  id: string;
  name: string;
  slug?: string;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Workflow {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  name: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowState {
  id: string;
  workflowId: string;
  name: string;
  category?: string;
  position: number;
  isInitial: boolean;
  isTerminal: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StateTransition {
  id: string;
  workflowId: string;
  fromStateId: string;
  toStateId: string;
  name?: string | null;
  requiredRole?: string | null;
  createdAt?: string;
}

export interface WorkflowDetails {
  workflow: Workflow;
  states: WorkflowState[];
  transitions: StateTransition[];
}

export interface WorkItem {
  id: string;
  workspaceId?: string;
  projectId?: string;
  title: string;
  description?: string | null;
  type?: string;
  status?: string;
  priority?: WorkItemPriority;
  workflowId?: string;
  workflowStateId?: string;
  assigneeUserId?: string | null;
  teamId?: string | null;
  parentId?: string | null;
  storyPoints?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Comment {
  id: string;
  workspaceId: string;
  workItemId: string;
  authorUserId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkItemHistory {
  id: string;
  workspaceId: string;
  workItemId: string;
  actorUserId: string;
  action: string;
  fromStateId?: string | null;
  toStateId?: string | null;
  fromAssigneeUserId?: string | null;
  toAssigneeUserId?: string | null;
  metadataJson?: string | null;
  createdAt: string;
}

export interface UpdateWorkItemInput {
  title?: string;
  description?: string | null;
  priority?: WorkItemPriority;
  storyPoints?: number | null;
  assigneeUserId?: string | null;
  teamId?: string | null;
  parentId?: string | null;
}
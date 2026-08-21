export type WorkspaceRole = "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER";
export type ProjectStatus = "ACTIVE" | "ARCHIVED" | "COMPLETED";

export type WorkItemType = "TASK" | "BUG" | "FEATURE" | "EPIC";
export type WorkItemStatus =
  | "BACKLOG"
  | "READY"
  | "IN_PROGRESS"
  | "CODE_REVIEW"
  | "DONE"
  | "BLOCKED";
export type WorkItemPriority = "P0" | "P1" | "P2" | "P3";

export type AdrStatus = "PROPOSED" | "ACCEPTED" | "REJECTED" | "DEPRECATED";
export type SpecStatus = "DRAFT" | "APPROVED" | "ARCHIVED";

export type GitProvider = "GITHUB" | "GITLAB" | "BITBUCKET";
export type PipelineProvider = "GITHUB_ACTIONS" | "GITLAB" | "JENKINS";
export type PipelineRunStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELED";
export type DeploymentEnvironment = "DEV" | "STAGING" | "PROD";
export type DeploymentStatus = "DEPLOYED" | "FAILED" | "ROLLED_BACK";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user?: User;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkItem {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description: string | null;
  type: WorkItemType;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  assigneeUserId: string | null;
  teamId: string | null;
  parentWorkItemId: string | null;
  estimate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArchitectureDecision {
  id: string;
  workspaceId: string;
  projectId: string | null;
  title: string;
  status: AdrStatus;
  context: string;
  decision: string;
  consequences: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TechnicalSpecification {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  status: SpecStatus;
  content: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Repository {
  id: string;
  workspaceId: string;
  name: string;
  provider: GitProvider;
  externalId: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface Commit {
  id: string;
  workspaceId: string;
  repositoryId: string;
  externalId: string;
  message: string;
  authorName: string;
  authorEmail: string;
  committedAt: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pipeline {
  id: string;
  workspaceId: string;
  projectId: string;
  provider: PipelineProvider;
  name: string;
  externalId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineRun {
  id: string;
  workspaceId: string;
  pipelineId: string;
  commitId: string;
  status: PipelineRunStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  triggeredByUserId: string | null;
  externalRunId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BuildLog {
  id: string;
  workspaceId: string;
  pipelineRunId: string;
  log: string;
  createdAt: string;
}

export interface Deployment {
  id: string;
  workspaceId: string;
  pipelineRunId: string;
  environment: DeploymentEnvironment;
  status: DeploymentStatus;
  deployedAt: string;
  createdAt: string;
}

export interface PipelineRunTrace {
  run: PipelineRun;
  pipeline: Pipeline;
  commitId: string;
  buildLogs: BuildLog[];
  deployments: Deployment[];
}

export interface DoraMetrics {
  deploymentFrequency: number;
  leadTimeMsAvg: number | null;
}

export interface ActivityItem {
  id: string;
  type:
    | "WORK_ITEM_CREATED"
    | "STATE_CHANGED"
    | "ADR_CREATED"
    | "ADR_ACCEPTED"
    | "COMMIT_INGESTED"
    | "PIPELINE_STARTED"
    | "DEPLOYMENT_CREATED";
  title: string;
  description: string;
  timestamp: string;
  actor: string;
  entityId: string;
}

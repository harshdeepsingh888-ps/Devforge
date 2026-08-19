export const PIPELINE_PROVIDERS = [
  "GITHUB_ACTIONS",
  "GITLAB",
  "JENKINS",
] as const;
export type PipelineProvider = (typeof PIPELINE_PROVIDERS)[number];

export const PIPELINE_RUN_STATUSES = [
  "PENDING",
  "RUNNING",
  "SUCCESS",
  "FAILED",
  "CANCELED",
] as const;
export type PipelineRunStatus = (typeof PIPELINE_RUN_STATUSES)[number];

export const DEPLOYMENT_ENVIRONMENTS = ["DEV", "STAGING", "PROD"] as const;
export type DeploymentEnvironment = (typeof DEPLOYMENT_ENVIRONMENTS)[number];

export const DEPLOYMENT_STATUSES = [
  "DEPLOYED",
  "FAILED",
  "ROLLED_BACK",
] as const;
export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];

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

export interface CreatePipelineInput {
  workspaceId: string;
  projectId: string;
  provider?: PipelineProvider | undefined;
  name: string;
  externalId: string;
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

export interface IngestPipelineRunInput {
  workspaceId: string;
  pipelineId: string;
  commitId: string;
  status?: PipelineRunStatus | undefined;
  startedAt?: string | undefined;
  finishedAt?: string | null | undefined;
  durationMs?: number | null | undefined;
  triggeredByUserId?: string | null | undefined;
  externalRunId: string;
}

export interface BuildLog {
  id: string;
  workspaceId: string;
  pipelineRunId: string;
  log: string;
  createdAt: string;
}

export interface CreateBuildLogInput {
  workspaceId: string;
  pipelineRunId: string;
  log: string;
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

export interface RecordDeploymentInput {
  workspaceId: string;
  pipelineRunId: string;
  environment: DeploymentEnvironment;
  status?: DeploymentStatus | undefined;
  deployedAt?: string | undefined;
}

export interface PipelineRunTrace {
  run: PipelineRun;
  pipeline: Pipeline;
  commitId: string;
  buildLogs: BuildLog[];
  deployments: Deployment[];
}

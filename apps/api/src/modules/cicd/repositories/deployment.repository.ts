import type { Deployment } from "../cicd.types.js";

export interface DeploymentRepository {
  create(deployment: Deployment): Promise<Deployment>;

  findByPipelineRun(
    workspaceId: string,
    pipelineRunId: string,
  ): Promise<Deployment[]>;

  findByCommit(
    workspaceId: string,
    commitId: string,
  ): Promise<Deployment[]>;
}

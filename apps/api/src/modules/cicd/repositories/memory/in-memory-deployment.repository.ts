import type { Deployment } from "../../cicd.types.js";
import type { DeploymentRepository } from "../deployment.repository.js";

export class InMemoryDeploymentRepository implements DeploymentRepository {
  private readonly deployments = new Map<string, Deployment>();

  async create(deployment: Deployment): Promise<Deployment> {
    this.deployments.set(deployment.id, { ...deployment });
    return { ...deployment };
  }

  async findByPipelineRun(
    workspaceId: string,
    pipelineRunId: string,
  ): Promise<Deployment[]> {
    const results: Deployment[] = [];
    for (const d of this.deployments.values()) {
      if (d.workspaceId === workspaceId && d.pipelineRunId === pipelineRunId) {
        results.push({ ...d });
      }
    }
    return results;
  }

  async findByCommit(
    workspaceId: string,
    _commitId: string,
  ): Promise<Deployment[]> {
    // In-memory helper filters by workspaceId (runs will be linked in service if needed)
    const results: Deployment[] = [];
    for (const d of this.deployments.values()) {
      if (d.workspaceId === workspaceId) {
        results.push({ ...d });
      }
    }
    return results;
  }
}

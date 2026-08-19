import type { BuildLog } from "../../cicd.types.js";
import type { BuildLogRepository } from "../build-log.repository.js";

export class InMemoryBuildLogRepository implements BuildLogRepository {
  private readonly logs = new Map<string, BuildLog>();

  async create(log: BuildLog): Promise<BuildLog> {
    this.logs.set(log.id, { ...log });
    return { ...log };
  }

  async findByPipelineRun(
    workspaceId: string,
    pipelineRunId: string,
  ): Promise<BuildLog[]> {
    const results: BuildLog[] = [];
    for (const l of this.logs.values()) {
      if (l.workspaceId === workspaceId && l.pipelineRunId === pipelineRunId) {
        results.push({ ...l });
      }
    }
    return results;
  }
}

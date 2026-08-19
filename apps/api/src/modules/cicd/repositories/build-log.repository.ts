import type { BuildLog } from "../cicd.types.js";

export interface BuildLogRepository {
  create(log: BuildLog): Promise<BuildLog>;

  findByPipelineRun(
    workspaceId: string,
    pipelineRunId: string,
  ): Promise<BuildLog[]>;
}

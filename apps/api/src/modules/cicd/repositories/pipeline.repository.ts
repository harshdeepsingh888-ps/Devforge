import type { Pipeline } from "../cicd.types.js";

export interface PipelineRepository {
  create(pipeline: Pipeline): Promise<Pipeline>;

  findById(workspaceId: string, id: string): Promise<Pipeline | null>;

  findByExternalId(
    workspaceId: string,
    externalId: string,
  ): Promise<Pipeline | null>;

  findByWorkspace(
    workspaceId: string,
    projectId?: string | null,
  ): Promise<Pipeline[]>;
}

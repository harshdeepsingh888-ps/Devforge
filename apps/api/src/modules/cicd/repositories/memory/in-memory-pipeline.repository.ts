import type { Pipeline } from "../../cicd.types.js";
import type { PipelineRepository } from "../pipeline.repository.js";

export class InMemoryPipelineRepository implements PipelineRepository {
  private readonly pipelines = new Map<string, Pipeline>();

  async create(pipeline: Pipeline): Promise<Pipeline> {
    this.pipelines.set(pipeline.id, { ...pipeline });
    return { ...pipeline };
  }

  async findById(workspaceId: string, id: string): Promise<Pipeline | null> {
    const pipeline = this.pipelines.get(id);
    if (!pipeline || pipeline.workspaceId !== workspaceId) {
      return null;
    }
    return { ...pipeline };
  }

  async findByExternalId(
    workspaceId: string,
    externalId: string,
  ): Promise<Pipeline | null> {
    for (const p of this.pipelines.values()) {
      if (p.workspaceId === workspaceId && p.externalId === externalId) {
        return { ...p };
      }
    }
    return null;
  }

  async findByWorkspace(
    workspaceId: string,
    projectId?: string | null,
  ): Promise<Pipeline[]> {
    const results: Pipeline[] = [];
    for (const p of this.pipelines.values()) {
      if (p.workspaceId === workspaceId) {
        if (projectId !== undefined && p.projectId !== projectId) {
          continue;
        }
        results.push({ ...p });
      }
    }
    return results;
  }
}

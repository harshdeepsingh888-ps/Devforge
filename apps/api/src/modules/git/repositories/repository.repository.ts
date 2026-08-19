import type { Repository } from "../git.types.js";

export interface RepositoryRepository {
  create(repository: Repository): Promise<Repository>;
  findById(workspaceId: string, id: string): Promise<Repository | null>;
  findByWorkspace(workspaceId: string): Promise<Repository[]>;
}

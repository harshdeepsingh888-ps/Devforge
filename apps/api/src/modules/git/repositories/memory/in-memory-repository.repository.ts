import type { Repository } from "../../git.types.js";
import type { RepositoryRepository } from "../repository.repository.js";

export class InMemoryRepositoryRepository implements RepositoryRepository {
  private repositories = new Map<string, Repository>();

  async create(repository: Repository): Promise<Repository> {
    this.repositories.set(repository.id, { ...repository });
    return { ...repository };
  }

  async findById(workspaceId: string, id: string): Promise<Repository | null> {
    const repo = this.repositories.get(id);
    if (!repo || repo.workspaceId !== workspaceId) {
      return null;
    }
    return { ...repo };
  }

  async findByWorkspace(workspaceId: string): Promise<Repository[]> {
    return Array.from(this.repositories.values())
      .filter((r) => r.workspaceId === workspaceId)
      .map((r) => ({ ...r }));
  }
}

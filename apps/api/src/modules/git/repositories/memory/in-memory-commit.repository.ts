import type { Commit } from "../../git.types.js";
import type { CommitRepository } from "../commit.repository.js";

export class InMemoryCommitRepository implements CommitRepository {
  private commits = new Map<string, Commit>();

  async create(commit: Commit): Promise<Commit> {
    this.commits.set(commit.id, { ...commit });
    return { ...commit };
  }

  async findByExternalId(
    repositoryId: string,
    sha: string,
  ): Promise<Commit | null> {
    for (const commit of this.commits.values()) {
      if (
        commit.repositoryId === repositoryId &&
        commit.externalId.toLowerCase() === sha.toLowerCase()
      ) {
        return { ...commit };
      }
    }
    return null;
  }

  async findById(workspaceId: string, id: string): Promise<Commit | null> {
    const commit = this.commits.get(id);
    if (!commit || commit.workspaceId !== workspaceId) {
      return null;
    }
    return { ...commit };
  }

  async listByWorkspace(workspaceId: string): Promise<Commit[]> {
    return Array.from(this.commits.values())
      .filter((c) => c.workspaceId === workspaceId)
      .map((c) => ({ ...c }));
  }
}

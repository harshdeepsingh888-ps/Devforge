export class GitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class CommitNotFoundError extends GitError {
  constructor(message = "Commit not found.") {
    super(message);
  }
}

export class RepositoryNotFoundError extends GitError {
  constructor(message = "Git repository not found.") {
    super(message);
  }
}

export class GitTenantMismatchError extends GitError {
  constructor(message = "Cannot link Git entities across different workspace tenants.") {
    super(message);
  }
}

export class DuplicateCommitError extends GitError {
  constructor(message = "Commit with this SHA already exists in the repository.") {
    super(message);
  }
}

export class DuplicateCommitLinkError extends GitError {
  constructor(message = "Commit is already linked to this entity.") {
    super(message);
  }
}

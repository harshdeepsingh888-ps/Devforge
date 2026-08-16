export class WorkspaceNotFoundError extends Error {
  readonly code = "WORKSPACE_NOT_FOUND";

  constructor() {
    super("Workspace not found.");
    this.name = "WorkspaceNotFoundError";
  }
}

export class WorkspaceSlugAlreadyExistsError extends Error {
  readonly code = "WORKSPACE_SLUG_ALREADY_EXISTS";

  constructor() {
    super("Workspace slug is already in use.");
    this.name = "WorkspaceSlugAlreadyExistsError";
  }
}

export class WorkspaceMembershipNotFoundError extends Error {
  readonly code = "WORKSPACE_MEMBERSHIP_NOT_FOUND";

  constructor() {
    super("Workspace membership not found.");
    this.name = "WorkspaceMembershipNotFoundError";
  }
}

export class WorkspaceMembershipAlreadyExistsError extends Error {
  readonly code = "WORKSPACE_MEMBERSHIP_ALREADY_EXISTS";

  constructor() {
    super("User is already a member of this workspace.");
    this.name = "WorkspaceMembershipAlreadyExistsError";
  }
}

export class WorkspaceOwnerRequiredError extends Error {
  readonly code = "WORKSPACE_OWNER_REQUIRED";

  constructor() {
    super("A workspace must have an owner.");
    this.name = "WorkspaceOwnerRequiredError";
  }
}

export class WorkspacePermissionDeniedError extends Error {
  readonly code = "WORKSPACE_PERMISSION_DENIED";

  constructor(message = "Insufficient permissions to perform this action in the workspace.") {
    super(message);
    this.name = "WorkspacePermissionDeniedError";
  }
}

export class TeamNotFoundError extends Error {
  readonly code = "TEAM_NOT_FOUND";

  constructor() {
    super("Team not found.");
    this.name = "TeamNotFoundError";
  }
}

export class TeamSlugAlreadyExistsError extends Error {
  readonly code = "TEAM_SLUG_ALREADY_EXISTS";

  constructor() {
    super("Team slug is already in use within this workspace.");
    this.name = "TeamSlugAlreadyExistsError";
  }
}

export class TeamMemberAlreadyExistsError extends Error {
  readonly code = "TEAM_MEMBER_ALREADY_EXISTS";

  constructor() {
    super("User is already a member of this team.");
    this.name = "TeamMemberAlreadyExistsError";
  }
}

export class TeamMemberNotFoundError extends Error {
  readonly code = "TEAM_MEMBER_NOT_FOUND";

  constructor() {
    super("Team member not found.");
    this.name = "TeamMemberNotFoundError";
  }
}
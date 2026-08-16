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

export class InvitationNotFoundError extends Error {
  readonly code = "INVITATION_NOT_FOUND";

  constructor() {
    super("Invitation not found.");
    this.name = "InvitationNotFoundError";
  }
}

export class InvitationExpiredError extends Error {
  readonly code = "INVITATION_EXPIRED";

  constructor() {
    super("Invitation has expired.");
    this.name = "InvitationExpiredError";
  }
}

export class InvitationRevokedError extends Error {
  readonly code = "INVITATION_REVOKED";

  constructor() {
    super("Invitation has been revoked.");
    this.name = "InvitationRevokedError";
  }
}

export class InvitationAlreadyAcceptedError extends Error {
  readonly code = "INVITATION_ALREADY_ACCEPTED";

  constructor() {
    super("Invitation has already been accepted.");
    this.name = "InvitationAlreadyAcceptedError";
  }
}

export class InvitationAlreadyPendingError extends Error {
  readonly code = "INVITATION_ALREADY_PENDING";

  constructor() {
    super("A pending invitation already exists for this email in the workspace.");
    this.name = "InvitationAlreadyPendingError";
  }
}

export class InvitationCannotBeRevokedError extends Error {
  readonly code = "INVITATION_CANNOT_BE_REVOKED";

  constructor() {
    super("Only pending invitations can be revoked.");
    this.name = "InvitationCannotBeRevokedError";
  }
}
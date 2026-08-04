export class InvalidCredentialsError extends Error {
  readonly code = "INVALID_CREDENTIALS";

  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}

export class SessionNotFoundError extends Error {
  readonly code = "SESSION_NOT_FOUND";

  constructor() {
    super("Session not found.");
    this.name = "SessionNotFoundError";
  }
}

export class SessionRevokedError extends Error {
  readonly code = "SESSION_REVOKED";

  constructor() {
    super("Session has been revoked.");
    this.name = "SessionRevokedError";
  }
}
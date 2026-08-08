export class InvalidCredentialsError extends Error {
  readonly code = "INVALID_CREDENTIALS";

  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}

export class InvalidRefreshTokenError extends Error {
  readonly code = "INVALID_REFRESH_TOKEN";

  constructor() {
    super("The refresh token is invalid.");
    this.name = "InvalidRefreshTokenError";
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

export class SessionExpiredError extends Error {
  readonly code = "SESSION_EXPIRED";

  constructor() {
    super("Session has expired.");
    this.name = "SessionExpiredError";
  }
}
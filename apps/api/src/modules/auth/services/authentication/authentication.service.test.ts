import assert from "node:assert/strict";
import test from "node:test";

import type {
  AuthSession,
  CreateSessionInput,
} from "../../session.types.js";
import {
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  SessionExpiredError,
  SessionNotFoundError,
  SessionRevokedError,
} from "../../authentication.errors.js";import { InMemoryUserRepository } from "../../repositories/memory/in-memory-user.repository.js";
import type { SessionRepository } from "../../repositories/session/session.repository.js";
import type {
  AccessTokenService,
} from "../../security/jwt.service.js";
import type {
  RefreshTokenPair,
  RefreshTokenService,
} from "../../security/refresh-token.service.js";
import type { PasswordService } from "../password.service.js";
import { RegistrationService } from "../registration.service.js";
import { AuthenticationService } from "./authentication.service.js";

const NOW = new Date(
  "2026-08-04T09:00:00.000Z",
);

const REFRESH_TOKEN_LIFETIME_SECONDS =
  60 * 60 * 24 * 30;

class FakePasswordService
  implements PasswordService
{
  verifyCalls: Array<{
    passwordHash: string;
    password: string;
  }> = [];

  constructor(
    private readonly passwordIsValid = true,
  ) {}

  async hashPassword(
    password: string,
  ): Promise<string> {
    return `hashed:${password}`;
  }

  async verifyPassword(
    passwordHash: string,
    password: string,
  ): Promise<boolean> {
    this.verifyCalls.push({
      passwordHash,
      password,
    });

    return this.passwordIsValid;
  }
}

class FakeRefreshTokenService
  implements RefreshTokenService
{
  readonly pair: RefreshTokenPair = {
    token: "plain-refresh-token",
    hash: "hashed-refresh-token",
  };

  generateCalls = 0;

  generate(): RefreshTokenPair {
    this.generateCalls += 1;

    return this.pair;
  }

  hash(token: string): string {
    return `hashed:${token}`;
  }

  verify(
    token: string,
    expectedHash: string,
  ): boolean {
    return this.hash(token) === expectedHash;
  }
}

class FakeAccessTokenService
  implements AccessTokenService
{
  issueCalls: Array<{
    userId: string;
    sessionId: string;
  }> = [];

  async issue(input: {
    userId: string;
    sessionId: string;
  }): Promise<string> {
    this.issueCalls.push(input);

    return "issued-access-token";
  }

  async verify(): Promise<{
    userId: string;
    sessionId: string;
  }> {
    return {
      userId: "user-id",
      sessionId: "session-id",
    };
  }
}

class FakeSessionRepository
  implements SessionRepository
{
  private readonly sessions =
    new Map<string, AuthSession>();

  createCalls: CreateSessionInput[] = [];

  async create(
    input: CreateSessionInput,
  ): Promise<AuthSession> {
    this.createCalls.push(input);

    const session: AuthSession = {
      id: "session-123",
      userId: input.userId,
      refreshTokenHash:
        input.refreshTokenHash,
      status: "ACTIVE",
      expiresAt: input.expiresAt,
      lastUsedAt: NOW.toISOString(),
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    };

    this.sessions.set(
      session.id,
      session,
    );

    return session;
  }

  async findById(
    sessionId: string,
  ): Promise<AuthSession | null> {
    return (
      this.sessions.get(sessionId) ??
      null
    );
  }

  async findByRefreshTokenHash(
    refreshTokenHash: string,
  ): Promise<AuthSession | null> {
    for (
      const session
      of this.sessions.values()
    ) {
      if (
        session.refreshTokenHash ===
        refreshTokenHash
      ) {
        return session;
      }
    }

    return null;
  }

  async rotateRefreshToken(
    sessionId: string,
    currentRefreshTokenHash: string,
    nextRefreshTokenHash: string,
  ): Promise<AuthSession | null> {
    const session =
      this.sessions.get(sessionId);

    if (
      !session ||
      session.status !== "ACTIVE" ||
      session.refreshTokenHash !==
        currentRefreshTokenHash
    ) {
      return null;
    }

    const updatedSession: AuthSession = {
      ...session,
      refreshTokenHash:
        nextRefreshTokenHash,
      lastUsedAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    };

    this.sessions.set(
      sessionId,
      updatedSession,
    );

    return updatedSession;
  }

  async touch(
    sessionId: string,
  ): Promise<AuthSession | null> {
    const session =
      this.sessions.get(sessionId);

    if (
      !session ||
      session.status !== "ACTIVE"
    ) {
      return null;
    }

    const updatedSession: AuthSession = {
      ...session,
      lastUsedAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    };

    this.sessions.set(
      sessionId,
      updatedSession,
    );

    return updatedSession;
  }

  async revoke(
    sessionId: string,
  ): Promise<AuthSession | null> {
    const session =
      this.sessions.get(sessionId);

    if (
      !session ||
      session.status !== "ACTIVE"
    ) {
      return null;
    }

    const updatedSession: AuthSession = {
      ...session,
      status: "REVOKED",
      lastUsedAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    };

    this.sessions.set(
      sessionId,
      updatedSession,
    );

    return updatedSession;
  }

  async revokeAllForUser(
    userId: string,
  ): Promise<number> {
    let revokedCount = 0;

    for (
      const [sessionId, session]
      of this.sessions.entries()
    ) {
      if (
        session.userId !== userId ||
        session.status !== "ACTIVE"
      ) {
        continue;
      }

      this.sessions.set(
        sessionId,
        {
          ...session,
          status: "REVOKED",
          lastUsedAt:
            NOW.toISOString(),
          updatedAt:
            NOW.toISOString(),
        },
      );

      revokedCount += 1;
    }

    return revokedCount;
  }

  seed(
    session: AuthSession,
  ): void {
    this.sessions.set(
      session.id,
      session,
    );
  }
}

function createSessionFixture(
  overrides: Partial<AuthSession> = {},
): AuthSession {
  return {
    id: "session-refresh-123",
    userId: "user-id",
    refreshTokenHash:
      "hashed:current-refresh-token",
    status: "ACTIVE",
    expiresAt: new Date(
      NOW.getTime() + 60 * 60 * 1_000,
    ).toISOString(),
    lastUsedAt: NOW.toISOString(),
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

async function createTestContext(
  passwordIsValid = true,
)
{
  const users = new InMemoryUserRepository();
  const passwords =
    new FakePasswordService(
      passwordIsValid,
    );
  const sessions =
    new FakeSessionRepository();
  const refreshTokens =
    new FakeRefreshTokenService();
  const accessTokens =
    new FakeAccessTokenService();

  const registration =
    new RegistrationService({
      userRepository: users,
      passwordService: passwords,
    });

  const user = await users.create({
    email: "developer@example.com",
    passwordHash: "stored-password-hash",
    displayName: "Dev Forge",
  });

  const service =
    new AuthenticationService({
      users,
      passwords,
      registration,
      sessions,
      refreshTokens,
      accessTokens,
      configuration: {
        refreshTokenExpiresInSeconds:
          REFRESH_TOKEN_LIFETIME_SECONDS,
      },
      now: () => NOW,
    });

  return {
    service,
    user,
    passwords,
    sessions,
    refreshTokens,
    accessTokens,
  };
}

test("login creates a session and returns authentication credentials", async () => {
  const context =
    await createTestContext();

  const result =
    await context.service.login({
      email: "developer@example.com",
      password: "StrongPassword123",
    });

  assert.equal(
    result.accessToken,
    "issued-access-token",
  );

  assert.equal(
    result.refreshToken,
    "plain-refresh-token",
  );

  assert.equal(
    result.user.id,
    context.user.id,
  );

  assert.equal(
    "passwordHash" in result.user,
    false,
  );
});

test("login normalizes the email before finding the user", async () => {
  const context =
    await createTestContext();

  const result =
    await context.service.login({
      email: "  DEVELOPER@EXAMPLE.COM  ",
      password: "StrongPassword123",
    });

  assert.equal(
    result.user.email,
    "developer@example.com",
  );
});

test("login verifies the submitted password against the stored hash", async () => {
  const context =
    await createTestContext();

  await context.service.login({
    email: "developer@example.com",
    password: "StrongPassword123",
  });

  assert.deepEqual(
    context.passwords.verifyCalls,
    [
      {
        passwordHash:
          "stored-password-hash",
        password:
          "StrongPassword123",
      },
    ],
  );
});

test("login stores only the refresh-token hash in the session", async () => {
  const context =
    await createTestContext();

  await context.service.login({
    email: "developer@example.com",
    password: "StrongPassword123",
  });

  assert.equal(
    context.sessions.createCalls.length,
    1,
  );

  assert.equal(
    context.sessions.createCalls[0]
      ?.refreshTokenHash,
    "hashed-refresh-token",
  );

  assert.notEqual(
    context.sessions.createCalls[0]
      ?.refreshTokenHash,
    "plain-refresh-token",
  );
});

test("login creates a session with the configured expiration", async () => {
  const context =
    await createTestContext();

  await context.service.login({
    email: "developer@example.com",
    password: "StrongPassword123",
  });

  const expectedExpiration = new Date(
    NOW.getTime() +
      REFRESH_TOKEN_LIFETIME_SECONDS *
        1_000,
  ).toISOString();

  assert.equal(
    context.sessions.createCalls[0]
      ?.expiresAt,
    expectedExpiration,
  );
});

test("login issues an access token for the user and created session", async () => {
  const context =
    await createTestContext();

  await context.service.login({
    email: "developer@example.com",
    password: "StrongPassword123",
  });

  assert.deepEqual(
    context.accessTokens.issueCalls,
    [
      {
        userId: context.user.id,
        sessionId: "session-123",
      },
    ],
  );
});

test("login rejects an unknown email without verifying a password", async () => {
  const context =
    await createTestContext();

  await assert.rejects(
    context.service.login({
      email: "unknown@example.com",
      password: "StrongPassword123",
    }),
    InvalidCredentialsError,
  );

  assert.deepEqual(
    context.passwords.verifyCalls,
    [],
  );

  assert.equal(
    context.sessions.createCalls.length,
    0,
  );
});

test("login rejects an incorrect password without creating a session", async () => {
  const context =
    await createTestContext(false);

  await assert.rejects(
    context.service.login({
      email: "developer@example.com",
      password: "IncorrectPassword",
    }),
    InvalidCredentialsError,
  );

  assert.equal(
    context.sessions.createCalls.length,
    0,
  );

  assert.equal(
    context.refreshTokens.generateCalls,
    0,
  );

  assert.deepEqual(
    context.accessTokens.issueCalls,
    [],
  );
});

test("refresh rotates the refresh token and returns new authentication credentials", async () => {
  const context =
    await createTestContext();

  const session =
    createSessionFixture({
      userId: context.user.id,
    });

  context.sessions.seed(session);

  const result =
    await context.service.refresh({
      refreshToken:
        "current-refresh-token",
    });

  assert.equal(
    result.accessToken,
    "issued-access-token",
  );

  assert.equal(
    result.refreshToken,
    "plain-refresh-token",
  );

  assert.equal(
    result.user.id,
    context.user.id,
  );

  assert.equal(
    "passwordHash" in result.user,
    false,
  );

  assert.deepEqual(
    context.accessTokens.issueCalls,
    [
      {
        userId: context.user.id,
        sessionId:
          "session-refresh-123",
      },
    ],
  );

  const oldSession =
    await context.sessions
      .findByRefreshTokenHash(
        "hashed:current-refresh-token",
      );

  assert.equal(
    oldSession,
    null,
  );

  const rotatedSession =
    await context.sessions
      .findByRefreshTokenHash(
        "hashed-refresh-token",
      );

  assert.ok(rotatedSession);

  assert.equal(
    rotatedSession.id,
    "session-refresh-123",
  );
});

test("refresh rejects an unknown refresh token", async () => {
  const context =
    await createTestContext();

  await assert.rejects(
    context.service.refresh({
      refreshToken:
        "unknown-refresh-token",
    }),
    InvalidRefreshTokenError,
  );

  assert.equal(
    context.refreshTokens.generateCalls,
    0,
  );

  assert.deepEqual(
    context.accessTokens.issueCalls,
    [],
  );
});

test("refresh rejects a revoked session", async () => {
  const context =
    await createTestContext();

  context.sessions.seed(
    createSessionFixture({
      userId: context.user.id,
      status: "REVOKED",
    }),
  );

  await assert.rejects(
    context.service.refresh({
      refreshToken:
        "current-refresh-token",
    }),
    SessionRevokedError,
  );

  assert.equal(
    context.refreshTokens.generateCalls,
    0,
  );

  assert.deepEqual(
    context.accessTokens.issueCalls,
    [],
  );
});

test("refresh rejects an expired session and revokes it", async () => {
  const context =
    await createTestContext();

  const session =
    createSessionFixture({
      userId: context.user.id,
      expiresAt: new Date(
        NOW.getTime() - 1_000,
      ).toISOString(),
    });

  context.sessions.seed(session);

  await assert.rejects(
    context.service.refresh({
      refreshToken:
        "current-refresh-token",
    }),
    SessionExpiredError,
  );

  const revokedSession =
    await context.sessions.findById(
      session.id,
    );

  assert.ok(revokedSession);

  assert.equal(
    revokedSession.status,
    "REVOKED",
  );

  assert.equal(
    context.refreshTokens.generateCalls,
    0,
  );

  assert.deepEqual(
    context.accessTokens.issueCalls,
    [],
  );
});

test("refresh rejects a session whose user no longer exists", async () => {
  const context =
    await createTestContext();

  context.sessions.seed(
    createSessionFixture({
      userId: "deleted-user-id",
    }),
  );

  await assert.rejects(
    context.service.refresh({
      refreshToken:
        "current-refresh-token",
    }),
    SessionNotFoundError,
  );

  assert.equal(
    context.refreshTokens.generateCalls,
    0,
  );

  assert.deepEqual(
    context.accessTokens.issueCalls,
    [],
  );
});

test("refresh rejects reuse of an already rotated refresh token", async () => {
  const context =
    await createTestContext();

  context.sessions.seed(
    createSessionFixture({
      userId: context.user.id,
    }),
  );

  await context.service.refresh({
    refreshToken:
      "current-refresh-token",
  });

  await assert.rejects(
    context.service.refresh({
      refreshToken:
        "current-refresh-token",
    }),
    InvalidRefreshTokenError,
  );

  assert.equal(
    context.refreshTokens.generateCalls,
    1,
  );

  assert.equal(
    context.accessTokens.issueCalls.length,
    1,
  );
});
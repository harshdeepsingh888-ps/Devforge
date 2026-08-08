import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../../../app.js";
import { EmailAlreadyRegisteredError } from "../auth.errors.js";
import {
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  SessionExpiredError,
} from "../authentication.errors.js";
import type {
  AuthenticationResult,
  LoginInput,
  RefreshInput,
  RegisterInput,
} from "../authentication.types.js";
import type { AuthenticationServiceContract } from "./auth.routes.js";

const AUTHENTICATION_RESULT:
  AuthenticationResult = {
    user: {
      id: "user-123",
      email: "developer@example.com",
      displayName: "Dev Forge",
      avatarUrl: null,
      createdAt:
        "2026-08-05T08:00:00.000Z",
      updatedAt:
        "2026-08-05T08:00:00.000Z",
    },
    accessToken: "access-token",
    refreshToken: "refresh-token",
  };

interface FakeAuthenticationServiceOptions {
  registerError?: Error;
  loginError?: Error;
  refreshError?: Error;
}

class FakeAuthenticationService
  implements AuthenticationServiceContract
{
  registerCalls: RegisterInput[] = [];
  loginCalls: LoginInput[] = [];
    refreshCalls: RefreshInput[] = [];

  constructor(
    private readonly options:
      FakeAuthenticationServiceOptions = {},
  ) {}

  async register(
    input: RegisterInput,
  ): Promise<AuthenticationResult> {
    this.registerCalls.push(input);

    if (this.options.registerError) {
      throw this.options.registerError;
    }

    return AUTHENTICATION_RESULT;
  }

  async login(
    input: LoginInput,
  ): Promise<AuthenticationResult> {
    this.loginCalls.push(input);

    if (this.options.loginError) {
      throw this.options.loginError;
    }

    return AUTHENTICATION_RESULT;
  }

  async refresh(
    input: RefreshInput,
  ): Promise<AuthenticationResult> {
    this.refreshCalls.push(input);

    if (this.options.refreshError) {
      throw this.options.refreshError;
    }

    return AUTHENTICATION_RESULT;
  }
}

test("POST /api/auth/register creates an authenticated account", async (t) => {
  const authenticationService =
    new FakeAuthenticationService();

  const app = buildApp({
    serverOptions: {
      logger: false,
    },
    authenticationService,
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      email: "developer@example.com",
      password: "StrongPassword123",
      displayName: "Dev Forge",
    },
  });

  assert.equal(response.statusCode, 201);

  assert.deepEqual(
    response.json(),
    AUTHENTICATION_RESULT,
  );

  assert.deepEqual(
    authenticationService.registerCalls,
    [
      {
        email: "developer@example.com",
        password: "StrongPassword123",
        displayName: "Dev Forge",
      },
    ],
  );

  assert.equal(
    "passwordHash" in
      response.json<{
        user: Record<string, unknown>;
      }>().user,
    false,
  );
});

test("POST /api/auth/register returns 409 for an existing email", async (t) => {
  const authenticationService =
    new FakeAuthenticationService({
      registerError:
        new EmailAlreadyRegisteredError(),
    });

  const app = buildApp({
    serverOptions: {
      logger: false,
    },
    authenticationService,
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      email: "developer@example.com",
      password: "StrongPassword123",
      displayName: "Dev Forge",
    },
  });

  assert.equal(response.statusCode, 409);

  const body = response.json<{
    error: string;
    message: string;
    requestId: string;
  }>();

  assert.equal(
    body.error,
    "EMAIL_ALREADY_REGISTERED",
  );

  assert.equal(
    body.message,
    "An account with this email already exists.",
  );

  assert.ok(body.requestId);
});

test("POST /api/auth/register rejects an invalid request body", async (t) => {
  const authenticationService =
    new FakeAuthenticationService();

  const app = buildApp({
    serverOptions: {
      logger: false,
    },
    authenticationService,
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      email: "not-an-email",
      password: "short",
      displayName: "   ",
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(
    authenticationService.registerCalls.length,
    0,
  );

  const body = response.json<{
    error: string;
    message: string;
    requestId: string;
  }>();

  assert.equal(
    body.error,
    "VALIDATION_ERROR",
  );

  assert.equal(
    body.message,
    "Request validation failed.",
  );

  assert.ok(body.requestId);
});

test("POST /api/auth/register rejects unknown properties", async (t) => {
  const authenticationService =
    new FakeAuthenticationService();

  const app = buildApp({
    serverOptions: {
      logger: false,
    },
    authenticationService,
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      email: "developer@example.com",
      password: "StrongPassword123",
      displayName: "Dev Forge",
      role: "ADMIN",
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(
    authenticationService.registerCalls.length,
    0,
  );
});

test("POST /api/auth/login creates an authenticated session", async (t) => {
  const authenticationService =
    new FakeAuthenticationService();

  const app = buildApp({
    serverOptions: {
      logger: false,
    },
    authenticationService,
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: {
      email: "developer@example.com",
      password: "StrongPassword123",
    },
  });

  assert.equal(response.statusCode, 200);

  assert.deepEqual(
    response.json(),
    AUTHENTICATION_RESULT,
  );

  assert.deepEqual(
    authenticationService.loginCalls,
    [
      {
        email: "developer@example.com",
        password: "StrongPassword123",
      },
    ],
  );

  assert.equal(
    "passwordHash" in
      response.json<{
        user: Record<string, unknown>;
      }>().user,
    false,
  );
});

test("POST /api/auth/login returns 401 for invalid credentials", async (t) => {
  const authenticationService =
    new FakeAuthenticationService({
      loginError:
        new InvalidCredentialsError(),
    });

  const app = buildApp({
    serverOptions: {
      logger: false,
    },
    authenticationService,
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: {
      email: "developer@example.com",
      password: "IncorrectPassword",
    },
  });

  assert.equal(response.statusCode, 401);

  const body = response.json<{
    error: string;
    message: string;
    requestId: string;
  }>();

  assert.equal(
    body.error,
    "INVALID_CREDENTIALS",
  );

  assert.equal(
    body.message,
    "Invalid email or password.",
  );

  assert.ok(body.requestId);
});

test("POST /api/auth/login rejects an invalid request body", async (t) => {
  const authenticationService =
    new FakeAuthenticationService();

  const app = buildApp({
    serverOptions: {
      logger: false,
    },
    authenticationService,
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: {
      email: "not-an-email",
      password: "short",
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(
    authenticationService.loginCalls.length,
    0,
  );

  const body = response.json<{
    error: string;
    message: string;
    requestId: string;
  }>();

  assert.equal(
    body.error,
    "VALIDATION_ERROR",
  );

  assert.equal(
    body.message,
    "Request validation failed.",
  );

  assert.ok(body.requestId);
});

test("POST /api/auth/login rejects unknown properties", async (t) => {
  const authenticationService =
    new FakeAuthenticationService();

  const app = buildApp({
    serverOptions: {
      logger: false,
    },
    authenticationService,
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: {
      email: "developer@example.com",
      password: "StrongPassword123",
      rememberMe: true,
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(
    authenticationService.loginCalls.length,
    0,
  );
});
test("POST /api/auth/refresh rotates credentials for a valid refresh token", async (t) => {
  const authenticationService =
    new FakeAuthenticationService();

  const app = buildApp({
    serverOptions: {
      logger: false,
    },
    authenticationService,
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/refresh",
    payload: {
      refreshToken: "current-refresh-token",
    },
  });

  assert.equal(response.statusCode, 200);

  assert.deepEqual(
    response.json(),
    AUTHENTICATION_RESULT,
  );

  assert.deepEqual(
    authenticationService.refreshCalls,
    [
      {
        refreshToken:
          "current-refresh-token",
      },
    ],
  );
});

test("POST /api/auth/refresh returns 401 for an invalid refresh token", async (t) => {
  const authenticationService =
    new FakeAuthenticationService({
      refreshError:
        new InvalidRefreshTokenError(),
    });

  const app = buildApp({
    serverOptions: {
      logger: false,
    },
    authenticationService,
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/refresh",
    payload: {
      refreshToken: "invalid-token",
    },
  });

  assert.equal(response.statusCode, 401);

  const body = response.json<{
    error: string;
    message: string;
    requestId: string;
  }>();

  assert.equal(
    body.error,
    "INVALID_REFRESH_TOKEN",
  );

  assert.equal(
    body.message,
    "The refresh token is invalid.",
  );

  assert.ok(body.requestId);
});

test("POST /api/auth/refresh returns 401 for an expired session", async (t) => {
  const authenticationService =
    new FakeAuthenticationService({
      refreshError:
        new SessionExpiredError(),
    });

  const app = buildApp({
    serverOptions: {
      logger: false,
    },
    authenticationService,
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/refresh",
    payload: {
      refreshToken: "expired-refresh-token",
    },
  });

  assert.equal(response.statusCode, 401);

  const body = response.json<{
    error: string;
    message: string;
    requestId: string;
  }>();

  assert.equal(
    body.error,
    "SESSION_EXPIRED",
  );

  assert.equal(
    body.message,
    "Session has expired.",
  );

  assert.ok(body.requestId);
});

test("POST /api/auth/refresh rejects an invalid request body", async (t) => {
  const authenticationService =
    new FakeAuthenticationService();

  const app = buildApp({
    serverOptions: {
      logger: false,
    },
    authenticationService,
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/refresh",
    payload: {
      refreshToken: "",
    },
  });

  assert.equal(response.statusCode, 400);

  assert.equal(
    authenticationService.refreshCalls.length,
    0,
  );

  const body = response.json<{
    error: string;
    message: string;
    requestId: string;
  }>();

  assert.equal(
    body.error,
    "VALIDATION_ERROR",
  );

  assert.equal(
    body.message,
    "Request validation failed.",
  );

  assert.ok(body.requestId);
});

test("POST /api/auth/refresh rejects unknown properties", async (t) => {
  const authenticationService =
    new FakeAuthenticationService();

  const app = buildApp({
    serverOptions: {
      logger: false,
    },
    authenticationService,
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/refresh",
    payload: {
      refreshToken:
        "current-refresh-token",
      deviceId: "unexpected-device",
    },
  });

  assert.equal(response.statusCode, 400);

  assert.equal(
    authenticationService.refreshCalls.length,
    0,
  );
});
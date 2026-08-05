import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../../../app.js";
import { EmailAlreadyRegisteredError } from "../auth.errors.js";
import type {
  AuthenticationResult,
  LoginInput,
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

class FakeAuthenticationService
  implements AuthenticationServiceContract
{
  registerCalls: RegisterInput[] = [];

  constructor(
    private readonly registerError?:
      Error,
  ) {}

  async register(
    input: RegisterInput,
  ): Promise<AuthenticationResult> {
    this.registerCalls.push(input);

    if (this.registerError) {
      throw this.registerError;
    }

    return AUTHENTICATION_RESULT;
  }

  async login(
    _input: LoginInput,
  ): Promise<AuthenticationResult> {
    throw new Error(
      "Login is not implemented by this test fake.",
    );
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
        email:
          "developer@example.com",
        password:
          "StrongPassword123",
        displayName:
          "Dev Forge",
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
    new FakeAuthenticationService(
      new EmailAlreadyRegisteredError(),
    );

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
    authenticationService.registerCalls
      .length,
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
    authenticationService.registerCalls
      .length,
    0,
  );
});
import type { FastifyPluginAsync } from "fastify";

import { EmailAlreadyRegisteredError } from "../auth.errors.js";
import {
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  SessionExpiredError,
  SessionNotFoundError,
  SessionRevokedError,
} from "../authentication.errors.js";
import type {
  LoginInput,
  RefreshInput,
  RegisterInput,
} from "../authentication.types.js";
import type { AuthenticationService } from "../services/authentication/authentication.service.js";
import { requireAuth } from "../guards/require-auth.guard.js";

export type AuthenticationServiceContract = Pick<
  AuthenticationService,
  "register" | "login" | "refresh" | "logout"
>;

export interface AuthRoutesOptions {
  authenticationService:
    AuthenticationServiceContract;
}

interface RegisterRoute {
  Body: RegisterInput;
}

interface LoginRoute {
  Body: LoginInput;
}

interface RefreshRoute {
  Body: RefreshInput;
}

const authenticationResultSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "user",
    "accessToken",
    "refreshToken",
  ],
  properties: {
    user: {
      type: "object",
      additionalProperties: false,
      required: [
        "id",
        "email",
        "displayName",
        "avatarUrl",
        "createdAt",
        "updatedAt",
      ],
      properties: {
        id: {
          type: "string",
        },
        email: {
          type: "string",
          format: "email",
        },
        displayName: {
          type: "string",
        },
        avatarUrl: {
          anyOf: [
            {
              type: "string",
            },
            {
              type: "null",
            },
          ],
        },
        createdAt: {
          type: "string",
          format: "date-time",
        },
        updatedAt: {
          type: "string",
          format: "date-time",
        },
      },
    },
    accessToken: {
      type: "string",
    },
    refreshToken: {
      type: "string",
    },
  },
} as const;

const errorResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "error",
    "message",
    "requestId",
  ],
  properties: {
    error: {
      type: "string",
    },
    message: {
      type: "string",
    },
    requestId: {
      type: "string",
    },
  },
} as const;

const registerSchema = {
  tags: ["Authentication"],
  summary: "Register a user",
  description:
    "Creates a new user account and immediately authenticates the user.",
  body: {
    type: "object",
    additionalProperties: false,
    required: [
      "email",
      "password",
      "displayName",
    ],
    properties: {
      email: {
        type: "string",
        format: "email",
        maxLength: 254,
      },
      password: {
        type: "string",
        minLength: 8,
        maxLength: 128,
      },
      displayName: {
        type: "string",
        minLength: 1,
        maxLength: 80,
        pattern: "\\S",
      },
    },
  },
  response: {
    201: authenticationResultSchema,
    400: errorResponseSchema,
    409: errorResponseSchema,
  },
} as const;

const loginSchema = {
  tags: ["Authentication"],
  summary: "Authenticate a user",
  description:
    "Authenticates an existing user and returns a new authenticated session.",
  body: {
    type: "object",
    additionalProperties: false,
    required: [
      "email",
      "password",
    ],
    properties: {
      email: {
        type: "string",
        format: "email",
        maxLength: 254,
      },
      password: {
        type: "string",
        minLength: 8,
        maxLength: 128,
      },
    },
  },
  response: {
    200: authenticationResultSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
  },
} as const;

const refreshSchema = {
  tags: ["Authentication"],
  summary: "Refresh an authenticated session",
  description:
    "Rotates a valid refresh token and returns new authentication credentials.",
  body: {
    type: "object",
    additionalProperties: false,
    required: [
      "refreshToken",
    ],
    properties: {
      refreshToken: {
        type: "string",
        minLength: 1,
        maxLength: 512,
      },
    },
  },
  response: {
    200: authenticationResultSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
  },
} as const;

const logoutSchema = {
  tags: ["Authentication"],
  summary: "Log out of the current session",
  description:
    "Revokes the session identified by the bearer access token. The session's refresh token stops working immediately; the access token itself expires on its own.",
  security: [{ bearerAuth: [] }],
  response: {
    204: {
      type: "null",
      description: "Session revoked.",
    },
    401: errorResponseSchema,
  },
} as const;

export const authRoutes: FastifyPluginAsync<
  AuthRoutesOptions
> = async (app, options) => {
  app.post<RegisterRoute>(
    "/register",
    {
      schema: registerSchema,
    },
    async (request, reply) => {
      try {
        const result =
          await options.authenticationService.register(
            request.body,
          );

        return reply.code(201).send(result);
      } catch (error) {
        if (
          error instanceof
          EmailAlreadyRegisteredError
        ) {
          return reply.code(409).send({
            error: error.code,
            message: error.message,
            requestId: request.id,
          });
        }

        throw error;
      }
    },
  );

  app.post<LoginRoute>(
    "/login",
    {
      schema: loginSchema,
    },
    async (request, reply) => {
      try {
        const result =
          await options.authenticationService.login(
            request.body,
          );

        return reply.code(200).send(result);
      } catch (error) {
        if (
          error instanceof
          InvalidCredentialsError
        ) {
          return reply.code(401).send({
            error: error.code,
            message: error.message,
            requestId: request.id,
          });
        }

        throw error;
      }
    },
  );

  app.post<RefreshRoute>(
    "/refresh",
    {
      schema: refreshSchema,
    },
    async (request, reply) => {
      try {
        const result =
          await options.authenticationService.refresh(
            request.body,
          );

        return reply.code(200).send(result);
      } catch (error) {
        if (
          error instanceof
            InvalidRefreshTokenError ||
          error instanceof
            SessionExpiredError ||
          error instanceof
            SessionNotFoundError ||
          error instanceof
            SessionRevokedError
        ) {
          return reply.code(401).send({
            error: error.code,
            message: error.message,
            requestId: request.id,
          });
        }

        throw error;
      }
    },
  );

  app.post(
    "/logout",
    {
      schema: logoutSchema,
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      // requireAuth guarantees request.auth is present here.
      const { sessionId, userId } = request.auth!;

      try {
        await options.authenticationService.logout({
          sessionId,
          userId,
        });

        return reply.code(204).send();
      } catch (error) {
        if (
          error instanceof
            SessionNotFoundError ||
          error instanceof
            SessionRevokedError ||
          error instanceof
            SessionExpiredError
        ) {
          return reply.code(401).send({
            error: error.code,
            message: error.message,
            requestId: request.id,
          });
        }

        throw error;
      }
    },
  );
};

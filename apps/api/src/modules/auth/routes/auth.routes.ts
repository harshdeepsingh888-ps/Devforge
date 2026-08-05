import type { FastifyPluginAsync } from "fastify";

import { EmailAlreadyRegisteredError } from "../auth.errors.js";
import type {
  LoginInput,
  RegisterInput,
} from "../authentication.types.js";
import type { AuthenticationService } from "../services/authentication/authentication.service.js";

export type AuthenticationServiceContract = Pick<
  AuthenticationService,
  "register" | "login"
>;

export interface AuthRoutesOptions {
  authenticationService:
    AuthenticationServiceContract;
}

interface RegisterRoute {
  Body: RegisterInput;
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
    "Creates a user account and returns a new authenticated session.",
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
};
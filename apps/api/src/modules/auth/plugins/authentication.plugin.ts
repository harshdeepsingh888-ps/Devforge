import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

import type { AccessTokenService } from "../security/jwt.service.js";
import {
  ExpiredAccessTokenError,
  InvalidAccessTokenError,
} from "../security/jwt.service.js";

import type { VerifiedAccessToken } from "../security/token.types.js";

export interface AuthenticationContext
  extends VerifiedAccessToken {}

declare module "fastify" {
  interface FastifyRequest {
    auth: AuthenticationContext | null;
  }
}

export interface AuthenticationPluginOptions {
  accessTokens: AccessTokenService;
}

const authenticationPluginImplementation:
  FastifyPluginAsync<
    AuthenticationPluginOptions
  > = async (app, options) => {
    app.decorateRequest("auth", null);

    app.addHook(
      "preHandler",
      async (request) => {
        request.auth = null;

        const authorization =
          request.headers.authorization;

        if (!authorization) {
          return;
        }

        const [scheme, token] =
          authorization.split(" ");

        if (
          scheme?.toLowerCase() !== "bearer" ||
          !token
        ) {
          return;
        }

        try {
          request.auth =
            await options.accessTokens.verify(
              token,
            );
        } catch (
          error
        ) {
          if (
            error instanceof
              InvalidAccessTokenError ||
            error instanceof
              ExpiredAccessTokenError
          ) {
            return;
          }

          throw error;
        }
      },
    );
  };

export const authenticationPlugin = fp(
  authenticationPluginImplementation,
  {
    name: "devforge-authentication",
  },
);

import type {
  FastifyPluginAsync,
} from "fastify";

import { env } from "../../config/env.js";
import { PrismaUserRepository } from "./repositories/prisma/prisma-user.repository.js";
import { PrismaSessionRepository } from "./repositories/session/prisma-session.repository.js";
import { JwtAccessTokenService } from "./security/jwt.service.js";
import { Sha256RefreshTokenService } from "./security/refresh-token.service.js";
import { AuthenticationService } from "./services/authentication/authentication.service.js";
import { Argon2PasswordService } from "./services/password.service.js";
import { RegistrationService } from "./services/registration.service.js";

export interface AuthModuleOptions {
  authenticationService?:
    AuthenticationService;
}

export const authModule:
  FastifyPluginAsync<AuthModuleOptions> =
  async (_app, options) => {
    const users =
      new PrismaUserRepository();

    const sessions =
      new PrismaSessionRepository();

    const passwords =
      new Argon2PasswordService();

    const registration =
      new RegistrationService({
        userRepository: users,
        passwordService: passwords,
      });

    const refreshTokens =
      new Sha256RefreshTokenService();

    const accessTokens =
      new JwtAccessTokenService(
        env.authentication.accessToken,
      );

    const authenticationService =
      options.authenticationService ??
      new AuthenticationService({
        users,
        passwords,
        registration,
        sessions,
        refreshTokens,
        accessTokens,
        configuration: {
          refreshTokenExpiresInSeconds:
            env.authentication
              .refreshTokenExpiresInSeconds,
        },
      });

    void authenticationService;

    // Authentication routes will be
    // registered in the next step.
  };
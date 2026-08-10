import type { AccessTokenConfiguration } from "./security/token.types.js";
import { PrismaUserRepository } from "./repositories/prisma/prisma-user.repository.js";
import { PrismaSessionRepository } from "./repositories/session/prisma-session.repository.js";
import { JwtAccessTokenService } from "./security/jwt.service.js";
import { Sha256RefreshTokenService } from "./security/refresh-token.service.js";
import { AuthenticationService } from "./services/authentication/authentication.service.js";
import { Argon2PasswordService } from "./services/password.service.js";
import { RegistrationService } from "./services/registration.service.js";

export interface AuthModuleConfiguration {
  accessToken: AccessTokenConfiguration;
  refreshTokenExpiresInSeconds: number;
}

export interface AuthenticationModule {
  authenticationService: AuthenticationService;
  accessTokenService: JwtAccessTokenService;
}

export function createAuthenticationModule(
  configuration: AuthModuleConfiguration,
): AuthenticationModule {
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

  const accessTokenService =
    new JwtAccessTokenService(
      configuration.accessToken,
    );

  const authenticationService =
    new AuthenticationService({
      users,
      passwords,
      registration,
      sessions,
      refreshTokens,
      accessTokens:
        accessTokenService,
      configuration: {
        refreshTokenExpiresInSeconds:
          configuration.refreshTokenExpiresInSeconds,
      },
    });

  return {
    authenticationService,
    accessTokenService,
  };
}

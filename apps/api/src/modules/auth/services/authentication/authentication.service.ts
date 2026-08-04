import type {
  AuthUser,
} from "../../auth.types.js";
import type {
  AuthenticationConfiguration,
  AuthenticationResult,
  LoginInput,
  RegisterInput,
} from "../../authentication.types.js";
import {
  InvalidCredentialsError,
} from "../../authentication.errors.js";
import { toPublicAuthUser } from "../../mappers/public-user.mapper.js";
import type { SessionRepository } from "../../repositories/session/session.repository.js";
import type { UserRepository } from "../../repositories/user.repository.js";
import type { AccessTokenService } from "../../security/jwt.service.js";
import type { RefreshTokenService } from "../../security/refresh-token.service.js";
import type { PasswordService } from "../password.service.js";
import type { RegistrationService } from "../registration.service.js";

export interface AuthenticationServiceDependencies {
  users: UserRepository;
  passwords: PasswordService;
  registration: RegistrationService;
  sessions: SessionRepository;
  refreshTokens: RefreshTokenService;
  accessTokens: AccessTokenService;
  configuration: AuthenticationConfiguration;
  now?: () => Date;
}

export class AuthenticationService {
  private readonly now: () => Date;

  constructor(
    private readonly dependencies: AuthenticationServiceDependencies,
  ) {
    if (
      dependencies.configuration
        .refreshTokenExpiresInSeconds <= 0
    ) {
      throw new Error(
        "Refresh-token lifetime must be greater than zero.",
      );
    }

    this.now =
      dependencies.now ??
      (() => new Date());
  }

  async register(
    input: RegisterInput,
  ): Promise<AuthenticationResult> {
    const user =
      await this.dependencies.registration.register({
        email: input.email,
        password: input.password,
        displayName: input.displayName,
      });

    return this.createAuthenticatedSession(
      user,
    );
  }

  async login(
    input: LoginInput,
  ): Promise<AuthenticationResult> {
    const email = input.email
      .trim()
      .toLowerCase();

    const user =
      await this.dependencies.users.findByEmail(
        email,
      );

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const passwordIsValid =
      await this.dependencies.passwords.verifyPassword(
        user.passwordHash,
        input.password,
      );

    if (!passwordIsValid) {
      throw new InvalidCredentialsError();
    }

    return this.createAuthenticatedSession(
      user,
    );
  }

  private async createAuthenticatedSession(
  user: AuthUser,
): Promise<AuthenticationResult> {
    const refreshToken =
      this.dependencies.refreshTokens.generate();

    const expiresAt = new Date(
      this.now().getTime() +
        this.dependencies.configuration
          .refreshTokenExpiresInSeconds *
          1_000,
    );

    const session =
      await this.dependencies.sessions.create({
        userId: user.id,
        refreshTokenHash:
          refreshToken.hash,
        expiresAt:
          expiresAt.toISOString(),
      });

    const accessToken =
      await this.dependencies.accessTokens.issue({
        userId: user.id,
        sessionId: session.id,
      });

    return {
      user: toPublicAuthUser(user),
      accessToken,
      refreshToken:
        refreshToken.token,
    };
  }
}
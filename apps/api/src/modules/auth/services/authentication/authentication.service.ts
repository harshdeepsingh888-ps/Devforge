import type {
  AuthUser,
} from "../../auth.types.js";
import type {
  AuthenticationConfiguration,
  AuthenticationResult,
  LoginInput,
  RefreshInput,
  RegisterInput,
} from "../../authentication.types.js";
import {
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  SessionExpiredError,
  SessionNotFoundError,
  SessionRevokedError,
} from "../../authentication.errors.js";
import { toPublicAuthUser } from "../../mappers/public-user.mapper.js";
import type { SessionRepository } from "../../repositories/session/session.repository.js";
import type { UserRepository } from "../../repositories/user.repository.js";
import type { AccessTokenService } from "../../security/jwt.service.js";
import type {
  RefreshTokenPair,
  RefreshTokenService,
} from "../../security/refresh-token.service.js";
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

interface AuthenticationCredentials {
  sessionId: string;
  refreshToken: RefreshTokenPair;
}

export class AuthenticationService {
  private readonly now: () => Date;

  constructor(
    private readonly dependencies:
      AuthenticationServiceDependencies,
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

    const credentials =
      await this.createSession(user.id);

    return this.issueAuthenticationResult(
      user,
      credentials,
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

    const credentials =
      await this.createSession(user.id);

    return this.issueAuthenticationResult(
      user,
      credentials,
    );
  }

  async refresh(
    input: RefreshInput,
  ): Promise<AuthenticationResult> {
    const currentRefreshTokenHash =
      this.dependencies.refreshTokens.hash(
        input.refreshToken,
      );

    const session =
      await this.dependencies.sessions
        .findByRefreshTokenHash(
          currentRefreshTokenHash,
        );

    if (!session) {
      throw new InvalidRefreshTokenError();
    }

    if (session.status === "REVOKED") {
      throw new SessionRevokedError();
    }

    const sessionHasExpired =
      session.status === "EXPIRED" ||
      new Date(session.expiresAt).getTime() <=
        this.now().getTime();

    if (sessionHasExpired) {
      if (session.status === "ACTIVE") {
        await this.dependencies.sessions.revoke(
          session.id,
        );
      }

      throw new SessionExpiredError();
    }

    if (session.status !== "ACTIVE") {
      throw new InvalidRefreshTokenError();
    }

    const user =
      await this.dependencies.users.findById(
        session.userId,
      );

    if (!user) {
      throw new SessionNotFoundError();
    }

    const nextRefreshToken =
      this.dependencies.refreshTokens.generate();

    const rotatedSession =
      await this.dependencies.sessions
        .rotateRefreshToken(
          session.id,
          currentRefreshTokenHash,
          nextRefreshToken.hash,
        );

    if (!rotatedSession) {
      throw new InvalidRefreshTokenError();
    }

    return this.issueAuthenticationResult(
      user,
      {
        sessionId: rotatedSession.id,
        refreshToken: nextRefreshToken,
      },
    );
  }

  private async createSession(
    userId: string,
  ): Promise<AuthenticationCredentials> {
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
        userId,
        refreshTokenHash:
          refreshToken.hash,
        expiresAt:
          expiresAt.toISOString(),
      });

    return {
      sessionId: session.id,
      refreshToken,
    };
  }

  private async issueAuthenticationResult(
    user: AuthUser,
    credentials: AuthenticationCredentials,
  ): Promise<AuthenticationResult> {
    const accessToken =
      await this.dependencies.accessTokens.issue({
        userId: user.id,
        sessionId:
          credentials.sessionId,
      });

    return {
      user: toPublicAuthUser(user),
      accessToken,
      refreshToken:
        credentials.refreshToken.token,
    };
  }
}
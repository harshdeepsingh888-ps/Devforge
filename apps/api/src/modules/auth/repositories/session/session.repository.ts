import type {
  AuthSession,
  CreateSessionInput,
} from "../../session.types.js";

export interface SessionRepository {
  create(
    input: CreateSessionInput,
  ): Promise<AuthSession>;

  findById(
    sessionId: string,
  ): Promise<AuthSession | null>;

  findByRefreshTokenHash(
    refreshTokenHash: string,
  ): Promise<AuthSession | null>;

  rotateRefreshToken(
    sessionId: string,
    currentRefreshTokenHash: string,
    nextRefreshTokenHash: string,
  ): Promise<AuthSession | null>;

  touch(
    sessionId: string,
  ): Promise<AuthSession | null>;

  revoke(
    sessionId: string,
  ): Promise<AuthSession | null>;

  revokeAllForUser(
    userId: string,
  ): Promise<number>;
}
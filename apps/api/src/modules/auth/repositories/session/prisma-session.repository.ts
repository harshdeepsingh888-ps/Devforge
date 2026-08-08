import type { PrismaClient } from "../../../../generated/prisma/client.js";
import { prisma } from "../../../../infrastructure/database/prisma.js";
import { toAuthSession } from "../../mappers/session.mapper.js";
import type {
  AuthSession,
  CreateSessionInput,
} from "../../session.types.js";
import type { SessionRepository } from "./session.repository.js";

type SessionDatabaseClient = Pick<
  PrismaClient,
  "session"
>;

export class PrismaSessionRepository
  implements SessionRepository
{
  constructor(
    private readonly database:
      SessionDatabaseClient = prisma,
  ) {}

  async create(
    input: CreateSessionInput,
  ): Promise<AuthSession> {
    const session =
      await this.database.session.create({
        data: {
          userId: input.userId,
          refreshTokenHash:
            input.refreshTokenHash,
          expiresAt:
            new Date(input.expiresAt),
        },
      });

    return toAuthSession(session);
  }

  async findById(
    sessionId: string,
  ): Promise<AuthSession | null> {
    const session =
      await this.database.session.findUnique({
        where: {
          id: sessionId,
        },
      });

    return session
      ? toAuthSession(session)
      : null;
  }

  async findByRefreshTokenHash(
    refreshTokenHash: string,
  ): Promise<AuthSession | null> {
    const session =
      await this.database.session.findFirst({
        where: {
          refreshTokenHash,
        },
      });

    return session
      ? toAuthSession(session)
      : null;
  }

  async rotateRefreshToken(
    sessionId: string,
    currentRefreshTokenHash: string,
    nextRefreshTokenHash: string,
  ): Promise<AuthSession | null> {
    const result =
      await this.database.session.updateMany({
        where: {
          id: sessionId,
          status: "ACTIVE",
          refreshTokenHash:
            currentRefreshTokenHash,
        },
        data: {
          refreshTokenHash:
            nextRefreshTokenHash,
          lastUsedAt: new Date(),
        },
      });

    if (result.count === 0) {
      return null;
    }

    return this.findById(sessionId);
  }

  async touch(
    sessionId: string,
  ): Promise<AuthSession | null> {
    const result =
      await this.database.session.updateMany({
        where: {
          id: sessionId,
          status: "ACTIVE",
        },
        data: {
          lastUsedAt: new Date(),
        },
      });

    if (result.count === 0) {
      return null;
    }

    return this.findById(sessionId);
  }

  async revoke(
    sessionId: string,
  ): Promise<AuthSession | null> {
    const result =
      await this.database.session.updateMany({
        where: {
          id: sessionId,
          status: "ACTIVE",
        },
        data: {
          status: "REVOKED",
          lastUsedAt: new Date(),
        },
      });

    if (result.count === 0) {
      return null;
    }

    return this.findById(sessionId);
  }

  async revokeAllForUser(
    userId: string,
  ): Promise<number> {
    const result =
      await this.database.session.updateMany({
        where: {
          userId,
          status: "ACTIVE",
        },
        data: {
          status: "REVOKED",
          lastUsedAt: new Date(),
        },
      });

    return result.count;
  }
}
import type { Session } from "../../../generated/prisma/client.js";

import type { AuthSession } from "../session.types.js";

export function toAuthSession(
  session: Session,
): AuthSession {
  return {
    id: session.id,
    userId: session.userId,
    refreshTokenHash: session.refreshTokenHash,
    status: session.status,
    expiresAt: session.expiresAt.toISOString(),
    lastUsedAt: session.lastUsedAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}
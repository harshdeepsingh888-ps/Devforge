import type { User } from "../../../generated/prisma/client.js";

import type { AuthUser } from "../auth.types.js";

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
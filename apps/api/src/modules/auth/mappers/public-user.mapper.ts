import type {
  AuthUser,
  PublicAuthUser,
} from "../auth.types.js";

export function toPublicAuthUser(
  user: AuthUser,
): PublicAuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
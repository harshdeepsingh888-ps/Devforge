export type SessionStatus =
  | "ACTIVE"
  | "REVOKED"
  | "EXPIRED";

export interface AuthSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  status: SessionStatus;
  expiresAt: string;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionInput {
  userId: string;
  refreshTokenHash: string;
  expiresAt: string;
}
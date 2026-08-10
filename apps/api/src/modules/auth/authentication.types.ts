import type { PublicAuthUser } from "./auth.types.js";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

export interface LogoutInput {
  sessionId: string;
  userId: string;
}
export interface AuthenticationResult {
  user: PublicAuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticationConfiguration {
  refreshTokenExpiresInSeconds: number;
}

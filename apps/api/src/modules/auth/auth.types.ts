export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicAuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
}

export interface RegisterUserInput {
  email: string;
  password: string;
  displayName: string;
}
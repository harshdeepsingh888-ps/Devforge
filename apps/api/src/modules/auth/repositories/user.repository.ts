import type {
  AuthUser,
  CreateUserInput,
} from "../auth.types.js";

export interface UserRepository {
  create(input: CreateUserInput): Promise<AuthUser>;

  findByEmail(email: string): Promise<AuthUser | null>;

  findById(userId: string): Promise<AuthUser | null>;
}
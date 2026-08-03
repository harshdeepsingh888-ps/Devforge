import { randomUUID } from "node:crypto";

import type {
  AuthUser,
  CreateUserInput,
} from "../../auth.types.js";
import type { UserRepository } from "../user.repository.js";

export class InMemoryUserRepository
  implements UserRepository
{
  private readonly users = new Map<string, AuthUser>();

  async create(
    input: CreateUserInput,
  ): Promise<AuthUser> {
    const timestamp = new Date().toISOString();

    const user: AuthUser = {
      id: randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      avatarUrl: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.users.set(user.id, user);

    return user;
  }

  async findByEmail(
    email: string,
  ): Promise<AuthUser | null> {
    const normalizedEmail = email.trim().toLowerCase();

    for (const user of this.users.values()) {
      if (user.email === normalizedEmail) {
        return user;
      }
    }

    return null;
  }

  async findById(
    userId: string,
  ): Promise<AuthUser | null> {
    return this.users.get(userId) ?? null;
  }
}

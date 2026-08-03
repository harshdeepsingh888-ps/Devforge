import type { PrismaClient } from "../../../../generated/prisma/client.js";
import { prisma } from "../../../../infrastructure/database/prisma.js";
import type {
  AuthUser,
  CreateUserInput,
} from "../../auth.types.js";
import type { UserRepository } from "../user.repository.js";

type UserDatabaseClient = Pick<PrismaClient, "user">;

interface PersistedUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapPersistedUser(user: PersistedUser): AuthUser {
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

export class PrismaUserRepository
  implements UserRepository
{
  constructor(
    private readonly database: UserDatabaseClient = prisma,
  ) {}

  async create(
    input: CreateUserInput,
  ): Promise<AuthUser> {
    const user = await this.database.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        displayName: input.displayName,
      },
    });

    return mapPersistedUser(user);
  }

  async findByEmail(
    email: string,
  ): Promise<AuthUser | null> {
    const user = await this.database.user.findUnique({
      where: {
        email,
      },
    });

    return user ? mapPersistedUser(user) : null;
  }

  async findById(
    userId: string,
  ): Promise<AuthUser | null> {
    const user = await this.database.user.findUnique({
      where: {
        id: userId,
      },
    });

    return user ? mapPersistedUser(user) : null;
  }
}
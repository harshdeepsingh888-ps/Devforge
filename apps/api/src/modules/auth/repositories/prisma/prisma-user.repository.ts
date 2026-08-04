import type { PrismaClient } from "../../../../generated/prisma/client.js";
import { prisma } from "../../../../infrastructure/database/prisma.js";
import type {
  AuthUser,
  CreateUserInput,
} from "../../auth.types.js";
import { toAuthUser } from "../../mappers/user.mapper.js";
import type { UserRepository } from "../user.repository.js";

type UserDatabaseClient = Pick<PrismaClient, "user">;

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

    return toAuthUser(user);
  }

  async findByEmail(
    email: string,
  ): Promise<AuthUser | null> {
    const user = await this.database.user.findUnique({
      where: {
        email,
      },
    });

    return user ? toAuthUser(user) : null;
  }

  async findById(
    userId: string,
  ): Promise<AuthUser | null> {
    const user = await this.database.user.findUnique({
      where: {
        id: userId,
      },
    });

    return user ? toAuthUser(user) : null;
  }
}
import type {
  AuthUser,
  RegisterUserInput,
} from "../auth.types.js";
import { EmailAlreadyRegisteredError } from "../auth.errors.js";
import type { UserRepository } from "../repositories/user.repository.js";
import type { PasswordService } from "./password.service.js";

export interface RegistrationServiceDependencies {
  userRepository: UserRepository;
  passwordService: PasswordService;
}

export class RegistrationService {
  constructor(
    private readonly dependencies: RegistrationServiceDependencies,
  ) {}

  async register(
    input: RegisterUserInput,
  ): Promise<AuthUser> {
    const email = input.email.trim().toLowerCase();
    const displayName = input.displayName.trim();

    const existingUser =
      await this.dependencies.userRepository.findByEmail(
        email,
      );

    if (existingUser) {
      throw new EmailAlreadyRegisteredError();
    }

    const passwordHash =
      await this.dependencies.passwordService.hashPassword(
        input.password,
      );

    const user =
      await this.dependencies.userRepository.create({
        email,
        passwordHash,
        displayName,
      });

    return user;
  }
}
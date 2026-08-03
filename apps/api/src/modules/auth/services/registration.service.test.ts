import assert from "node:assert/strict";
import test from "node:test";

import { EmailAlreadyRegisteredError } from "../auth.errors.js";
import { InMemoryUserRepository } from "../repositories/in-memory-user.repository.js";
import type { PasswordService } from "./password.service.js";
import { RegistrationService } from "./registration.service.js";

class FakePasswordService implements PasswordService {
  hashCalls: string[] = [];

  async hashPassword(password: string): Promise<string> {
    this.hashCalls.push(password);

    return `hashed:${password}`;
  }

  async verifyPassword(): Promise<boolean> {
    return false;
  }
}

test("register normalizes user details and returns a safe user", async () => {
  const userRepository = new InMemoryUserRepository();
  const passwordService = new FakePasswordService();

  const service = new RegistrationService({
    userRepository,
    passwordService,
  });

  const user = await service.register({
    email: "  DEVELOPER@EXAMPLE.COM  ",
    password: "StrongPassword123",
    displayName: "  Dev Forge  ",
  });

  assert.equal(user.email, "developer@example.com");
  assert.equal(user.displayName, "Dev Forge");
  assert.equal(user.avatarUrl, null);

  assert.equal(
    "passwordHash" in user,
    false,
  );
});

test("register hashes the password before storing the user", async () => {
  const userRepository = new InMemoryUserRepository();
  const passwordService = new FakePasswordService();

  const service = new RegistrationService({
    userRepository,
    passwordService,
  });

  await service.register({
    email: "developer@example.com",
    password: "StrongPassword123",
    displayName: "Dev Forge",
  });

  const storedUser =
    await userRepository.findByEmail(
      "developer@example.com",
    );

  assert.ok(storedUser);
  assert.equal(
    storedUser.passwordHash,
    "hashed:StrongPassword123",
  );

  assert.deepEqual(passwordService.hashCalls, [
    "StrongPassword123",
  ]);
});

test("register rejects an email that is already registered", async () => {
  const userRepository = new InMemoryUserRepository();
  const passwordService = new FakePasswordService();

  await userRepository.create({
    email: "developer@example.com",
    passwordHash: "existing-hash",
    displayName: "Existing User",
  });

  const service = new RegistrationService({
    userRepository,
    passwordService,
  });

  await assert.rejects(
    service.register({
      email: "  DEVELOPER@EXAMPLE.COM ",
      password: "StrongPassword123",
      displayName: "Dev Forge",
    }),
    EmailAlreadyRegisteredError,
  );
});

test("register does not hash the password when the email already exists", async () => {
  const userRepository = new InMemoryUserRepository();
  const passwordService = new FakePasswordService();

  await userRepository.create({
    email: "developer@example.com",
    passwordHash: "existing-hash",
    displayName: "Existing User",
  });

  const service = new RegistrationService({
    userRepository,
    passwordService,
  });

  await assert.rejects(
    service.register({
      email: "developer@example.com",
      password: "StrongPassword123",
      displayName: "Dev Forge",
    }),
    EmailAlreadyRegisteredError,
  );

  assert.deepEqual(passwordService.hashCalls, []);
});
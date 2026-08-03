import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryUserRepository } from "./in-memory-user.repository.js";

test("create stores and returns a user", async () => {
  const repository = new InMemoryUserRepository();

  const user = await repository.create({
    email: "developer@example.com",
    passwordHash: "secure-password-hash",
    displayName: "Dev Forge",
  });

  assert.ok(user.id);
  assert.equal(user.email, "developer@example.com");
  assert.equal(user.passwordHash, "secure-password-hash");
  assert.equal(user.displayName, "Dev Forge");
  assert.equal(user.avatarUrl, null);
  assert.equal(user.createdAt, user.updatedAt);
});

test("findByEmail returns a matching user", async () => {
  const repository = new InMemoryUserRepository();

  const createdUser = await repository.create({
    email: "developer@example.com",
    passwordHash: "secure-password-hash",
    displayName: "Dev Forge",
  });

  const user = await repository.findByEmail(
    "developer@example.com",
  );

  assert.deepEqual(user, createdUser);
});

test("findByEmail normalizes the lookup email", async () => {
  const repository = new InMemoryUserRepository();

  const createdUser = await repository.create({
    email: "developer@example.com",
    passwordHash: "secure-password-hash",
    displayName: "Dev Forge",
  });

  const user = await repository.findByEmail(
    "  DEVELOPER@EXAMPLE.COM  ",
  );

  assert.deepEqual(user, createdUser);
});

test("findByEmail returns null for an unknown email", async () => {
  const repository = new InMemoryUserRepository();

  const user = await repository.findByEmail(
    "unknown@example.com",
  );

  assert.equal(user, null);
});

test("findById returns a matching user", async () => {
  const repository = new InMemoryUserRepository();

  const createdUser = await repository.create({
    email: "developer@example.com",
    passwordHash: "secure-password-hash",
    displayName: "Dev Forge",
  });

  const user = await repository.findById(
    createdUser.id,
  );

  assert.deepEqual(user, createdUser);
});

test("findById returns null for an unknown user", async () => {
  const repository = new InMemoryUserRepository();

  const user = await repository.findById(
    "unknown-user-id",
  );

  assert.equal(user, null);
});
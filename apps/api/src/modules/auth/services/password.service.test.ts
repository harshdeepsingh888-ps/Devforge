import assert from "node:assert/strict";
import test from "node:test";

import { Argon2PasswordService } from "./password.service.js";

test("hashPassword never returns the plaintext password", async () => {
  const service = new Argon2PasswordService();

  const password =
    "Correct horse battery staple";

  const passwordHash =
    await service.hashPassword(password);

  assert.notEqual(passwordHash, password);

  assert.ok(passwordHash.startsWith("$argon2id$"));
});

test("verifyPassword accepts the correct password", async () => {
  const service = new Argon2PasswordService();

  const password =
    "Correct horse battery staple";

  const passwordHash =
    await service.hashPassword(password);

  const isValid =
    await service.verifyPassword(
      passwordHash,
      password,
    );

  assert.equal(isValid, true);
});

test("verifyPassword rejects an incorrect password", async () => {
  const service = new Argon2PasswordService();

  const passwordHash =
    await service.hashPassword(
      "Correct horse battery staple",
    );

  const isValid =
    await service.verifyPassword(
      passwordHash,
      "Wrong password",
    );

  assert.equal(isValid, false);
});

test("equal passwords receive different salted hashes", async () => {
  const service = new Argon2PasswordService();

  const password =
    "Correct horse battery staple";

  const firstHash =
    await service.hashPassword(password);

  const secondHash =
    await service.hashPassword(password);

  assert.notEqual(firstHash, secondHash);
});
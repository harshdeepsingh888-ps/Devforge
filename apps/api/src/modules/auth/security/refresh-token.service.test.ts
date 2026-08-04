import assert from "node:assert/strict";
import test from "node:test";

import { Sha256RefreshTokenService } from "./refresh-token.service.js";

test("generate returns a token and its hash", () => {
  const service = new Sha256RefreshTokenService();

  const pair = service.generate();

  assert.ok(pair.token.length > 0);
  assert.ok(pair.hash.length > 0);
  assert.notEqual(pair.token, pair.hash);
});

test("hash is deterministic", () => {
  const service = new Sha256RefreshTokenService();

  const hash1 = service.hash("devforge-token");
  const hash2 = service.hash("devforge-token");

  assert.equal(hash1, hash2);
});

test("verify accepts a valid token", () => {
  const service = new Sha256RefreshTokenService();

  const pair = service.generate();

  assert.equal(
    service.verify(pair.token, pair.hash),
    true,
  );
});

test("verify rejects an invalid token", () => {
  const service = new Sha256RefreshTokenService();

  const pair = service.generate();

  assert.equal(
    service.verify(
      "different-token",
      pair.hash,
    ),
    false,
  );
});

test("generate creates unique refresh tokens", () => {
  const service = new Sha256RefreshTokenService();

  const first = service.generate();
  const second = service.generate();

  assert.notEqual(first.token, second.token);
  assert.notEqual(first.hash, second.hash);
});
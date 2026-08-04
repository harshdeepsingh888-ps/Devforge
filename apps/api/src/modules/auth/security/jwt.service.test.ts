import assert from "node:assert/strict";
import test from "node:test";

import jwt from "jsonwebtoken";

import {
  ExpiredAccessTokenError,
  InvalidAccessTokenError,
  JwtAccessTokenService,
} from "./jwt.service.js";

const configuration = {
  secret:
    "devforge-access-token-test-secret-32-bytes-minimum",
  issuer: "devforge-api",
  audience: "devforge-web",
  expiresInSeconds: 900,
};

test("issue and verify preserve authenticated identity", async () => {
  const service =
    new JwtAccessTokenService(configuration);

  const token = await service.issue({
    userId: "user-123",
    sessionId: "session-456",
  });

  const identity = await service.verify(token);

  assert.deepEqual(identity, {
    userId: "user-123",
    sessionId: "session-456",
  });
});

test("verify rejects a token signed with another secret", async () => {
  const service =
    new JwtAccessTokenService(configuration);

  const token = jwt.sign(
    {
      sid: "session-456",
      tokenType: "access",
    },
    "different-secret-that-is-also-long-enough-123",
    {
      algorithm: "HS256",
      audience: configuration.audience,
      issuer: configuration.issuer,
      subject: "user-123",
      expiresIn: 900,
    },
  );

  await assert.rejects(
    service.verify(token),
    InvalidAccessTokenError,
  );
});

test("verify rejects a token for another audience", async () => {
  const service =
    new JwtAccessTokenService(configuration);

  const token = jwt.sign(
    {
      sid: "session-456",
      tokenType: "access",
    },
    configuration.secret,
    {
      algorithm: "HS256",
      audience: "another-application",
      issuer: configuration.issuer,
      subject: "user-123",
      expiresIn: 900,
    },
  );

  await assert.rejects(
    service.verify(token),
    InvalidAccessTokenError,
  );
});

test("verify rejects a token with the wrong token type", async () => {
  const service =
    new JwtAccessTokenService(configuration);

  const token = jwt.sign(
    {
      sid: "session-456",
      tokenType: "refresh",
    },
    configuration.secret,
    {
      algorithm: "HS256",
      audience: configuration.audience,
      issuer: configuration.issuer,
      subject: "user-123",
      expiresIn: 900,
    },
  );

  await assert.rejects(
    service.verify(token),
    InvalidAccessTokenError,
  );
});

test("verify reports an expired access token", async () => {
  const service =
    new JwtAccessTokenService(configuration);

  const token = jwt.sign(
    {
      sid: "session-456",
      tokenType: "access",
    },
    configuration.secret,
    {
      algorithm: "HS256",
      audience: configuration.audience,
      issuer: configuration.issuer,
      subject: "user-123",
      expiresIn: -1,
    },
  );

  await assert.rejects(
    service.verify(token),
    ExpiredAccessTokenError,
  );
});

test("constructor rejects a weak signing secret", () => {
  assert.throws(
    () =>
      new JwtAccessTokenService({
        ...configuration,
        secret: "too-short",
      }),
    /at least 32 bytes/,
  );
});
import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";

import { requireAuth } from "./require-auth.guard.js";

test("requireAuth rejects request with 401 when request.auth is null", async (t) => {
  const app = Fastify();

  app.decorateRequest("auth", null);
  app.get("/protected", { preHandler: requireAuth }, async () => ({
    secretData: "visible",
  }));

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/protected",
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, "UNAUTHORIZED");
});

test("requireAuth permits request when request.auth is populated", async (t) => {
  const app = Fastify();

  app.decorateRequest("auth", null);
  app.addHook("onRequest", async (request) => {
    request.auth = {
      userId: "user-123",
      sessionId: "session-456",
    };
  });

  app.get("/protected", { preHandler: requireAuth }, async (request) => ({
    userId: request.auth?.userId,
  }));

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/protected",
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().userId, "user-123");
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  API_BODY_LIMIT_BYTES,
  buildApp,
} from "./app.js";
import { InMemoryProjectRepository } from "./modules/projects/project.repository.js";

test("GET /health returns the API health status", async (t) => {
  const app = buildApp({
    serverOptions: {
      logger: false,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/health",
  });

  assert.equal(response.statusCode, 200);

  const body = response.json<{
    status: string;
    service: string;
    timestamp: string;
  }>();

  assert.equal(body.status, "ok");
  assert.equal(body.service, "devforge-api");
  assert.equal(
    Number.isNaN(Date.parse(body.timestamp)),
    false,
  );
});

test("validation errors return a safe standardized response", async (t) => {
  const app = buildApp({
    serverOptions: {
      logger: false,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/projects",
    payload: {
      name: "DevForge",
      unexpectedField: true,
    },
  });

  assert.equal(response.statusCode, 400);

  const body = response.json<{
    error: string;
    message: string;
    requestId: string;
  }>();

  assert.equal(body.error, "VALIDATION_ERROR");
  assert.equal(
    body.message,
    "Request validation failed.",
  );
  assert.ok(body.requestId);
});

test("unexpected repository errors return a safe 500 response", async (t) => {
  class FailingProjectRepository extends InMemoryProjectRepository {
    override async findAll(): Promise<never> {
      throw new Error(
        "Database connection failed: secret-value",
      );
    }
  }

  const app = buildApp({
    serverOptions: {
      logger: false,
    },
    projectRepository: new FailingProjectRepository(),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/projects",
  });

  assert.equal(response.statusCode, 500);

  const body = response.json<{
    error: string;
    message: string;
    requestId: string;
  }>();

  assert.equal(
    body.error,
    "INTERNAL_SERVER_ERROR",
  );
  assert.equal(
    body.message,
    "An unexpected error occurred.",
  );
  assert.ok(body.requestId);

  assert.equal(
    response.body.includes("secret-value"),
    false,
  );

  assert.equal(
    response.body.includes(
      "Database connection failed",
    ),
    false,
  );
});
test("responses include defensive security headers", async (t) => {
  const app = buildApp({
    serverOptions: {
      logger: false,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/health",
  });

  assert.equal(response.statusCode, 200);
  assert.equal(
    response.headers["x-content-type-options"],
    "nosniff",
  );
  assert.equal(
    response.headers["x-frame-options"],
    "SAMEORIGIN",
  );
  assert.ok(response.headers["content-security-policy"]);
  assert.ok(response.headers["referrer-policy"]);
});

test("oversized request bodies return a safe 413 response", async (t) => {
  const app = buildApp({
    serverOptions: {
      logger: false,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const oversizedName = "a".repeat(
    API_BODY_LIMIT_BYTES + 1,
  );

  const response = await app.inject({
    method: "POST",
    url: "/api/projects",
    payload: {
      name: oversizedName,
    },
  });

  assert.equal(response.statusCode, 413);

  const body = response.json<{
    error: string;
    message: string;
    requestId: string;
  }>();

  assert.equal(body.error, "PAYLOAD_TOO_LARGE");
  assert.equal(
    body.message,
    "Request payload exceeds the allowed size.",
  );
  assert.ok(body.requestId);

  assert.equal(
    response.body.includes(oversizedName),
    false,
  );
});

test("GET /ready returns the API readiness status", async () => {
  const app = buildApp();

  const response = await app.inject({
    method: "GET",
    url: "/ready",
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: "ready",
  });

  await app.close();
});
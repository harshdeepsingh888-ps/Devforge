import assert from "node:assert/strict";
import test from "node:test";

import {
  API_BODY_LIMIT_BYTES,
  buildApp,
} from "./app.js";
import { InMemoryProjectRepository } from "./modules/projects/project.repository.js";
import { InMemoryWorkspaceRepository } from "./modules/workspaces/repositories/memory/in-memory-workspace.repository.js";
import { WorkspaceService } from "./modules/workspaces/services/workspace.service.js";

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
  assert.equal(
    typeof response.json<{ timestamp: string }>().timestamp,
    "string",
  );
  assert.deepEqual(response.json(), {
    status: "ok",
    service: "devforge-api",
    timestamp: response.json<{ timestamp: string }>().timestamp,
  });
});

test("rejects request bodies exceeding the maximum payload limit", async (t) => {
  const app = buildApp({
    serverOptions: {
      logger: false,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const largeBody = "x".repeat(API_BODY_LIMIT_BYTES + 1);

  const response = await app.inject({
    method: "POST",
    url: "/api/workspaces",
    headers: {
      "content-type": "application/json",
      "x-user-id": "user-1",
    },
    payload: `{"name":"${largeBody}"}`,
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
});

test("formats schema validation errors into a predictable response structure", async (t) => {
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
    url: "/api/workspaces",
    headers: {
      "content-type": "application/json",
      "x-user-id": "user-1",
    },
    payload: {},
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
    override async findAllByWorkspaceId(): Promise<never> {
      throw new Error(
        "Database connection failed: secret-value",
      );
    }
  }

  const workspaceRepository = new InMemoryWorkspaceRepository();
  const workspaceService = new WorkspaceService(workspaceRepository);

  const app = buildApp({
    serverOptions: {
      logger: false,
    },
    projectRepository: new FailingProjectRepository(),
    workspaceRepository,
    workspaceService,
  });

  t.after(async () => {
    await app.close();
  });

  const workspace = await workspaceService.createWorkspace({
    name: "DevForge",
    creatorUserId: "user-1",
  });

  const response = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspace.id}/projects`,
    headers: { "x-user-id": "user-1" },
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
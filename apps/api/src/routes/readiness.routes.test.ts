import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";

function createApp(options: Parameters<typeof buildApp>[0] = {}) {
  return buildApp({
    serverOptions: { logger: false },
    ...options,
  });
}

test("GET /ready without a database check only reports that the process is up", async (t) => {
  const app = createApp();
  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({ method: "GET", url: "/ready" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: "ready" });
});

test("GET /ready answers 200 when the database check succeeds", async (t) => {
  let calls = 0;
  const app = createApp({
    readinessCheck: async () => {
      calls += 1;
    },
  });
  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({ method: "GET", url: "/ready" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: "ready" });
  assert.equal(calls, 1);
});

test("GET /ready answers 503 and reveals nothing when the database check fails", async (t) => {
  const app = createApp({
    readinessCheck: async () => {
      throw new Error(
        "connect ECONNREFUSED 10.0.3.17:5432 for user devforge_prod password=hunter2",
      );
    },
  });
  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({ method: "GET", url: "/ready" });

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), { status: "unavailable" });

  // The driver's message names a host, a user and a password. None of it may
  // reach a public probe.
  for (const secret of ["ECONNREFUSED", "10.0.3.17", "devforge_prod", "hunter2"]) {
    assert.equal(response.body.includes(secret), false, `response leaked "${secret}"`);
  }
});

test("GET /ready answers 503 within the timeout when the database never answers", async (t) => {
  const app = createApp({
    readinessCheck: () => new Promise<void>(() => {}),
    readinessTimeoutMs: 50,
  });
  t.after(async () => {
    await app.close();
  });

  const startedAt = Date.now();
  const response = await app.inject({ method: "GET", url: "/ready" });
  const elapsedMs = Date.now() - startedAt;

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), { status: "unavailable" });
  assert.ok(elapsedMs < 1_000, `took ${elapsedMs}ms, expected about 50ms`);
});

test("a fast successful check does not leave its timeout timer running", async (t) => {
  // If the timer were not cleared, this 60 second timeout would keep the test
  // process alive for a minute after the last test finished. The suite finishing
  // quickly is the assertion.
  const app = createApp({
    readinessCheck: async () => {},
    readinessTimeoutMs: 60_000,
  });
  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({ method: "GET", url: "/ready" });

  assert.equal(response.statusCode, 200);
});

test("GET /health is liveness only: it never calls the database check", async (t) => {
  let calls = 0;
  const app = createApp({
    readinessCheck: async () => {
      calls += 1;
      throw new Error("database is down");
    },
  });
  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({ method: "GET", url: "/health" });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().status, "ok");
  assert.equal(calls, 0);
});

import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "./app.js";

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
  assert.equal(Number.isNaN(Date.parse(body.timestamp)), false);
});

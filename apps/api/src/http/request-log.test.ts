import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import { pathOnly } from "./path-only.js";

function captureLogs(): { lines: string[]; stream: { write(line: string): void } } {
  const lines: string[] = [];

  return { lines, stream: { write: (line: string) => lines.push(line) } };
}

async function requestLog(
  options: { logClientAddress?: boolean },
  url: string,
  headers: Record<string, string> = {},
): Promise<{ all: string; completed: Record<string, unknown> }> {
  const { lines, stream } = captureLogs();
  const app = buildApp({
    serverOptions: { logger: { level: "info", stream } },
    ...options,
  });

  try {
    await app.ready();
    await app.inject({ method: "GET", url, headers });
  } finally {
    await app.close();
  }

  const completed = lines
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .find((entry) => entry.msg === "Request completed");

  assert.ok(completed, "a 'Request completed' log line was written");

  return { all: lines.join(""), completed };
}

test("pathOnly drops the query string and keeps the path", () => {
  assert.equal(pathOnly("/"), "/");
  assert.equal(pathOnly("/?invite=abc"), "/");
  assert.equal(pathOnly("/api/workspaces?limit=5&x=y"), "/api/workspaces");
  assert.equal(pathOnly("/a/b?"), "/a/b");
});

test("request logs never contain the query string, so an invite token is not logged", async () => {
  const { all, completed } = await requestLog({}, "/health?invite=SECRET-INVITE-TOKEN");

  assert.equal(completed.url, "/health");
  assert.ok(!all.includes("SECRET-INVITE-TOKEN"), "the token was written to the log");
});

test("client address is not logged unless asked for", async () => {
  const { completed } = await requestLog({}, "/health", { "x-forwarded-for": "203.0.113.9" });

  assert.equal("ip" in completed, false);
  assert.equal("forwardedFor" in completed, false);
});

test("with logClientAddress the resolved address and the raw header are logged", async () => {
  const { completed } = await requestLog({ logClientAddress: true }, "/health", {
    "x-forwarded-for": "203.0.113.9, 198.51.100.4",
  });

  assert.equal(typeof completed.ip, "string");
  assert.equal(completed.forwardedFor, "203.0.113.9, 198.51.100.4");
});

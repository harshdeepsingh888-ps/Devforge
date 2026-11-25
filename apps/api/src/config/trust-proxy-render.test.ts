import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";

// The chain measured on the first Render deploy, with documentation addresses
// in place of the real ones (RFC 5737). A request arrived with
//   X-Forwarded-For: <forged by the caller>, <client>, <Cloudflare>, <Render>
// and a socket peer of 127.0.0.1, so three proxies sit in front of the app.
const SOCKET_PEER = "127.0.0.1";
const FORGED = "203.0.113.99";
const CLIENT = "198.51.100.7";
const CLOUDFLARE = "172.71.0.10";
const RENDER = "10.24.0.5";
const FORWARDED_FOR = `${FORGED}, ${CLIENT}, ${CLOUDFLARE}, ${RENDER}`;

async function loggedAddress(trustProxy: false | number): Promise<unknown> {
  const lines: string[] = [];
  const app = buildApp({
    serverOptions: {
      trustProxy,
      logger: { level: "info", stream: { write: (line: string) => lines.push(line) } },
    },
    logClientAddress: true,
  });

  try {
    await app.ready();
    await app.inject({
      method: "GET",
      url: "/health",
      remoteAddress: SOCKET_PEER,
      headers: { "x-forwarded-for": FORWARDED_FOR },
    });
  } finally {
    await app.close();
  }

  const completed = lines
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .find((entry) => entry.msg === "Request completed");

  assert.ok(completed, "a 'Request completed' line was logged");

  return completed.ip;
}

test("TRUST_PROXY=3 resolves the measured Render chain to the real client", async () => {
  assert.equal(await loggedAddress(3), CLIENT);
});

test("a lower count would leave every visitor behind the same proxy address", async () => {
  assert.equal(await loggedAddress(2), CLOUDFLARE);
  assert.equal(await loggedAddress(1), RENDER);
  assert.equal(await loggedAddress(false), SOCKET_PEER);
});

test("a higher count would let the caller pick its own address", async () => {
  assert.equal(await loggedAddress(4), FORGED);
});

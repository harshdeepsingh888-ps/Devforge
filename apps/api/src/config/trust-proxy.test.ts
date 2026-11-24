import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import { parseTrustProxy } from "./trust-proxy.js";

test("TRUST_PROXY unset, empty, 0 or false means no proxy", () => {
  for (const value of [undefined, "", "  ", "0", "false", "FALSE"]) {
    assert.equal(parseTrustProxy(value), false, `value: ${String(value)}`);
  }
});

test("TRUST_PROXY accepts a hop count", () => {
  assert.equal(parseTrustProxy("1"), 1);
  assert.equal(parseTrustProxy(" 2 "), 2);
  assert.equal(parseTrustProxy("10"), 10);
});

test("TRUST_PROXY refuses anything that would trust a client-controlled header", () => {
  for (const value of ["true", "yes", "-1", "1.5", "100", "loopback", "10.0.0.0/8", "1,2"]) {
    assert.throws(() => parseTrustProxy(value), /TRUST_PROXY/, `value: ${value}`);
  }
});

async function exhaustRateLimit(
  trustProxy: false | number,
  forwardedFor: (index: number) => string,
): Promise<number[]> {
  const app = buildApp({ serverOptions: { logger: false, trustProxy } });
  await app.ready();

  const statuses: number[] = [];

  for (let index = 0; index < 101; index += 1) {
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { "x-forwarded-for": forwardedFor(index) },
    });

    statuses.push(response.statusCode);
  }

  await app.close();

  return statuses;
}

test("with one trusted proxy, rotating the client-supplied part of X-Forwarded-For does not reset the rate limit", async () => {
  // The proxy appends the real client address on the right. Everything to the
  // left of it is attacker-controlled and must not choose the bucket.
  const statuses = await exhaustRateLimit(1, (index) => `10.9.${index}.1, 203.0.113.7`);

  assert.equal(statuses[99], 200);
  assert.equal(statuses[100], 429);
});

test("with one trusted proxy, different real clients get separate buckets", async () => {
  const statuses = await exhaustRateLimit(1, (index) => `203.0.113.${index + 1}`);

  assert.ok(statuses.every((status) => status === 200));
});

test("with no trusted proxy, X-Forwarded-For is ignored entirely", async () => {
  const statuses = await exhaustRateLimit(false, (index) => `198.51.100.${index + 1}`);

  assert.equal(statuses[100], 429);
});

// Smoke test for a running DevForge API: the built server, the container image,
// and later a freshly deployed release.
//
//   node scripts/smoke.mjs [baseUrl] [--write] [--wait=<seconds>]
//
// By default it only reads: /health and /ready. Pass --write to also register a
// throwaway user and walk the real auth path (register, login, an authenticated
// request, logout). That exercises password hashing, token signing and the
// database, which is where a broken build artifact usually fails. --write
// creates a user, so never point it at a database you care about.

import { randomBytes } from "node:crypto";

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--") && !arg.includes("=")));
const baseUrl = (args.find((arg) => !arg.startsWith("--")) ?? "http://127.0.0.1:5000").replace(/\/+$/, "");
const waitSeconds = Number(
  args.find((arg) => arg.startsWith("--wait="))?.split("=")[1] ?? "30",
);
const write = flags.has("--write");

function fail(message) {
  console.error(`FAIL  ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`ok    ${message}`);
}

async function request(method, path, { token, body } = {}) {
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    fail(`${method} ${path} did not answer: ${error instanceof Error ? error.message : error}`);
  }

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON body; leave json as null.
  }
  return { status: response.status, json };
}

function expectStatus(label, result, expected) {
  if (result.status !== expected) {
    fail(`${label}: expected HTTP ${expected}, got ${result.status} ${JSON.stringify(result.json)}`);
  }
  pass(`${label} -> ${expected}`);
}

// Wait for the process to start listening. A crash on boot shows up here.
async function waitForHealth() {
  const deadline = Date.now() + waitSeconds * 1000;
  let lastError = "no response";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2_000) });
      if (response.status === 200) {
        pass(`GET /health -> 200 (${baseUrl})`);
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  fail(`the API did not become healthy within ${waitSeconds}s (${lastError})`);
}

await waitForHealth();

const ready = await request("GET", "/ready");
expectStatus("GET /ready", ready, 200);

if (!write) {
  console.log("Read-only smoke test passed. Add --write to exercise registration and login.");
  process.exit(0);
}

const email = `smoke-${Date.now()}-${randomBytes(3).toString("hex")}@devforge.test`;
const password = randomBytes(18).toString("base64url");

const registered = await request("POST", "/api/auth/register", {
  body: { email, password, displayName: "Smoke Test" },
});
expectStatus("POST /api/auth/register", registered, 201);

const loggedIn = await request("POST", "/api/auth/login", { body: { email, password } });
expectStatus("POST /api/auth/login", loggedIn, 200);

const token = loggedIn.json?.accessToken;
if (typeof token !== "string" || token.length === 0) {
  fail("login did not return an access token");
}

const workspaces = await request("GET", "/api/workspaces", { token });
expectStatus("GET /api/workspaces (authenticated)", workspaces, 200);
if (!Array.isArray(workspaces.json?.data)) {
  fail("GET /api/workspaces did not return a data array");
}

const loggedOut = await request("POST", "/api/auth/logout", { token });
expectStatus("POST /api/auth/logout", loggedOut, 204);

console.log("Smoke test passed, including the write path.");

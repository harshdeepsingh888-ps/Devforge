// Smoke test for a running DevForge API: the built server, the container image,
// and later a freshly deployed release.
//
//   node scripts/smoke.mjs [baseUrl] [--write] [--web] [--wait=<seconds>]
//
// By default it only reads: /health and /ready. Pass --write to also register a
// throwaway user and walk the real auth path (register, login, an authenticated
// request, logout). That exercises password hashing, token signing and the
// database, which is where a broken build artifact usually fails. --write
// creates a user, so never point it at a database you care about.
//
// --web additionally checks that the API is serving the built web app: the page,
// a fingerprinted asset with its long cache lifetime, a client-side route, and
// that unknown API paths and missing files are still 404s rather than HTML. It
// only reads, so it is safe against a live deployment.
//
// --expect-database-down checks the opposite case against a server started with
// an unreachable database: the process must stay alive (/health 200) while
// /ready answers 503 and reveals nothing beyond its status.

import { randomBytes } from "node:crypto";

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--") && !arg.includes("=")));
const baseUrl = (args.find((arg) => !arg.startsWith("--")) ?? "http://127.0.0.1:5000").replace(/\/+$/, "");
const waitSeconds = Number(
  args.find((arg) => arg.startsWith("--wait="))?.split("=")[1] ?? "30",
);
const write = flags.has("--write");
const expectDatabaseDown = flags.has("--expect-database-down");
const checkWeb = flags.has("--web");

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

async function rawGet(path) {
  try {
    const response = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(10_000) });
    return { status: response.status, headers: response.headers, text: await response.text() };
  } catch (error) {
    return fail(`GET ${path} did not answer: ${error instanceof Error ? error.message : error}`);
  }
}

function expectThat(condition, message) {
  if (!condition) {
    fail(message);
  }
  pass(message);
}

async function checkWebApp() {
  const page = await rawGet("/");
  expectThat(page.status === 200, "GET / -> 200");
  expectThat(/text\/html/.test(page.headers.get("content-type") ?? ""), "GET / is HTML");
  expectThat(page.text.includes('id="root"'), "GET / is the app (has the root element)");
  expectThat(page.headers.get("cache-control") === "no-cache", "the page is not cached");
  expectThat(
    /script-src 'self'/.test(page.headers.get("content-security-policy") ?? ""),
    "the page carries a Content-Security-Policy",
  );
  expectThat(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(page.text), "the page has no inline script");

  const assetPath = /<script[^>]*\ssrc="(\/assets\/[^"]+\.js)"/.exec(page.text)?.[1];
  if (!assetPath) {
    fail("the page does not reference a script under /assets/");
  }
  const asset = await rawGet(assetPath);
  expectThat(asset.status === 200, `GET ${assetPath} -> 200`);
  expectThat(/javascript/.test(asset.headers.get("content-type") ?? ""), "the script is served as JavaScript");
  expectThat(/immutable/.test(asset.headers.get("cache-control") ?? ""), "the script is cached as immutable");

  const theme = await rawGet("/theme-init.js");
  expectThat(theme.status === 200 && /javascript/.test(theme.headers.get("content-type") ?? ""), "GET /theme-init.js is JavaScript");

  const route = await rawGet("/projects/does-not-exist");
  expectThat(route.status === 200 && route.text.includes('id="root"'), "a client-side route gets the app");

  const unknownApi = await rawGet("/api/this-route-does-not-exist");
  expectThat(
    unknownApi.status === 404 && /application\/json/.test(unknownApi.headers.get("content-type") ?? ""),
    "an unknown /api path is a JSON 404, not the app",
  );

  const missing = await rawGet("/assets/missing-file.js");
  expectThat(missing.status === 404 && !missing.text.includes('id="root"'), "a missing asset is a 404, not the app");
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

if (expectDatabaseDown) {
  const down = await request("GET", "/ready");
  expectStatus("GET /ready with the database unreachable", down, 503);

  if (JSON.stringify(down.json) !== JSON.stringify({ status: "unavailable" })) {
    fail(`/ready revealed more than its status: ${JSON.stringify(down.json)}`);
  }
  pass("/ready body reveals nothing beyond its status");

  console.log("Failure-path smoke test passed: the process stays up and reports not ready.");
  process.exit(0);
}

const ready = await request("GET", "/ready");
expectStatus("GET /ready", ready, 200);

if (checkWeb) {
  await checkWebApp();
}

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

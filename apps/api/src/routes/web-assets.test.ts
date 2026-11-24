import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildApp } from "../app.js";

const INDEX_HTML =
  '<!doctype html><html><body><div id="root"></div><script type="module" src="/assets/app.abc123.js"></script></body></html>';

function createBuildDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "devforge-web-"));

  mkdirSync(join(directory, "assets"));
  writeFileSync(join(directory, "index.html"), INDEX_HTML);
  writeFileSync(join(directory, "theme-init.js"), "window.__theme = 1;");
  writeFileSync(join(directory, "assets", "app.abc123.js"), "console.log('app');");

  return directory;
}

async function withApp(
  run: (app: ReturnType<typeof buildApp>) => Promise<void>,
): Promise<void> {
  const directory = createBuildDirectory();
  const app = buildApp({
    serverOptions: { logger: false },
    webAssets: { directory },
  });

  try {
    await app.ready();
    await run(app);
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

test("GET / serves the app, never cached, with the security headers", async () => {
  await withApp(async (app) => {
    const response = await app.inject({ method: "GET", url: "/" });

    assert.equal(response.statusCode, 200);
    assert.match(String(response.headers["content-type"]), /text\/html/);
    assert.equal(response.headers["cache-control"], "no-cache");
    assert.equal(response.body, INDEX_HTML);
    assert.match(String(response.headers["content-security-policy"]), /script-src 'self'/);
    assert.equal(response.headers["x-content-type-options"], "nosniff");
  });
});

test("fingerprinted assets are cached for a year, other files are revalidated", async () => {
  await withApp(async (app) => {
    const asset = await app.inject({ method: "GET", url: "/assets/app.abc123.js" });

    assert.equal(asset.statusCode, 200);
    assert.match(String(asset.headers["content-type"]), /javascript/);
    assert.equal(
      asset.headers["cache-control"],
      "public, max-age=31536000, immutable",
    );
    assert.equal(asset.headers["x-content-type-options"], "nosniff");

    const theme = await app.inject({ method: "GET", url: "/theme-init.js" });

    assert.equal(theme.statusCode, 200);
    assert.equal(theme.headers["cache-control"], "no-cache");
  });
});

test("a client-side route gets the app, so a refresh on /projects/123 works", async () => {
  await withApp(async (app) => {
    for (const url of ["/projects/123", "/workspaces/abc/settings?tab=members", "/join"]) {
      const response = await app.inject({ method: "GET", url });

      assert.equal(response.statusCode, 200, url);
      assert.equal(response.body, INDEX_HTML, url);
      assert.equal(response.headers["cache-control"], "no-cache", url);
    }
  });
});

test("unknown API paths stay JSON 404s, not the app", async () => {
  await withApp(async (app) => {
    for (const url of ["/api/nope", "/api/workspaces/x/unknown", "/api", "/api/"]) {
      const response = await app.inject({ method: "GET", url });

      assert.equal(response.statusCode, 404, url);
      assert.match(String(response.headers["content-type"]), /application\/json/, url);
      assert.equal(response.json().statusCode, 404, url);
    }
  });
});

test("a missing file is a 404, not HTML that a browser would try to run as a script", async () => {
  await withApp(async (app) => {
    const response = await app.inject({ method: "GET", url: "/assets/app.old999.js" });

    assert.equal(response.statusCode, 404);
    assert.match(String(response.headers["content-type"]), /application\/json/);
  });
});

test("only GET and HEAD can receive the app; other methods get a JSON 404", async () => {
  await withApp(async (app) => {
    const post = await app.inject({ method: "POST", url: "/projects/123", payload: {} });

    assert.equal(post.statusCode, 404);
    assert.match(String(post.headers["content-type"]), /application\/json/);

    const head = await app.inject({ method: "HEAD", url: "/projects/123" });

    assert.equal(head.statusCode, 200);
  });
});

test("API, health, readiness and docs routes are untouched", async () => {
  await withApp(async (app) => {
    const health = await app.inject({ method: "GET", url: "/health" });

    assert.equal(health.statusCode, 200);
    assert.equal(health.json().status, "ok");

    const ready = await app.inject({ method: "GET", url: "/ready" });

    assert.equal(ready.statusCode, 200);

    // A real API route: without a token it must answer 401 as JSON, which
    // proves the app fallback did not swallow it.
    const workspaces = await app.inject({ method: "GET", url: "/api/workspaces" });

    assert.equal(workspaces.statusCode, 401);
    assert.match(String(workspaces.headers["content-type"]), /application\/json/);

    const docs = await app.inject({ method: "GET", url: "/docs/json" });

    assert.equal(docs.statusCode, 200);
    assert.match(String(docs.headers["content-type"]), /application\/json/);
  });
});

test("path traversal cannot reach files outside the build directory", async () => {
  await withApp(async (app) => {
    for (const url of [
      "/..%2f..%2fpackage.json",
      "/%2e%2e/%2e%2e/package.json",
      "/assets/..%2f..%2f..%2fpackage.json",
      "/../../package.json",
    ]) {
      const response = await app.inject({ method: "GET", url });

      assert.ok(
        response.statusCode === 404 || response.statusCode === 400 || response.body === INDEX_HTML,
        `${url}: ${response.statusCode}`,
      );
      assert.ok(!response.body.includes('"name"'), `${url} leaked a file`);
    }
  });
});

test("without webAssets the API alone answers / with the default JSON 404", async () => {
  const app = buildApp({ serverOptions: { logger: false } });

  try {
    await app.ready();

    const response = await app.inject({ method: "GET", url: "/" });

    assert.equal(response.statusCode, 404);
    assert.match(String(response.headers["content-type"]), /application\/json/);
  } finally {
    await app.close();
  }
});

test("a web directory with no index.html stops the server from starting", async () => {
  const directory = mkdtempSync(join(tmpdir(), "devforge-empty-"));
  const app = buildApp({
    serverOptions: { logger: false },
    webAssets: { directory },
  });

  try {
    await assert.rejects(async () => { await app.ready(); }, /contains no index\.html/);
  } finally {
    try {
      await app.close();
    } catch {
      // The plugin failed to load, so there is nothing left to close.
    }
    rmSync(directory, { recursive: true, force: true });
  }
});

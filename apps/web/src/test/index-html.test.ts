import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

test("index.html has no inline script", () => {
  // The API serves this page with script-src 'self', which refuses inline
  // scripts. An inline one would silently not run in production while still
  // working under Vite, so this test is the only thing that would notice.
  const inline = [...html.matchAll(/<script\b([^>]*)>/gi)].filter(
    (match) => !/\bsrc\s*=/.test(match[1] ?? ""),
  );

  assert.equal(inline.length, 0, "every <script> needs a src");
});

test("index.html has no inline event handlers", () => {
  assert.doesNotMatch(html, /\son[a-z]+\s*=\s*["']/i);
});

test("the theme script is loaded from a file in public/", () => {
  assert.match(html, /<script src="\/theme-init\.js"><\/script>/);
});

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import fastifyStatic from "@fastify/static";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { pathOnly } from "../http/path-only.js";

export interface WebAssetsOptions {
  /** Directory holding the built web app (the output of `vite build`). */
  directory: string;
}

// Paths that belong to the API. A request that reaches the not-found handler
// under one of these is a real 404 and must stay JSON, never the app's HTML.
const API_PATH = /^\/(api|docs)(\/|$)/;
const API_ONLY_PATHS = new Set(["/health", "/ready"]);

// Vite fingerprints everything under /assets/ with a content hash, so those
// files can be cached forever. index.html names those files, so it must never
// be cached or a deploy would not reach people who already have the old one.
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
const REVALIDATE_CACHE = "no-cache";

/**
 * True for a URL that the browser app should answer: a page route such as
 * /projects/123, which only exists in the client-side router. A path with a
 * file extension is a missing file, not a page: answering it with HTML would
 * turn a stale /assets/app.abc.js into a confusing "unexpected token <".
 */
function isClientRoute(path: string): boolean {
  if (API_PATH.test(path) || API_ONLY_PATHS.has(path)) {
    return false;
  }

  const lastSegment = path.slice(path.lastIndexOf("/") + 1);

  return !lastSegment.includes(".");
}

function notFound(request: FastifyRequest, reply: FastifyReply) {
  // Same body Fastify sends by default, so API clients see no difference.
  return reply.code(404).send({
    message: `Route ${request.method}:${request.url} not found`,
    error: "Not Found",
    statusCode: 404,
  });
}

/**
 * Serves the built web app from the API, so the browser sees one origin: no
 * CORS, and the app's relative /api calls work unchanged.
 *
 * Only files that exist in the build directory when the server starts are
 * routed (wildcard: false), so there is no path-to-file mapping to traverse.
 * Everything else that looks like a page gets index.html; everything else
 * falls through to a JSON 404.
 */
export const webAssetsPlugin = fp<WebAssetsOptions>(
  async function webAssets(app: FastifyInstance, options) {
    const root = resolve(options.directory);

    // A deployment that asked for the web app but has none should fail to
    // start, not quietly serve an API that answers "/" with a 404.
    if (!existsSync(join(root, "index.html"))) {
      throw new Error(
        `WEB_DIST_DIR is set to ${root} but it contains no index.html. Build the web app first (npm run build --workspace @devforge/web).`,
      );
    }

    await app.register(fastifyStatic, {
      root,
      wildcard: false,
      index: false,
      setHeaders(reply, filePath) {
        const normalized = filePath.replace(/\\/g, "/");

        reply.header(
          "cache-control",
          normalized.includes("/assets/")
            ? IMMUTABLE_CACHE
            : REVALIDATE_CACHE,
        );
      },
    });

    app.setNotFoundHandler((request, reply) => {
      const isPageRequest =
        (request.method === "GET" || request.method === "HEAD") &&
        isClientRoute(pathOnly(request.url));

      if (!isPageRequest) {
        return notFound(request, reply);
      }

      return reply
        .header("cache-control", REVALIDATE_CACHE)
        .type("text/html; charset=utf-8")
        .sendFile("index.html");
    });
  },
  { name: "devforge-web-assets" },
);

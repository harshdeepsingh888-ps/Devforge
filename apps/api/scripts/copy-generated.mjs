// Copies the generated Prisma client into dist after tsc has run.
//
// The Prisma client is generated as plain JavaScript into src/generated. tsc
// only emits TypeScript, so without this step dist has no client and the built
// server fails at startup with ERR_MODULE_NOT_FOUND, even though the dev server
// and the tests (which run from src) work. Written in Node rather than shell
// so the same build works on Windows, macOS and Linux.
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(apiRoot, "src", "generated");
const destination = join(apiRoot, "dist", "generated");

if (!existsSync(source)) {
  console.error(
    "src/generated is missing. Run `npm run db:generate` before building.",
  );
  process.exit(1);
}

// Remove first so a client regenerated with fewer files cannot leave stale ones behind.
rmSync(destination, { recursive: true, force: true });
cpSync(source, destination, { recursive: true });

console.log("Copied the generated Prisma client to dist/generated");

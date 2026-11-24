// Container entrypoint. Optionally applies database migrations, then starts the API.
//
// Why migrations run here: Render's pre-deploy command is not available on the
// free instance type, so the only place left to run them on every deploy is the
// start of the new instance. If this script exits non-zero the new instance
// never becomes healthy, Render cancels the deploy, and the previous version
// keeps serving traffic.
//
// RUN_MIGRATIONS_ON_START=true turns it on. It is off by default so that
// `docker run` against a database someone else manages does not change its schema.
//
// `prisma migrate deploy` takes a Postgres advisory lock, so two instances
// starting at once cannot apply the same migration twice. It does not make a
// migration safe to run while the PREVIOUS version is still serving: during a
// deploy the old and new code share the database for a minute or so, so
// migrations must be backward compatible (add columns and tables first, remove
// them in a later release).
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

if (process.env.RUN_MIGRATIONS_ON_START === "true") {
  const require = createRequire(join(apiRoot, "package.json"));
  const prismaCli = require.resolve("prisma/build/index.js");

  console.log("Applying database migrations before starting the API.");

  const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    cwd: apiRoot,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(
      `Database migration failed (${result.error ? result.error.message : `exit ${result.status}`}). Not starting the API.`,
    );
    process.exit(1);
  }

  console.log("Database migrations are up to date.");
}

await import(pathToFileURL(join(apiRoot, "dist", "server.js")).href);

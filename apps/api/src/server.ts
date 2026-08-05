import { buildApp } from "./app.js";
import {
  createAuthenticationService,
} from "./modules/auth/auth.module.js";
import {
  env,
  getAuthenticationConfiguration,
} from "./config/env.js";

const authenticationService =
  createAuthenticationService(
    getAuthenticationConfiguration(),
  );

const app = buildApp({
  authenticationService,
});

async function startServer(): Promise<void> {
  try {
    await app.listen({
      port: env.port,
      host: env.host,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

async function shutdown(
  signal: string,
): Promise<void> {
  app.log.info(
    { signal },
    "Shutting down DevForge API",
  );

  try {
    await app.close();
    process.exit(0);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void startServer();
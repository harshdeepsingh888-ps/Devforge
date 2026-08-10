import { buildApp } from "./app.js";
import {
  createAuthenticationModule,
} from "./modules/auth/auth.module.js";
import {
  env,
  getAuthenticationConfiguration,
} from "./config/env.js";

const authenticationModule =
  createAuthenticationModule(
    getAuthenticationConfiguration(),
  );

const app = buildApp({
  authenticationService:
    authenticationModule.authenticationService,
  accessTokenService:
    authenticationModule.accessTokenService,
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

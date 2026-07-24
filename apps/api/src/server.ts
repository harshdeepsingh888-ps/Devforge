import { buildApp } from "./app.js";

const app = buildApp();

const port = Number(process.env.PORT ?? 5000);
const host = process.env.HOST ?? "0.0.0.0";

async function startServer(): Promise<void> {
  try {
    await app.listen({
      port,
      host,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "Shutting down DevForge API");

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

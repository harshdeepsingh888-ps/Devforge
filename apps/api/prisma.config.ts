import { defineConfig } from "@prisma/config";

// Prisma 7 no longer reads .env itself. Locally the connection string lives in
// apps/api/.env; on a host it is already in the process environment and there
// is no .env file at all. loadEnvFile never overrides a variable that is already
// set, and it is built into Node, so this needs no extra package in the
// production image, where `prisma migrate deploy` runs this file.
try {
  process.loadEnvFile();
} catch {
  // No .env file: use the environment as it is.
}

export default defineConfig({
  earlyAccess: true,
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

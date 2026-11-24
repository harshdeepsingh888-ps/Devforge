import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { env } from "../../config/env.js";
import { PrismaClient } from "../../generated/prisma/client.js";

const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  // pg waits forever to connect unless told otherwise. With no limit, a database
  // that stops answering makes every request and every readiness probe hang and
  // slowly exhausts the pool.
  connectionTimeoutMillis: 5_000,
});

// An idle connection that dies (a database restart or maintenance window) emits
// 'error' on the pool. With no listener Node treats it as uncaught and kills the
// process, so the whole API would go down with the database.
pool.on("error", (error) => {
  console.error(
    "Unexpected error on an idle database connection:",
    error.message,
  );
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

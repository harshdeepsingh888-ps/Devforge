import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { env } from "../../config/env.js";
import { PrismaClient } from "../../generated/prisma/client.js";
import { getRdsSslConfiguration } from "../aws/ssl-config.js";
import { generateRdsIamAuthToken } from "../aws/rds-iam-auth.js";

const { Pool } = pg;

function createPrismaClient(): PrismaClient {
  const isProduction = process.env.NODE_ENV === "production";
  const useIamAuth = process.env.USE_AWS_IAM_AUTH === "true";

  if (isProduction || useIamAuth) {
    const ssl = getRdsSslConfiguration();

    const pool = new Pool({
      connectionString: env.databaseUrl,
      ssl,
      password: async () => {
        if (useIamAuth && process.env.AWS_RDS_HOSTNAME && process.env.AWS_RDS_USERNAME) {
          return generateRdsIamAuthToken({
            hostname: process.env.AWS_RDS_HOSTNAME,
            port: process.env.AWS_RDS_PORT ? Number(process.env.AWS_RDS_PORT) : 5432,
            username: process.env.AWS_RDS_USERNAME,
          });
        }
        return process.env.DATABASE_PASSWORD || "";
      },
    });

    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  const adapter = new PrismaPg({
    connectionString: env.databaseUrl,
  });

  return new PrismaClient({ adapter });
}

export const prisma = createPrismaClient();
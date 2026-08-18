import fs from "node:fs";
import path from "node:path";

export interface SslConfiguration {
  rejectUnauthorized: boolean;
  ca?: string;
}

export function getRdsSslConfiguration(): SslConfiguration {
  const isProduction = process.env.NODE_ENV === "production";
  const rdsCaPath = process.env.AWS_RDS_CA_PATH;

  if (rdsCaPath && fs.existsSync(rdsCaPath)) {
    return {
      rejectUnauthorized: true,
      ca: fs.readFileSync(path.resolve(rdsCaPath), "utf8"),
    };
  }

  if (isProduction) {
    return {
      rejectUnauthorized: true,
    };
  }

  return {
    rejectUnauthorized: false,
  };
}

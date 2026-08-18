import fs from "node:fs";
import path from "node:path";

export interface SslConfiguration {
  rejectUnauthorized: boolean;
  ca?: string;
}

// AWS RDS Global Root CA Bundle certificate identifier
export const AWS_RDS_GLOBAL_BUNDLE_ID = "global-bundle.pem";

export function getRdsSslConfiguration(): SslConfiguration {
  const isProduction = process.env.NODE_ENV === "production";
  const isAwsMode = process.env.USE_AWS_IAM_AUTH === "true";
  const rdsCaPath = process.env.AWS_RDS_CA_PATH;

  if (rdsCaPath && fs.existsSync(rdsCaPath)) {
    return {
      rejectUnauthorized: true,
      ca: fs.readFileSync(path.resolve(rdsCaPath), "utf8"),
    };
  }

  if (isProduction || isAwsMode) {
    return {
      rejectUnauthorized: true,
    };
  }

  return {
    rejectUnauthorized: false,
  };
}

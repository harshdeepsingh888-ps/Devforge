import { Signer } from "@aws-sdk/rds-signer";

export interface RdsIamAuthOptions {
  hostname: string;
  port?: number;
  username: string;
  region?: string;
}

export async function generateRdsIamAuthToken(
  options: RdsIamAuthOptions,
): Promise<string> {
  const region = options.region || process.env.AWS_REGION || "us-east-1";
  const port = options.port || 5432;

  const signer = new Signer({
    hostname: options.hostname,
    port,
    username: options.username,
    region,
  });

  return signer.getAuthToken();
}

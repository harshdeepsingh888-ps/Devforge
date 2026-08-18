import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

let cachedSecrets: Record<string, string> | null = null;

export async function fetchAwsSecrets(): Promise<Record<string, string>> {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  const secretName = process.env.AWS_SECRETS_NAME || "devforge/prod/secrets";
  const region = process.env.AWS_REGION || "us-east-1";

  const client = new SecretsManagerClient({ region });

  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName }),
    );

    if (!response.SecretString) {
      throw new Error(`AWS Secret '${secretName}' does not contain string content.`);
    }

    const secrets = JSON.parse(response.SecretString);
    cachedSecrets = secrets;
    return secrets;
  } catch (error: any) {
    throw new Error(
      `Failed to retrieve secrets from AWS Secrets Manager (${secretName}): ${error.message}`,
    );
  }
}

/**
 * Startup hook: Call once at server startup to cache Secrets Manager values in memory
 * and inject them into process.env, guaranteeing zero per-request AWS Secrets Manager network calls.
 */
export async function initializeAwsSecretsAtStartup(): Promise<Record<string, string>> {
  if (process.env.NODE_ENV !== "production" && !process.env.AWS_SECRETS_NAME) {
    return {};
  }

  const secrets = await fetchAwsSecrets();
  for (const [key, value] of Object.entries(secrets)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
  return secrets;
}

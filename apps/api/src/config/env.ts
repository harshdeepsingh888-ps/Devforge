const DEFAULT_PORT = 5000;
const DEFAULT_HOST = "0.0.0.0";

function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(
      "PORT must be an integer between 1 and 65535.",
    );
  }

  return port;
}

function requireEnvironmentVariable(
  name: string,
  value: string | undefined,
): string {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new Error(
      `${name} environment variable is required.`,
    );
  }

  return normalizedValue;
}

export const env = {
  port: parsePort(process.env.PORT),
  host: process.env.HOST ?? DEFAULT_HOST,
  databaseUrl: requireEnvironmentVariable(
    "DATABASE_URL",
    process.env.DATABASE_URL,
  ),
};
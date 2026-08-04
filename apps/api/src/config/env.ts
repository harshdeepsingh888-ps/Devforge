const DEFAULT_PORT = 5000;
const DEFAULT_HOST = "0.0.0.0";

const DEFAULT_ACCESS_TOKEN_EXPIRES_IN_SECONDS =
  15 * 60;

const DEFAULT_REFRESH_TOKEN_EXPIRES_IN_SECONDS =
  30 * 24 * 60 * 60;

function parsePort(
  value: string | undefined,
): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number(value);

  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535
  ) {
    throw new Error(
      "PORT must be an integer between 1 and 65535.",
    );
  }

  return port;
}

function parsePositiveInteger(
  name: string,
  value: string | undefined,
  defaultValue: number,
): number {
  if (value === undefined) {
    return defaultValue;
  }

  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue <= 0
  ) {
    throw new Error(
      `${name} must be a positive integer.`,
    );
  }

  return parsedValue;
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

const jwtAccessTokenSecret =
  requireEnvironmentVariable(
    "JWT_ACCESS_TOKEN_SECRET",
    process.env.JWT_ACCESS_TOKEN_SECRET,
  );

if (
  Buffer.byteLength(
    jwtAccessTokenSecret,
    "utf8",
  ) < 32
) {
  throw new Error(
    "JWT_ACCESS_TOKEN_SECRET must contain at least 32 bytes.",
  );
}

export const env = {
  port: parsePort(process.env.PORT),

  host:
    process.env.HOST?.trim() ||
    DEFAULT_HOST,

  databaseUrl: requireEnvironmentVariable(
    "DATABASE_URL",
    process.env.DATABASE_URL,
  ),

  authentication: {
    accessToken: {
      secret: jwtAccessTokenSecret,

      issuer: requireEnvironmentVariable(
        "JWT_ISSUER",
        process.env.JWT_ISSUER,
      ),

      audience: requireEnvironmentVariable(
        "JWT_AUDIENCE",
        process.env.JWT_AUDIENCE,
      ),

      expiresInSeconds:
        parsePositiveInteger(
          "JWT_ACCESS_TOKEN_EXPIRES_IN_SECONDS",
          process.env
            .JWT_ACCESS_TOKEN_EXPIRES_IN_SECONDS,
          DEFAULT_ACCESS_TOKEN_EXPIRES_IN_SECONDS,
        ),
    },

    refreshTokenExpiresInSeconds:
      parsePositiveInteger(
        "REFRESH_TOKEN_EXPIRES_IN_SECONDS",
        process.env
          .REFRESH_TOKEN_EXPIRES_IN_SECONDS,
        DEFAULT_REFRESH_TOKEN_EXPIRES_IN_SECONDS,
      ),
  },
};
import { randomUUID } from "node:crypto";

import jwt from "jsonwebtoken";

import type {
  AccessTokenConfiguration,
  IssueAccessTokenInput,
  VerifiedAccessToken,
} from "./token.types.js";

const ACCESS_TOKEN_TYPE = "access";
const ACCESS_TOKEN_ALGORITHM = "HS256";

interface AccessTokenPayload extends jwt.JwtPayload {
  sid?: unknown;
  tokenType?: unknown;
}

export class InvalidAccessTokenError extends Error {
  readonly code = "INVALID_ACCESS_TOKEN";

  constructor() {
    super("The access token is invalid.");
    this.name = "InvalidAccessTokenError";
  }
}

export class ExpiredAccessTokenError extends Error {
  readonly code = "ACCESS_TOKEN_EXPIRED";

  constructor() {
    super("The access token has expired.");
    this.name = "ExpiredAccessTokenError";
  }
}

export interface AccessTokenService {
  issue(
    input: IssueAccessTokenInput,
  ): Promise<string>;

  verify(
    token: string,
  ): Promise<VerifiedAccessToken>;
}

export class JwtAccessTokenService
  implements AccessTokenService
{
  constructor(
    private readonly configuration:
      AccessTokenConfiguration,
  ) {
    if (
      Buffer.byteLength(
        configuration.secret,
        "utf8",
      ) < 32
    ) {
      throw new Error(
        "JWT access-token secret must contain at least 32 bytes.",
      );
    }

    if (configuration.expiresInSeconds <= 0) {
      throw new Error(
        "Access-token lifetime must be greater than zero.",
      );
    }
  }

  async issue(
    input: IssueAccessTokenInput,
  ): Promise<string> {
    return jwt.sign(
      {
        sid: input.sessionId,
        tokenType: ACCESS_TOKEN_TYPE,
      },
      this.configuration.secret,
      {
        algorithm: ACCESS_TOKEN_ALGORITHM,
        audience: this.configuration.audience,
        expiresIn:
          this.configuration.expiresInSeconds,
        issuer: this.configuration.issuer,
        jwtid: randomUUID(),
        subject: input.userId,
      },
    );
  }

  async verify(
    token: string,
  ): Promise<VerifiedAccessToken> {
    try {
      const payload = jwt.verify(
        token,
        this.configuration.secret,
        {
          algorithms: [ACCESS_TOKEN_ALGORITHM],
          audience: this.configuration.audience,
          issuer: this.configuration.issuer,
        },
      );

      if (
        typeof payload === "string" ||
        !isValidAccessTokenPayload(payload)
      ) {
        throw new InvalidAccessTokenError();
      }

      return {
        userId: payload.sub,
        sessionId: payload.sid,
      };
    } catch (error) {
      if (error instanceof ExpiredAccessTokenError) {
        throw error;
      }

      if (error instanceof InvalidAccessTokenError) {
        throw error;
      }

      if (error instanceof jwt.TokenExpiredError) {
        throw new ExpiredAccessTokenError();
      }

      if (error instanceof jwt.JsonWebTokenError) {
        throw new InvalidAccessTokenError();
      }

      throw error;
    }
  }
}

function isValidAccessTokenPayload(
  payload: AccessTokenPayload,
): payload is AccessTokenPayload & {
  sub: string;
  sid: string;
  tokenType: typeof ACCESS_TOKEN_TYPE;
} {
  return (
    typeof payload.sub === "string" &&
    payload.sub.length > 0 &&
    typeof payload.sid === "string" &&
    payload.sid.length > 0 &&
    payload.tokenType === ACCESS_TOKEN_TYPE
  );
}
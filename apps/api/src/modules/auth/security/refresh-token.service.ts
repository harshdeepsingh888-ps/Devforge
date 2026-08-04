import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const TOKEN_BYTES = 32;

export interface RefreshTokenPair {
  token: string;
  hash: string;
}

export interface RefreshTokenService {
  generate(): RefreshTokenPair;

  hash(
    token: string,
  ): string;

  verify(
    token: string,
    expectedHash: string,
  ): boolean;
}

export class Sha256RefreshTokenService
  implements RefreshTokenService
{
  generate(): RefreshTokenPair {
    const token = randomBytes(
      TOKEN_BYTES,
    ).toString("base64url");

    return {
      token,
      hash: this.hash(token),
    };
  }

  hash(
    token: string,
  ): string {
    return createHash("sha256")
      .update(token)
      .digest("hex");
  }

  verify(
    token: string,
    expectedHash: string,
  ): boolean {
    const actualHash = this.hash(token);

    return timingSafeEqual(
      Buffer.from(actualHash, "hex"),
      Buffer.from(expectedHash, "hex"),
    );
  }
}
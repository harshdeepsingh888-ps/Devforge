export interface IssueAccessTokenInput {
  userId: string;
  sessionId: string;
}

export interface VerifiedAccessToken {
  userId: string;
  sessionId: string;
}

export interface AccessTokenConfiguration {
  secret: string;
  issuer: string;
  audience: string;
  expiresInSeconds: number;
}
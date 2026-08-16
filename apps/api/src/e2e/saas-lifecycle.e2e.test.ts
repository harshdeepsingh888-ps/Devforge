import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";

import { buildApp } from "../app.js";
import { InMemoryUserRepository } from "../modules/auth/repositories/memory/in-memory-user.repository.js";
import type { SessionRepository } from "../modules/auth/repositories/session/session.repository.js";
import type { AuthSession, CreateSessionInput } from "../modules/auth/session.types.js";
import { Argon2PasswordService } from "../modules/auth/services/password.service.js";
import { RegistrationService } from "../modules/auth/services/registration.service.js";
import { Sha256RefreshTokenService } from "../modules/auth/security/refresh-token.service.js";
import { JwtAccessTokenService } from "../modules/auth/security/jwt.service.js";
import { AuthenticationService } from "../modules/auth/services/authentication/authentication.service.js";
import { InMemoryWorkspaceRepository } from "../modules/workspaces/repositories/memory/in-memory-workspace.repository.js";
import { WorkspaceService } from "../modules/workspaces/services/workspace.service.js";
import { InMemoryProjectRepository } from "../modules/projects/project.repository.js";

class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, AuthSession>();

  async create(input: CreateSessionInput): Promise<AuthSession> {
    const timestamp = new Date().toISOString();
    const session: AuthSession = {
      id: randomUUID(),
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      status: "ACTIVE",
      expiresAt: input.expiresAt,
      lastUsedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async findById(sessionId: string): Promise<AuthSession | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async findByRefreshTokenHash(refreshTokenHash: string): Promise<AuthSession | null> {
    for (const session of this.sessions.values()) {
      if (session.refreshTokenHash === refreshTokenHash) return session;
    }
    return null;
  }

  async rotateRefreshToken(
    sessionId: string,
    currentRefreshTokenHash: string,
    nextRefreshTokenHash: string,
  ): Promise<AuthSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session || session.refreshTokenHash !== currentRefreshTokenHash) return null;
    const updated: AuthSession = {
      ...session,
      refreshTokenHash: nextRefreshTokenHash,
      updatedAt: new Date().toISOString(),
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  async touch(sessionId: string): Promise<AuthSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    const updated: AuthSession = {
      ...session,
      lastUsedAt: new Date().toISOString(),
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  async revoke(sessionId: string): Promise<AuthSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    const updated: AuthSession = {
      ...session,
      status: "REVOKED",
      updatedAt: new Date().toISOString(),
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  async revokeAllForUser(userId: string): Promise<number> {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.status === "ACTIVE") {
        session.status = "REVOKED";
        count++;
      }
    }
    return count;
  }
}

test("Full SaaS End-to-End Lifecycle: Register -> Auth -> Create Workspace -> Manage Tenant Projects & Members", async (t) => {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository();
  const passwords = new Argon2PasswordService();
  const refreshTokens = new Sha256RefreshTokenService();
  const accessTokenService = new JwtAccessTokenService({
    secret: "devforge-default-development-jwt-signing-secret-key-32bytes",
    issuer: "devforge",
    audience: "devforge-api",
    expiresInSeconds: 900,
  });

  const registration = new RegistrationService({
    userRepository: users,
    passwordService: passwords,
  });

  const authenticationService = new AuthenticationService({
    users,
    passwords,
    registration,
    sessions,
    refreshTokens,
    accessTokens: accessTokenService,
    configuration: {
      refreshTokenExpiresInSeconds: 86400,
    },
  });

  const workspaceRepository = new InMemoryWorkspaceRepository();
  const workspaceService = new WorkspaceService(workspaceRepository);
  const projectRepository = new InMemoryProjectRepository();

  const app = buildApp({
    serverOptions: { logger: false },
    authenticationService,
    accessTokenService,
    workspaceRepository,
    workspaceService,
    projectRepository,
  });

  t.after(async () => {
    await app.close();
  });

  // 1. Register User 1 (Owner)
  const registerUser1Res = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      email: "harshdeep@devforge.io",
      password: "SuperSecurePassword123!",
      displayName: "Harshdeep Singh",
    },
  });

  assert.equal(registerUser1Res.statusCode, 201);
  const user1Auth = registerUser1Res.json();
  const user1Token = user1Auth.accessToken;
  const user1Id = user1Auth.user.id;
  assert.ok(user1Token);

  // 2. User 1 Creates a Workspace with Bearer Auth
  const createWsRes = await app.inject({
    method: "POST",
    url: "/api/workspaces",
    headers: { authorization: `Bearer ${user1Token}` },
    payload: {
      name: "DevForge Flagship Org",
      slug: "devforge-flagship-org",
    },
  });

  assert.equal(createWsRes.statusCode, 201);
  const workspace = createWsRes.json().data;
  assert.equal(workspace.name, "DevForge Flagship Org");
  assert.equal(workspace.membership.userId, user1Id);
  assert.equal(workspace.membership.role, "OWNER");

  // 3. User 1 Creates a Project inside the Workspace
  const createProjectRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspace.id}/projects`,
    headers: { authorization: `Bearer ${user1Token}` },
    payload: {
      name: "DevForge API Engine",
      description: "Backend microservices core platform",
    },
  });

  assert.equal(createProjectRes.statusCode, 201);
  const project = createProjectRes.json().data;
  assert.equal(project.name, "DevForge API Engine");
  assert.equal(project.workspaceId, workspace.id);

  // 4. Register User 2 (Colleague)
  const registerUser2Res = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      email: "colleague@devforge.io",
      password: "SuperSecurePassword123!",
      displayName: "Senior Collaborator",
    },
  });

  assert.equal(registerUser2Res.statusCode, 201);
  const user2Auth = registerUser2Res.json();
  const user2Token = user2Auth.accessToken;
  const user2Id = user2Auth.user.id;

  // 5. User 2 Attempts to Access Workspace Projects BEFORE being added -> 404 (Anti-enumeration)
  const user2ForbiddenRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspace.id}/projects`,
    headers: { authorization: `Bearer ${user2Token}` },
  });

  assert.equal(user2ForbiddenRes.statusCode, 404);

  // 6. User 1 (Owner) Adds User 2 as MEMBER
  const addMemberRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspace.id}/members`,
    headers: { authorization: `Bearer ${user1Token}` },
    payload: {
      userId: user2Id,
      role: "DEVELOPER",
    },
  });

  assert.equal(addMemberRes.statusCode, 201);

  // 7. User 2 Accesses Workspace Projects AFTER being added -> 200 OK!
  const user2AllowedRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${workspace.id}/projects`,
    headers: { authorization: `Bearer ${user2Token}` },
  });

  assert.equal(user2AllowedRes.statusCode, 200);
  const projectsList = user2AllowedRes.json().data;
  assert.equal(projectsList.length, 1);
  assert.equal(projectsList[0].id, project.id);
});

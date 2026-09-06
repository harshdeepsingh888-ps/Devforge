import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiError,
  apiFetch,
  clearStoredTokens,
  getStoredRefreshToken,
  getStoredToken,
  onAuthRevoked,
  refreshAuthSession,
  setStoredRefreshToken,
  setStoredToken,
} from "../services/api-client.ts";

// Setup mock localStorage in Node environment
function setupMockLocalStorage() {
  const store: Record<string, string> = {};

  const mockStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) {
        delete store[k];
      }
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: mockStorage,
    configurable: true,
    writable: true,
  });

  return store;
}

test("@devforge/web: Auth Session — Storage Helpers & Survival Across Reloads", () => {
  setupMockLocalStorage();
  clearStoredTokens();

  assert.equal(getStoredToken(), null);
  assert.equal(getStoredRefreshToken(), null);

  // Store tokens upon login
  setStoredToken("test_access_jwt_123");
  setStoredRefreshToken("test_refresh_token_456");

  assert.equal(getStoredToken(), "test_access_jwt_123");
  assert.equal(getStoredRefreshToken(), "test_refresh_token_456");

  // Page reload session check invariant: User is authenticated if access token OR refresh token exists
  const isAuthenticatedOnReload = Boolean(getStoredToken() || getStoredRefreshToken());
  assert.equal(isAuthenticatedOnReload, true);

  // If access token expired but refresh token remains, session is still restored for silent refresh
  setStoredToken(null);
  assert.equal(getStoredToken(), null);
  assert.equal(Boolean(getStoredToken() || getStoredRefreshToken()), true);

  // Clear all tokens on logout
  clearStoredTokens();
  assert.equal(getStoredToken(), null);
  assert.equal(getStoredRefreshToken(), null);
  assert.equal(Boolean(getStoredToken() || getStoredRefreshToken()), false);
});

test("@devforge/web: Auth Session — Expired Access Token Refreshes Silently & Retries Request", async () => {
  setupMockLocalStorage();
  clearStoredTokens();

  setStoredToken("expired_access_token");
  setStoredRefreshToken("valid_refresh_token_abc");

  let refreshCallCount = 0;
  let workspaceCallCount = 0;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url === "/api/workspaces") {
      workspaceCallCount++;
      const headers = new Headers(init?.headers);
      const authHeader = headers.get("Authorization");

      if (authHeader === "Bearer expired_access_token") {
        return new Response(JSON.stringify({ error: "UNAUTHORIZED", message: "Token expired" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (authHeader === "Bearer new_refreshed_access_token") {
        return new Response(JSON.stringify({ data: [{ id: "ws-1", name: "Workspace 1" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Unauthorized", { status: 401 });
    }

    if (url === "/api/auth/refresh") {
      refreshCallCount++;
      const body = JSON.parse(String(init?.body || "{}"));
      assert.equal(body.refreshToken, "valid_refresh_token_abc");

      return new Response(
        JSON.stringify({
          data: {
            accessToken: "new_refreshed_access_token",
            refreshToken: "rotated_refresh_token_def",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response("Not Found", { status: 404 });
  }) as typeof globalThis.fetch;

  try {
    const workspaces = await apiFetch<Array<{ id: string; name: string }>>("/api/workspaces");

    assert.equal(refreshCallCount, 1);
    assert.equal(workspaceCallCount, 2); // Initial failed call + 1 retry with new token
    assert.deepEqual(workspaces, [{ id: "ws-1", name: "Workspace 1" }]);

    // Tokens were rotated in localStorage
    assert.equal(getStoredToken(), "new_refreshed_access_token");
    assert.equal(getStoredRefreshToken(), "rotated_refresh_token_def");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("@devforge/web: Auth Session — Normal API Errors (400, 404, 500) Do NOT Clear Auth", async () => {
  setupMockLocalStorage();
  clearStoredTokens();

  setStoredToken("valid_token_xyz");
  setStoredRefreshToken("valid_refresh_token_xyz");

  let authRevokedCalled = false;
  const unsubscribe = onAuthRevoked(() => {
    authRevokedCalled = true;
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url === "/api/workspaces/ws-999") {
      return new Response(
        JSON.stringify({ error: "NOT_FOUND", message: "Workspace not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response("Server error", { status: 500 });
  }) as typeof globalThis.fetch;

  try {
    await assert.rejects(
      async () => {
        await apiFetch("/api/workspaces/ws-999");
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.statusCode, 404);
        assert.equal(err.message, "Workspace not found");
        return true;
      },
    );

    // Tokens must still be intact!
    assert.equal(getStoredToken(), "valid_token_xyz");
    assert.equal(getStoredRefreshToken(), "valid_refresh_token_xyz");
    assert.equal(authRevokedCalled, false);
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
  }
});

test("@devforge/web: Auth Session — Concurrent 401s Deduplicate Refresh (No Race Conditions)", async () => {
  setupMockLocalStorage();
  clearStoredTokens();

  setStoredToken("expired_access_token");
  setStoredRefreshToken("valid_refresh_token_concurrency");

  let refreshCallCount = 0;
  let workItemsCallCount = 0;
  let membersCallCount = 0;
  let teamsCallCount = 0;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url === "/api/auth/refresh") {
      refreshCallCount++;
      // Simulate network latency for refresh
      await new Promise((resolve) => setTimeout(resolve, 30));
      return new Response(
        JSON.stringify({
          data: {
            accessToken: "new_concurrency_access_token",
            refreshToken: "new_concurrency_refresh_token",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const headers = new Headers(init?.headers);
    const authHeader = headers.get("Authorization");

    if (authHeader === "Bearer expired_access_token") {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED", message: "Token expired" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (authHeader === "Bearer new_concurrency_access_token") {
      if (url.includes("/work-items")) {
        workItemsCallCount++;
        return new Response(JSON.stringify({ data: [{ id: "wi-1", title: "Work Item" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/members")) {
        membersCallCount++;
        return new Response(JSON.stringify({ data: [{ id: "m-1", role: "OWNER" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/teams")) {
        teamsCallCount++;
        return new Response(JSON.stringify({ data: [{ id: "t-1", name: "Core" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response("Unauthorized", { status: 401 });
  }) as typeof globalThis.fetch;

  try {
    // Fire 3 simultaneous API calls while access token is expired
    const [itemsResult, membersResult, teamsResult] = await Promise.all([
      apiFetch<Array<{ id: string }>>("/api/workspaces/ws-1/projects/p-1/work-items"),
      apiFetch<Array<{ id: string }>>("/api/workspaces/ws-1/members"),
      apiFetch<Array<{ id: string }>>("/api/workspaces/ws-1/teams"),
    ]);

    // Refresh was executed EXACTLY ONCE despite 3 parallel 401s
    assert.equal(refreshCallCount, 1);

    // All 3 requests succeeded on retry
    assert.equal(workItemsCallCount, 1);
    assert.equal(membersCallCount, 1);
    assert.equal(teamsCallCount, 1);

    assert.equal(itemsResult.length, 1);
    assert.equal(membersResult.length, 1);
    assert.equal(teamsResult.length, 1);

    assert.equal(getStoredToken(), "new_concurrency_access_token");
    assert.equal(getStoredRefreshToken(), "new_concurrency_refresh_token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("@devforge/web: Auth Session — Failed Refresh Clears Tokens & Emits Revocation Exactly Once", async () => {
  setupMockLocalStorage();
  clearStoredTokens();

  setStoredToken("expired_access_token");
  setStoredRefreshToken("revoked_refresh_token");

  let revocationCount = 0;
  const unsubscribe = onAuthRevoked(() => {
    revocationCount++;
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url === "/api/auth/refresh") {
      return new Response(
        JSON.stringify({ error: "SESSION_REVOKED", message: "Session was revoked" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "UNAUTHORIZED", message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;

  try {
    await assert.rejects(
      async () => {
        await apiFetch("/api/workspaces");
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.statusCode, 401);
        return true;
      },
    );

    // Both tokens must be cleared
    assert.equal(getStoredToken(), null);
    assert.equal(getStoredRefreshToken(), null);

    // Revocation event was fired
    assert.equal(revocationCount, 1);
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
  }
});

test("@devforge/web: Auth Session — Auth Endpoints (/login, /register) Do Not Trigger Silent Refresh Loop", async () => {
  setupMockLocalStorage();
  clearStoredTokens();

  setStoredRefreshToken("some_refresh_token");

  let refreshCallCount = 0;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url === "/api/auth/refresh") {
      refreshCallCount++;
      return new Response("Refresh endpoint", { status: 200 });
    }

    if (url === "/api/auth/login") {
      return new Response(
        JSON.stringify({ error: "INVALID_CREDENTIALS", message: "Invalid email or password" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response("Not found", { status: 404 });
  }) as typeof globalThis.fetch;

  try {
    await assert.rejects(
      async () => {
        await apiFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: "test@devforge.io", password: "wrong" }),
        });
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.statusCode, 401);
        assert.equal(err.message, "Invalid email or password");
        return true;
      },
    );

    // Refresh should NOT have been called for a failed login!
    assert.equal(refreshCallCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

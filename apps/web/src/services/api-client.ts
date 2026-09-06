export class ApiError extends Error {
  public statusCode: number;
  public errorType?: string;

  constructor(
    message: string,
    statusCode: number,
    errorType?: string,
  ) {
    super(message);

    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errorType = errorType;
  }
}

const ACCESS_TOKEN_KEY = "devforge_access_token";
const REFRESH_TOKEN_KEY = "devforge_refresh_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(refreshToken: string | null): void {
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearStoredTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

type AuthRevokedListener = () => void;
const authRevokedListeners = new Set<AuthRevokedListener>();

export function onAuthRevoked(listener: AuthRevokedListener): () => void {
  authRevokedListeners.add(listener);
  return () => {
    authRevokedListeners.delete(listener);
  };
}

export function notifyAuthRevoked(): void {
  for (const listener of authRevokedListeners) {
    try {
      listener();
    } catch (e) {
      console.error("Error in authRevoked listener:", e);
    }
  }
}

let activeRefreshPromise: Promise<string> | null = null;

export async function refreshAuthSession(): Promise<string> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  const currentRefreshToken = getStoredRefreshToken();
  if (!currentRefreshToken) {
    clearStoredTokens();
    notifyAuthRevoked();
    throw new ApiError("No refresh token available.", 401, "UNAUTHORIZED");
  }

  activeRefreshPromise = (async () => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken: currentRefreshToken,
        }),
      });

      if (!response.ok) {
        let errorData: { message?: string; error?: string } = {};
        try {
          errorData = await response.json();
        } catch {}

        const message =
          errorData.message ||
          errorData.error ||
          `Failed to refresh session (${response.status})`;

        throw new ApiError(message, response.status, errorData.error);
      }

      const data = await response.json();
      const authResult = data?.data !== undefined ? data.data : data;

      if (!authResult?.accessToken) {
        throw new ApiError(
          "Invalid authentication refresh payload received.",
          401,
          "UNAUTHORIZED",
        );
      }

      setStoredToken(authResult.accessToken);
      if (authResult.refreshToken) {
        setStoredRefreshToken(authResult.refreshToken);
      }

      return authResult.accessToken as string;
    } catch (err) {
      clearStoredTokens();
      notifyAuthRevoked();
      throw err;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

export interface ApiFetchOptions extends RequestInit {
  _isRetry?: boolean;
}

export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const token = getStoredToken();

  const headers = new Headers(options.headers);

  /*
   * Only advertise JSON when we are actually
   * sending a request body.
   */
  if (
    options.body !== undefined &&
    options.body !== null &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const isAuthEndpoint =
      endpoint.startsWith("/api/auth/login") ||
      endpoint.startsWith("/api/auth/register") ||
      endpoint.startsWith("/api/auth/refresh");

    // Attempt silent token refresh on 401 for normal authenticated endpoints
    if (response.status === 401 && !isAuthEndpoint && !options._isRetry) {
      const refreshToken = getStoredRefreshToken();

      if (refreshToken) {
        try {
          const newAccessToken = await refreshAuthSession();

          const retryHeaders = new Headers(options.headers);
          if (
            options.body !== undefined &&
            options.body !== null &&
            !retryHeaders.has("Content-Type")
          ) {
            retryHeaders.set("Content-Type", "application/json");
          }
          retryHeaders.set("Authorization", `Bearer ${newAccessToken}`);

          return await apiFetch<T>(endpoint, {
            ...options,
            headers: retryHeaders,
            _isRetry: true,
          });
        } catch {
          // If refresh failed, refreshAuthSession already cleared tokens and notified listeners
          let errorData: { message?: string; error?: string } = {};
          try {
            errorData = await response.json();
          } catch {}

          const message =
            errorData.message ||
            errorData.error ||
            `HTTP error ${response.status}: ${response.statusText}`;

          throw new ApiError(message, 401, errorData.error);
        }
      } else {
        // No refresh token available -> clear stored access token and notify
        clearStoredTokens();
        notifyAuthRevoked();
      }
    }

    let errorData: {
      message?: string;
      error?: string;
    } = {};

    try {
      errorData = await response.json();
    } catch {
      // Response body may not contain JSON.
    }

    const message =
      errorData.message ||
      errorData.error ||
      `HTTP error ${response.status}: ${response.statusText}`;

    throw new ApiError(
      message,
      response.status,
      errorData.error,
    );
  }

  /*
   * Successful 204 responses deliberately have
   * no response body.
   */
  if (response.status === 204) {
    return undefined as T;
  }

  /*
   * Some successful endpoints may theoretically
   * return an empty body even when they are not
   * 204. Avoid attempting JSON parsing when no
   * content exists.
   */
  const contentLength = response.headers.get("content-length");

  if (contentLength === "0") {
    return undefined as T;
  }

  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  let json: any;

  try {
    json = JSON.parse(text);
  } catch {
    throw new ApiError(
      "Server returned an invalid JSON response.",
      response.status,
    );
  }

  /*
   * DevForge endpoints commonly return:
   *
   * { data: ... }
   *
   * Authentication endpoints return their
   * result directly.
   */
  return (
    json?.data !== undefined
      ? json.data
      : json
  ) as T;
}
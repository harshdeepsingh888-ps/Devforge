export class ApiError extends Error {
  public statusCode: number;
  public errorType?: string;

  constructor(message: string, statusCode: number, errorType?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errorType = errorType;
  }
}

const TOKEN_KEY = "devforge_access_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // Body not JSON
    }

    const message =
      errorData?.message ||
      errorData?.error ||
      `HTTP error ${response.status}: ${response.statusText}`;

    throw new ApiError(message, response.status, errorData?.error);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  const json = await response.json();
  // Standard API format is { data: ... }
  return (json.data !== undefined ? json.data : json) as T;
}

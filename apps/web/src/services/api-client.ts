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

const TOKEN_KEY = "devforge_access_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(
  token: string | null,
): void {
  if (token) {
    localStorage.setItem(
      TOKEN_KEY,
      token,
    );
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken();

  const headers = new Headers(
    options.headers,
  );

  /*
   * Only advertise JSON when we are actually
   * sending a request body.
   *
   * Sending:
   *
   * Content-Type: application/json
   *
   * with an empty DELETE request causes Fastify
   * to reject the request before the route handler
   * executes:
   *
   * FST_ERR_CTP_EMPTY_JSON_BODY
   */
  if (
    options.body !== undefined &&
    options.body !== null &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  const response = await fetch(
    endpoint,
    {
      ...options,
      headers,
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      setStoredToken(null);
    }

    let errorData: {
      message?: string;
      error?: string;
    } = {};

    try {
      errorData =
        await response.json();
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
  const contentLength =
    response.headers.get(
      "content-length",
    );

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
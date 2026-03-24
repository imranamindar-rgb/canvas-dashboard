export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function authHeaders(method?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem("auth_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const csrf = localStorage.getItem("csrf_token");
  if (csrf && method && ["POST", "PUT", "DELETE"].includes(method)) {
    headers["X-CSRF-Token"] = csrf;
  }
  return headers;
}

async function request<T>(
  url: string,
  options?: RequestInit & { retries?: number }
): Promise<T> {
  const { retries = 2, ...fetchOptions } = options ?? {};

  // Merge auth headers with any existing headers
  const method = fetchOptions.method ?? "GET";
  const existingHeaders = (fetchOptions.headers as Record<string, string>) ?? {};
  fetchOptions.headers = { ...authHeaders(method), ...existingHeaders };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, fetchOptions);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // On 401, clear auth tokens and reload to show login screen
        if (res.status === 401) {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("csrf_token");
          window.location.reload();
          // Return a never-resolving promise since we're reloading
          return new Promise<T>(() => {});
        }
        throw new ApiError(
          res.status,
          body.error || `Request failed (${res.status})`
        );
      }
      return (await res.json()) as T;
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      lastError = err as Error;
      // Don't retry on 401 (already handled above) or 403
      if (lastError instanceof ApiError && [401, 403].includes(lastError.status)) {
        throw lastError;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
    }
  }
  throw lastError!;
}

export const api = {
  get: <T>(url: string, signal?: AbortSignal) =>
    request<T>(url, { signal }),
  post: <T>(url: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(url, {
      method: "POST",
      signal,
      ...(body
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    }),
  put: <T>(url: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(url, {
      method: "PUT",
      signal,
      ...(body
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    }),
};

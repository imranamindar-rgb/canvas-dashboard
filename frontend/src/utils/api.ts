export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  url: string,
  options?: RequestInit & { retries?: number }
): Promise<T> {
  const { retries = 2, ...fetchOptions } = options ?? {};
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, fetchOptions);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(
          res.status,
          body.error || `Request failed (${res.status})`
        );
      }
      return (await res.json()) as T;
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      lastError = err as Error;
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
};

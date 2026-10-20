/**
 * API Client Response Handling Utility
 *
 * Safely parses API responses, guaranteeing that:
 * 1. Empty response bodies (e.g. from Vite proxy when the backend is offline) do not crash
 *    with "Unexpected end of JSON input".
 * 2. Non-JSON responses (e.g. HTML error pages from proxies/gateways) are handled cleanly.
 * 3. Human-readable error messages are preserved and presented to UI components.
 * 4. Structured API envelopes (`body.data`, `body.error`) continue to work seamlessly.
 * 5. Safely supports mock Response objects in test environments where `headers` may be omitted.
 */

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ErrorPayload {
  error?: { message?: string; code?: string; details?: unknown };
  message?: string;
  code?: string;
  details?: unknown;
}

export async function parseApiResponse<T>(
  res: Response,
  fallbackMessage = "Request failed"
): Promise<T> {
  let body: ErrorPayload | null = null;
  const contentType = (typeof res.headers?.get === "function" ? res.headers.get("content-type") : "") || "";

  // If content-type is JSON or omitted (e.g. in simple test mocks), attempt JSON parsing
  if (!contentType || contentType.includes("application/json")) {
    if (typeof res.json === "function") {
      try {
        body = await res.json();
      } catch {
        body = null;
      }
    }
  }

  // If JSON parsing was not applicable or yielded null, attempt reading text if available
  if (body === null && typeof res.text === "function") {
    try {
      const text = await res.text();
      const trimmed = text.trim();
      // If server returned plain text error message (not HTML markup)
      if (trimmed && !trimmed.startsWith("<") && trimmed.length < 256) {
        body = { error: { message: trimmed } };
      }
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const message =
      body?.error?.message ||
      body?.message ||
      (res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504
        ? `API service is temporarily unavailable (HTTP ${res.status}). Please verify backend service health and connectivity.`
        : `${fallbackMessage} (HTTP ${res.status || "unknown"})`);

    const code = body?.error?.code || body?.code;
    const details = body?.error?.details || body?.details;

    throw new ApiError(message, res.status, code, details);
  }

  return (body !== null ? body : {}) as T;
}

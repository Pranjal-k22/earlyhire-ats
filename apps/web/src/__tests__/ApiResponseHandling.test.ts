import { describe, it, expect } from "vitest";
import { parseApiResponse, ApiError } from "../api/clientHelper";

describe("API Client Response Parsing & Error Handling (Regression Tests)", () => {
  it("1. Successfully parses standard JSON response envelopes", async () => {
    const mockResponse = new Response(
      JSON.stringify({ success: true, data: { id: "123", title: "Frontend Lead" } }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

    const result = await parseApiResponse<{ success: boolean; data: { id: string; title: string } }>(
      mockResponse,
      "Failed to load job"
    );

    expect(result.success).toBe(true);
    expect(result.data.title).toBe("Frontend Lead");
  });

  it("2. Handles empty 500 responses (e.g. offline Vite proxy) without throwing 'Unexpected end of JSON input'", async () => {
    // Simulates Vite's proxy returning an empty 500 when the backend port is closed
    const mockEmptyResponse = new Response("", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });

    await expect(parseApiResponse(mockEmptyResponse, "Failed to fetch jobs")).rejects.toThrowError(
      /API service is temporarily unavailable \(HTTP 500\)/
    );
  });

  it("3. Handles HTML 502/504 Bad Gateway responses from cloud proxies gracefully", async () => {
    const mockHtmlResponse = new Response("<html><body><h1>502 Bad Gateway</h1></body></html>", {
      status: 502,
      headers: { "Content-Type": "text/html" },
    });

    await expect(parseApiResponse(mockHtmlResponse, "Failed to load candidates")).rejects.toThrowError(
      /API service is temporarily unavailable \(HTTP 502\)/
    );
  });

  it("4. Extracts structured server error messages from standard JSON error payloads", async () => {
    const mockErrorResponse = new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "DUPLICATE_EMAIL",
          message: "A user with this email address already exists",
        },
      }),
      {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }
    );

    try {
      await parseApiResponse(mockErrorResponse, "Signup failed");
      expect.unreachable("Should have thrown ApiError");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe("A user with this email address already exists");
      expect(apiErr.status).toBe(409);
      expect(apiErr.code).toBe("DUPLICATE_EMAIL");
    }
  });

  it("5. Handles 204 No Content or empty OK responses without syntax errors", async () => {
    const mockNoContentResponse = new Response(null, {
      status: 204,
      headers: {},
    });

    const result = await parseApiResponse(mockNoContentResponse, "Operation failed");
    expect(result).toEqual({});
  });

  it("6. Handles plain text non-HTML error messages gracefully", async () => {
    const mockTextError = new Response("Service is overloaded, please retry shortly", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });

    await expect(parseApiResponse(mockTextError, "Request failed")).rejects.toThrowError(
      "Service is overloaded, please retry shortly"
    );
  });

  it("7. Ensures 5xx fallback messages do not leak hardcoded localhost URLs", async () => {
    const mock503 = new Response("", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });

    try {
      await parseApiResponse(mock503, "Request failed");
      expect.unreachable("Should have thrown ApiError");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.message).toContain("API service is temporarily unavailable (HTTP 503)");
      expect(apiErr.message).not.toContain("localhost");
      expect(apiErr.message).not.toContain("5000");
    }
  });
});


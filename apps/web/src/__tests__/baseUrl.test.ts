import { describe, it, expect } from "vitest";
import { getApiBase } from "../api/baseUrl";

describe("API Base URL Normalization (getApiBase)", () => {
  it("strips trailing /api/v1 from full Render hostname", () => {
    expect(getApiBase("https://earlyhire-ats-api.onrender.com/api/v1")).toBe(
      "https://earlyhire-ats-api.onrender.com"
    );
  });

  it("strips trailing /api/v1/ with trailing slash", () => {
    expect(getApiBase("https://earlyhire-ats-api.onrender.com/api/v1/")).toBe(
      "https://earlyhire-ats-api.onrender.com"
    );
  });

  it("strips trailing /api when version is omitted", () => {
    expect(getApiBase("https://earlyhire-ats-api.onrender.com/api")).toBe(
      "https://earlyhire-ats-api.onrender.com"
    );
  });

  it("strips trailing /api/ with slash", () => {
    expect(getApiBase("https://earlyhire-ats-api.onrender.com/api/")).toBe(
      "https://earlyhire-ats-api.onrender.com"
    );
  });

  it("preserves naked origin hostname without trailing slash", () => {
    expect(getApiBase("https://earlyhire-ats-api.onrender.com")).toBe(
      "https://earlyhire-ats-api.onrender.com"
    );
  });

  it("strips multiple trailing slashes from naked origin", () => {
    expect(getApiBase("https://earlyhire-ats-api.onrender.com///")).toBe(
      "https://earlyhire-ats-api.onrender.com"
    );
  });

  it("handles leading and trailing whitespace properly", () => {
    expect(getApiBase("  https://earlyhire-ats-api.onrender.com/api/v1   ")).toBe(
      "https://earlyhire-ats-api.onrender.com"
    );
  });

  it("returns empty string when input is empty string or whitespace", () => {
    expect(getApiBase("")).toBe("");
    expect(getApiBase("   ")).toBe("");
  });

  it("allows seamless URL construction with /api/v1 endpoints without double slashes or duplicated prefixes", () => {
    const base = getApiBase("https://earlyhire-ats-api.onrender.com/api/v1/");
    const endpoint = `${base}/api/v1/health`;
    expect(endpoint).toBe("https://earlyhire-ats-api.onrender.com/api/v1/health");
  });

  it("works seamlessly with relative endpoints when base is empty", () => {
    const base = getApiBase("");
    const endpoint = `${base}/api/v1/health`;
    expect(endpoint).toBe("/api/v1/health");
  });
});

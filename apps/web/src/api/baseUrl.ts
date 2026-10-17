/**
 * Normalizes the API base URL from Vite environment variables.
 * If VITE_API_URL is configured (e.g. "https://earlyhire-ats-api.onrender.com/api/v1"
 * or "https://earlyhire-ats-api.onrender.com"), strips trailing slashes or /api/v1.
 * Returns empty string by default so relative requests ("/api/v1/...") work seamlessly
 * in local development (Vite proxy) and with Vercel rewrites.
 */
export const getApiBase = (): string => {
  const rawUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (!rawUrl) return "";
  return rawUrl.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");
};

export const API_BASE = getApiBase();

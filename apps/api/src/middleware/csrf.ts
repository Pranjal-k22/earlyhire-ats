import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler.js";
import { env } from "../config/env.js";

/**
 * Validates whether an origin string is in the allowed list.
 */
export const isAllowedOrigin = (origin: string): boolean => {
  if (origin === env.CLIENT_URL) {
    return true;
  }

  // In test and development modes, allow localhost and 127.0.0.1 variants
  if (env.NODE_ENV !== "production") {
    if (
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:") ||
      origin === "http://localhost" ||
      origin === "http://127.0.0.1"
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Validates Origin and Referer headers on state-changing requests (POST, PUT, PATCH, DELETE).
 * Protects against cross-site request forgery when using ambient credentials (cookies).
 */
export const verifyOrigin = (req: Request, _res: Response, next: NextFunction): void => {
  const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (!stateChangingMethods.includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;

  // If no Origin header was sent, inspect Referer header if present
  if (!origin) {
    const referer = req.headers.referer;
    if (referer) {
      try {
        const refererOrigin = new URL(referer).origin;
        if (!isAllowedOrigin(refererOrigin)) {
          return next(new AppError("Cross-origin request blocked by CSRF protection policy", 403, "CSRF_FORBIDDEN"));
        }
      } catch {
        return next(new AppError("Invalid Referer header format", 403, "CSRF_FORBIDDEN"));
      }
    }
    return next();
  }

  // If Origin header is present, it MUST match the allowed origins
  if (!isAllowedOrigin(origin)) {
    return next(new AppError("Cross-origin request blocked by CSRF protection policy", 403, "CSRF_FORBIDDEN"));
  }

  next();
};

import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipInTest?: boolean;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export interface RateLimiterMiddleware {
  (req: Request, res: Response, next: NextFunction): void;
  reset: () => void;
}

/**
 * Creates an in-memory sliding-window rate limiter middleware.
 * Tracks client IP requests and enforces maximum requests per window.
 */
export const createRateLimiter = (options: RateLimiterOptions): RateLimiterMiddleware => {
  const clients = new Map<string, ClientRecord>();

  // Periodically sweep expired client records to prevent memory leak
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of clients.entries()) {
      if (now > record.resetTime) {
        clients.delete(ip);
      }
    }
  }, 60000);

  if (cleanup.unref) {
    cleanup.unref();
  }

  const limiter = (req: Request, res: Response, next: NextFunction): void => {
    if (options.skipInTest && env.NODE_ENV === "test") {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const now = Date.now();

    let record = clients.get(ip);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      clients.set(ip, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, options.maxRequests - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader("X-RateLimit-Limit", options.maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));

    if (record.count > options.maxRequests) {
      res.setHeader("Retry-After", resetSeconds);
      res.status(429).json({
        success: false,
        error: {
          code: "TOO_MANY_REQUESTS",
          message: options.message || "Too many requests. Please try again later.",
        },
      });
      return;
    }

    next();
  };

  limiter.reset = (): void => {
    clients.clear();
  };

  return limiter;
};

/**
 * Standard rate limiter for sensitive authentication endpoints (login, signup).
 * Allows 10 attempts per 15 minutes in production and development.
 * Allows 100 attempts in test mode to support parallel test suites.
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: env.NODE_ENV === "test" ? 100 : 10,
  message: "Too many authentication attempts. Please try again in 15 minutes.",
});

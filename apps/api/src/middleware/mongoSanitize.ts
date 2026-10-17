import { Request, Response, NextFunction } from "express";

/**
 * Recursively inspects data to determine if it contains MongoDB operator keys
 * (e.g., keys starting with '$' or containing '.').
 */
const hasMongoOperators = (value: unknown): boolean => {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some(hasMongoOperators);
  }

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key.startsWith("$") || key.includes(".")) {
      return true;
    }
    if (hasMongoOperators(record[key])) {
      return true;
    }
  }

  return false;
};

/**
 * Middleware that inspects request body, query params, and route params
 * to detect and block MongoDB operator injection attacks.
 */
export const sanitizeMongo = (req: Request, res: Response, next: NextFunction): void => {
  if (
    hasMongoOperators(req.body) ||
    hasMongoOperators(req.query) ||
    hasMongoOperators(req.params)
  ) {
    res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Prohibited query operators detected in request",
      },
    });
    return;
  }

  next();
};

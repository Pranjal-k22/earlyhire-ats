import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR", details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        details: err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Handle Mongoose CastError (e.g., malformed ObjectId)
  if (err.name === "CastError") {
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_ID",
        message: "Invalid resource identifier format",
      },
    });
    return;
  }

  // Handle Express body-parser payload too large
  const errorWithStatus = err as { status?: number; statusCode?: number; type?: string };
  if (errorWithStatus.type === "entity.too.large" || errorWithStatus.status === 413 || errorWithStatus.statusCode === 413) {
    res.status(413).json({
      success: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request payload exceeds configured size limit",
      },
    });
    return;
  }

  // Fallback for unexpected errors
  const isDev = env.NODE_ENV === "development";
  console.error("Unhandled Application Error:", err);

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected internal server error occurred",
      ...(isDev ? { stack: err.stack } : {}),
    },
  });
};

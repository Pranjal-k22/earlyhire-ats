import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler.js";
import { AUTH_COOKIE_NAME, verifyToken } from "../utils/jwt.js";
import { User, UserRole } from "../models/user.model.js";

/**
 * Middleware ensuring incoming requests contain a valid, unexpired session JWT.
 * Reads token from the HttpOnly session cookie, or Authorization header if present.
 */
export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined = req.cookies?.[AUTH_COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    let decoded: ReturnType<typeof verifyToken>;
    try {
      decoded = verifyToken(token);
    } catch {
      return next(new AppError("Invalid or expired authentication session", 401, "UNAUTHENTICATED"));
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new AppError("User account no longer exists", 401, "UNAUTHENTICATED"));
    }

    if (!user.isActive) {
      return next(new AppError("User account is inactive", 403, "FORBIDDEN"));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based access control middleware.
 * Enforces that the authenticated user possesses one of the allowed roles.
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError("Insufficient permissions to access this resource", 403, "FORBIDDEN")
      );
    }

    next();
  };
};

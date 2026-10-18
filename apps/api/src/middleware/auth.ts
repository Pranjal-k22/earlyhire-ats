import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler.js";
import { AUTH_COOKIE_NAME, verifyToken } from "../utils/jwt.js";
import { User, UserRole, CanonicalRole, normalizeRole } from "../models/user.model.js";

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
 * Enforces that the authenticated user possesses one of the allowed roles,
 * checking both exact role match and canonical role normalization.
 */
export const requireRole = (...allowedRoles: (UserRole | CanonicalRole)[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const userExactRole = req.user.role;
    const userCanonicalRole = normalizeRole(userExactRole);

    const isAuthorized = allowedRoles.some((allowed) => {
      // 1. Direct exact role match
      if (allowed === userExactRole) return true;

      // 2. Platform managers / admins possess all recruiter and hiring_team permissions
      if (
        (userCanonicalRole === "platform_manager" || userExactRole === "admin") &&
        (allowed === "platform_manager" || allowed === "admin" || allowed === "hiring_team" || allowed === "recruiter" || allowed === "hiring_manager")
      ) {
        return true;
      }

      // 3. Authorized canonical hiring_team and legacy recruiter have full recruitment permissions
      if (
        (userExactRole === "hiring_team" || userExactRole === "recruiter") &&
        (allowed === "hiring_team" || allowed === "recruiter" || allowed === "hiring_manager")
      ) {
        return true;
      }

      // 4. Legacy hiring_manager has read-only access and only matches when hiring_manager is explicitly allowed
      if (userExactRole === "hiring_manager") {
        return allowed === "hiring_manager";
      }

      // 5. Canonical candidate match
      if (userCanonicalRole === "candidate" && allowed === "candidate") {
        return true;
      }

      return false;
    });

    if (!isAuthorized) {
      return next(
        new AppError("Insufficient permissions to access this resource", 403, "FORBIDDEN")
      );
    }

    next();
  };
};

/**
 * Object-level access control middleware:
 * Ensures the requesting user either owns the resource (matches req.params[paramName])
 * or possesses one of the privileged roles (e.g. "hiring_team", "platform_manager").
 */
export const requireSelfOrRole = (
  paramName: string,
  ...privilegedRoles: (UserRole | CanonicalRole)[]
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const targetId = req.params[paramName];
    if (targetId && (req.user.id === targetId || req.user._id?.toString() === targetId)) {
      return next();
    }

    const userExactRole = req.user.role;
    const userCanonicalRole = normalizeRole(userExactRole);

    const isPrivileged = privilegedRoles.some((role) => {
      if (role === userExactRole) return true;
      if (
        (userCanonicalRole === "platform_manager" || userExactRole === "admin") &&
        (role === "platform_manager" || role === "admin" || role === "hiring_team" || role === "recruiter" || role === "hiring_manager")
      ) {
        return true;
      }
      if (
        (userExactRole === "hiring_team" || userExactRole === "recruiter") &&
        (role === "hiring_team" || role === "recruiter" || role === "hiring_manager")
      ) {
        return true;
      }
      if (userExactRole === "hiring_manager") {
        return role === "hiring_manager";
      }
      return false;
    });

    if (isPrivileged) {
      return next();
    }

    return next(new AppError("You do not have permission to access or modify this resource", 403, "FORBIDDEN"));
  };
};

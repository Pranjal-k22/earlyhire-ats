import { Request, Response, NextFunction } from "express";
import { signupSchema, loginSchema } from "../schemas/auth.schema.js";
import { User, UserRole, normalizeRole } from "../models/user.model.js";
import { AppError } from "../middleware/errorHandler.js";
import { signToken, getAuthCookieOptions, AUTH_COOKIE_NAME } from "../utils/jwt.js";

/**
 * Handles user signup.
 * Allows 'candidate' or 'recruiter'/'hiring_team', defaulting to 'recruiter' for backward compatibility.
 * Strictly prevents privilege escalation to 'admin' or 'platform_manager'.
 */
export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = signupSchema.parse(req.body);

    // Normalize email (lowercase and trimmed)
    const normalizedEmail = validated.email.trim().toLowerCase();

    // Check for existing user with duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return next(new AppError("An account with this email already exists", 409, "EMAIL_EXISTS"));
    }

    // Securely hash password
    const passwordHash = await User.hashPassword(validated.password);

    // Public signups allow candidate or hiring team; strictly forbids admin / platform_manager
    let assignedRole: UserRole = "recruiter";
    if (validated.role === "candidate") {
      assignedRole = "candidate";
    } else if (validated.role === "hiring_team") {
      assignedRole = "hiring_team";
    } else {
      assignedRole = "recruiter";
    }

    const user = await User.create({
      name: validated.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: assignedRole,
      isActive: true,
      lastLoginAt: new Date(),
    });

    // Issue JWT session token
    const token = signToken({ id: user.id, role: user.role });

    // Set secure HttpOnly cookie
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    // Safe user representation (passwordHash excluded)
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          canonicalRole: normalizeRole(user.role),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles user authentication.
 * Returns generic error on invalid credentials to prevent email enumeration.
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = loginSchema.parse(req.body);
    const normalizedEmail = validated.email.trim().toLowerCase();

    // Query user with passwordHash explicitly selected
    const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");

    if (!user) {
      return next(new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS"));
    }

    const isMatch = await user.comparePassword(validated.password);
    if (!isMatch) {
      return next(new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS"));
    }

    if (!user.isActive) {
      return next(new AppError("Your account has been deactivated. Please contact an administrator.", 403, "FORBIDDEN"));
    }

    // Update last login timestamp atomically
    await User.findByIdAndUpdate(user.id, { lastLoginAt: new Date() });

    // Issue JWT session token
    const token = signToken({ id: user.id, role: user.role });

    // Set secure HttpOnly cookie
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          canonicalRole: normalizeRole(user.role),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clears the session cookie to securely log the user out.
 */
export const logout = async (_req: Request, res: Response): Promise<void> => {
  const cookieOptions = getAuthCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: cookieOptions.httpOnly,
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
    path: cookieOptions.path,
  });

  res.status(200).json({
    success: true,
    data: {
      loggedOut: true,
    },
  });
};

/**
 * Returns the currently authenticated user's profile.
 */
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          canonicalRole: normalizeRole(req.user.role),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

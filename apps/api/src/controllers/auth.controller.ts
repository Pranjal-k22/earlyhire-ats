import { Request, Response, NextFunction } from "express";
import { signupSchema, loginSchema, recruiterSignupSchema } from "../schemas/auth.schema.js";
import { User, UserRole, normalizeRole } from "../models/user.model.js";
import { AppError } from "../middleware/errorHandler.js";
import { signToken, getAuthCookieOptions, AUTH_COOKIE_NAME } from "../utils/jwt.js";
import { env } from "../config/env.js";

/**
 * Handles candidate user signup.
 * Strictly creates candidate accounts.
 * Prevents privilege escalation to 'admin', 'platform_manager', or privileged recruiter accounts.
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

    // Phase A — Public registration security:
    // 1. Public candidate registration strictly creates candidate accounts.
    // 2. Reject attempted privilege escalation (admin, platform_manager, hiring_team, recruiter, hiring_manager) with 403 FORBIDDEN.
    if (validated.role && validated.role !== "candidate") {
      return next(
        new AppError(
          "Public registration is restricted to candidate accounts. Privileged accounts (hiring_team, platform_manager) must be provisioned through an authorized process.",
          403,
          "FORBIDDEN"
        )
      );
    }

    const assignedRole: UserRole = "candidate";

    const user = await User.create({
      name: validated.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: assignedRole,
      approvalStatus: "approved",
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
          company: user.company || "",
          department: user.department || "",
          approvalStatus: user.approvalStatus || "approved",
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles dedicated recruiter registration.
 * Collects name, work email, password, company, department, phone, headline, and optional inviteCode.
 * If a valid recruiter invitation code is supplied, the account is immediately approved.
 * Otherwise, the account enters the pending-approval workflow (approvalStatus = 'pending').
 * Privilege escalation to 'admin' or 'platform_manager' is strictly rejected.
 */
export const signupRecruiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = recruiterSignupSchema.parse(req.body);

    const normalizedEmail = validated.email.trim().toLowerCase();

    // Check for existing user with duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return next(new AppError("An account with this email already exists", 409, "EMAIL_EXISTS"));
    }

    // Determine approval status via server-side verification:
    // If a valid invite code is supplied matching the configured RECRUITER_INVITE_CODE, approve immediately.
    // Otherwise, require administrator/platform_manager approval.
    const isApprovedWithCode = Boolean(
      validated.inviteCode &&
      env.RECRUITER_INVITE_CODE &&
      validated.inviteCode.trim() === env.RECRUITER_INVITE_CODE.trim()
    );

    const approvalStatus = isApprovedWithCode ? "approved" : "pending";
    const approvedAt = isApprovedWithCode ? new Date() : null;

    // Securely hash password
    const passwordHash = await User.hashPassword(validated.password);

    const assignedRole: UserRole = "hiring_team"; // Canonical recruiter role

    const user = await User.create({
      name: validated.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: assignedRole,
      company: validated.company.trim(),
      department: validated.department?.trim() || "",
      headline: validated.headline?.trim() || (validated.department ? `${validated.department} Recruiter` : "Recruiter"),
      phone: validated.phone?.trim() || "",
      approvalStatus,
      approvedAt,
      isActive: true,
      lastLoginAt: new Date(),
    });

    // Issue JWT session token
    const token = signToken({ id: user.id, role: user.role });

    // Set secure HttpOnly cookie
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          canonicalRole: normalizeRole(user.role),
          company: user.company,
          department: user.department,
          approvalStatus: user.approvalStatus,
        },
        requiresApproval: approvalStatus === "pending",
        message:
          approvalStatus === "pending"
            ? "Recruiter registration submitted successfully. Your account is pending administrator approval."
            : "Recruiter account registered and activated successfully.",
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
          company: user.company || "",
          department: user.department || "",
          approvalStatus: user.approvalStatus || "approved",
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
          company: req.user.company || "",
          department: req.user.department || "",
          approvalStatus: req.user.approvalStatus || "approved",
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

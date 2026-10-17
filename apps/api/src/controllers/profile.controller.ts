import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { User, normalizeRole } from "../models/user.model.js";
import { AppError } from "../middleware/errorHandler.js";

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
  headline: z.string().trim().max(150, "Headline cannot exceed 150 characters").optional(),
  phone: z.string().trim().max(30, "Phone cannot exceed 30 characters").optional(),
  bio: z.string().trim().max(2000, "Bio cannot exceed 2000 characters").optional(),
  skills: z.array(z.string().trim()).max(50, "Maximum 50 skills allowed").optional(),
});

/**
 * Retrieves the authenticated user's profile and self-service details.
 */
export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new AppError("User profile not found", 404, "NOT_FOUND"));
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          canonicalRole: normalizeRole(user.role),
          headline: user.headline || "",
          phone: user.phone || "",
          bio: user.bio || "",
          skills: user.skills || [],
          resumeId: user.resumeId || null,
          candidateProfileId: user.candidateProfileId || null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates candidate self-service profile fields.
 * Strictly ignores and protects sensitive administrative fields (role, email, passwordHash, isActive).
 */
export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const validated = updateProfileSchema.parse(req.body);

    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.headline !== undefined) updateData.headline = validated.headline;
    if (validated.phone !== undefined) updateData.phone = validated.phone;
    if (validated.bio !== undefined) updateData.bio = validated.bio;
    if (validated.skills !== undefined) updateData.skills = validated.skills;

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateData, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!updatedUser) {
      return next(new AppError("User profile not found", 404, "NOT_FOUND"));
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          canonicalRole: normalizeRole(updatedUser.role),
          headline: updatedUser.headline || "",
          phone: updatedUser.phone || "",
          bio: updatedUser.bio || "",
          skills: updatedUser.skills || [],
          resumeId: updatedUser.resumeId || null,
          updatedAt: updatedUser.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

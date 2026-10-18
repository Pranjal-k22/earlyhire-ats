import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Candidate } from "../models/candidate.model.js";
import {
  createCandidateSchema,
  updateCandidateSchema,
  candidateQuerySchema,
} from "../schemas/candidate.schema.js";
import { AppError } from "../middleware/errorHandler.js";
import { normalizeRole } from "../models/user.model.js";

/**
 * Escapes regex metacharacters to prevent ReDoS and query injection.
 */
const escapeRegex = (text: string): string => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

/**
 * Creates a new candidate profile.
 * Enforces email uniqueness and sets audit fields from the authenticated user.
 */
export const createCandidate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const validated = createCandidateSchema.parse(req.body);

    // Enforce email uniqueness among active candidate records
    const existing = await Candidate.findOne({
      email: validated.email,
      archivedAt: null,
    });

    if (existing) {
      return next(
        new AppError(
          "A candidate with this email address already exists",
          409,
          "CANDIDATE_EMAIL_EXISTS"
        )
      );
    }

    const candidateData = {
      ...validated,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      archivedAt: null,
    };

    const candidate = await Candidate.create(candidateData);

    res.status(201).json({
      success: true,
      data: {
        candidate,
      },
    });
  } catch (error: unknown) {
    if ((error as { code?: number })?.code === 11000) {
      return next(
        new AppError(
          "A candidate with this email address already exists",
          409,
          "CANDIDATE_EMAIL_EXISTS"
        )
      );
    }
    next(error);
  }
};

/**
 * Lists candidates with server-side pagination, regex search, and structured filters.
 */
export const getCandidates = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = candidateQuerySchema.parse(req.query);
    const filter: Record<string, unknown> = {};

    // Exclude archived candidates by default
    if (!query.includeArchived) {
      filter.archivedAt = null;
    }

    // Text search on name, fullName, email, currentTitle, or skills
    if (query.search && query.search.trim()) {
      const sanitized = escapeRegex(query.search.trim());
      filter.$or = [
        { name: { $regex: sanitized, $options: "i" } },
        { fullName: { $regex: sanitized, $options: "i" } },
        { email: { $regex: sanitized, $options: "i" } },
        { currentTitle: { $regex: sanitized, $options: "i" } },
        { skills: { $regex: sanitized, $options: "i" } },
      ];
    }

    // Specific skill filter
    if (query.skill && query.skill.trim()) {
      const sanitizedSkill = escapeRegex(query.skill.trim());
      filter.skills = { $regex: `^${sanitizedSkill}$`, $options: "i" };
    }

    // Source filter
    if (query.source && query.source.trim() && query.source.toLowerCase() !== "all") {
      filter.source = query.source;
    }

    // Date range filter on createdAt
    if (query.createdFrom || query.createdTo) {
      const dateFilter: Record<string, Date> = {};
      if (query.createdFrom) {
        const fromDate = new Date(query.createdFrom);
        if (!isNaN(fromDate.getTime())) {
          dateFilter.$gte = fromDate;
        }
      }
      if (query.createdTo) {
        const toDate = new Date(query.createdTo);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          dateFilter.$lte = toDate;
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        filter.createdAt = dateFilter;
      }
    }

    // Experience range filter
    if (query.experienceMin !== undefined || query.experienceMax !== undefined) {
      const expFilter: Record<string, number> = {};
      if (query.experienceMin !== undefined) expFilter.$gte = query.experienceMin;
      if (query.experienceMax !== undefined) expFilter.$lte = query.experienceMax;
      filter.experienceYears = expFilter;
    }

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const sortField = query.sort === "fullName" ? "name" : query.sort;
    const sortOrder = query.order === "asc" ? 1 : -1;
    const sortObj: Record<string, 1 | -1> = { [sortField]: sortOrder };

    const [total, candidates] = await Promise.all([
      Candidate.countDocuments(filter),
      Candidate.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email role")
        .populate("updatedBy", "name email role"),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      data: candidates,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a single candidate profile by MongoDB ObjectId.
 */
export const getCandidateById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid candidate ID format", 400, "INVALID_ID"));
    }

    const candidate = await Candidate.findById(id)
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role");

    if (!candidate) {
      return next(new AppError("Candidate not found", 404, "CANDIDATE_NOT_FOUND"));
    }

    const userRole = normalizeRole(req.user?.role || "candidate");
    if (userRole === "candidate") {
      const isOwner =
        (req.user?.candidateProfileId && req.user.candidateProfileId.toString() === candidate.id.toString()) ||
        (candidate.email && candidate.email.toLowerCase() === req.user?.email.toLowerCase()) ||
        (candidate.createdBy && candidate.createdBy.toString() === req.user?.id);

      if (!isOwner) {
        return next(new AppError("You do not have permission to view this candidate profile", 403, "FORBIDDEN"));
      }
    }

    res.status(200).json({
      success: true,
      data: {
        candidate,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates an existing candidate profile.
 * Allowlisted fields only; updates audit reference `updatedBy`.
 */
export const updateCandidate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid candidate ID format", 400, "INVALID_ID"));
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return next(new AppError("Candidate not found", 404, "CANDIDATE_NOT_FOUND"));
    }

    const validated = updateCandidateSchema.parse(req.body);

    // Check duplicate email if email is being updated
    if (validated.email && validated.email !== candidate.email) {
      const existing = await Candidate.findOne({
        email: validated.email,
        _id: { $ne: candidate._id },
        archivedAt: null,
      });

      if (existing) {
        return next(
          new AppError(
            "A candidate with this email address already exists",
            409,
            "CANDIDATE_EMAIL_EXISTS"
          )
        );
      }
      candidate.email = validated.email;
    }

    if (validated.name !== undefined) {
      candidate.name = validated.name;
      candidate.fullName = validated.name;
    } else if (validated.fullName !== undefined) {
      candidate.name = validated.fullName;
      candidate.fullName = validated.fullName;
    }

    if (validated.phone !== undefined) candidate.phone = validated.phone;
    if (validated.location !== undefined) candidate.location = validated.location;
    if (validated.currentTitle !== undefined) candidate.currentTitle = validated.currentTitle;
    if (validated.experienceYears !== undefined) candidate.experienceYears = validated.experienceYears;
    if (validated.skills !== undefined) candidate.skills = validated.skills;
    if (validated.resumeUrl !== undefined) candidate.resumeUrl = validated.resumeUrl;
    if (validated.source !== undefined) candidate.source = validated.source;
    if (validated.summary !== undefined) candidate.summary = validated.summary;

    if (req.user) {
      candidate.updatedBy = req.user._id;
    }

    await candidate.save();

    res.status(200).json({
      success: true,
      data: {
        candidate,
      },
    });
  } catch (error: unknown) {
    if ((error as { code?: number })?.code === 11000) {
      return next(
        new AppError(
          "A candidate with this email address already exists",
          409,
          "CANDIDATE_EMAIL_EXISTS"
        )
      );
    }
    next(error);
  }
};

/**
 * Soft archives a candidate profile according to data retention policy.
 * Preserves historical applications, notes, and stage event linkages.
 */
export const deleteCandidate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid candidate ID format", 400, "INVALID_ID"));
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return next(new AppError("Candidate not found", 404, "CANDIDATE_NOT_FOUND"));
    }

    candidate.archivedAt = new Date();
    if (req.user) {
      candidate.updatedBy = req.user._id;
    }

    await candidate.save();

    res.status(200).json({
      success: true,
      data: {
        candidate,
        archived: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

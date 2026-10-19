import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Job } from "../models/job.model.js";
import { createJobSchema, updateJobSchema, jobQuerySchema } from "../schemas/job.schema.js";
import { AppError } from "../middleware/errorHandler.js";
import { sseEventHub } from "../services/sse/sseEventHub.js";

/**
 * Escapes regex metacharacters to prevent ReDoS and injection in text searches.
 */
const escapeRegex = (text: string): string => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

/**
 * Creates a new job opening.
 * Restricts ownerId to the authenticated user.
 */
export const createJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const validated = createJobSchema.parse(req.body);

    const jobData = {
      ...validated,
      ownerId: req.user._id,
      archivedAt: validated.status === "Archived" ? new Date() : null,
    };

    const job = await Job.create(jobData);

    sseEventHub.broadcast({
      type: "job:created",
      entity: "job",
      entityId: job.id,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists jobs with bounded pagination, allowlisted sorting, and structured filters.
 */
export const getJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = jobQuerySchema.parse(req.query);
    const filter: Record<string, unknown> = {};

    // Text search on title or department
    if (query.search && query.search.trim()) {
      const sanitized = escapeRegex(query.search.trim());
      filter.$or = [
        { title: { $regex: sanitized, $options: "i" } },
        { department: { $regex: sanitized, $options: "i" } },
        { location: { $regex: sanitized, $options: "i" } },
      ];
    }

    // Status filtering
    if (query.status && query.status.toLowerCase() !== "all") {
      const normalizedStatus =
        query.status.charAt(0).toUpperCase() + query.status.slice(1).toLowerCase();
      filter.status = normalizedStatus;
    } else if (!query.includeArchived) {
      // Default: exclude archived jobs from regular lists
      filter.status = { $ne: "Archived" };
      filter.archivedAt = null;
    }

    // Optional department filter
    if (query.department && query.department.trim()) {
      filter.department = { $regex: escapeRegex(query.department.trim()), $options: "i" };
    }

    // Optional location filter
    if (query.location && query.location.trim()) {
      filter.location = { $regex: escapeRegex(query.location.trim()), $options: "i" };
    }

    // Optional employment type filter
    if (query.employmentType && query.employmentType.trim()) {
      filter.employmentType = query.employmentType.trim();
    }

    // Optional created date range filter
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

    const total = await Job.countDocuments(filter);
    const skip = (query.page - 1) * query.limit;

    const sortOrder = query.order === "asc" ? 1 : -1;
    const sortField = query.sort || "openedAt";

    const jobs = await Job.find(filter)
      .sort({ [sortField]: sortOrder, _id: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate("ownerId", "name email role");

    const totalPages = Math.ceil(total / query.limit);

    res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a single job by its MongoDB ObjectId.
 */
export const getJobById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid job ID format", 400, "INVALID_ID"));
    }

    const job = await Job.findById(id).populate("ownerId", "name email role");

    if (!job) {
      return next(new AppError("Job opening not found", 404, "JOB_NOT_FOUND"));
    }

    res.status(200).json({
      success: true,
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates an existing job opening using field allowlisting.
 */
export const updateJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid job ID format", 400, "INVALID_ID"));
    }

    const validated = updateJobSchema.parse(req.body);

    const job = await Job.findById(id);
    if (!job) {
      return next(new AppError("Job opening not found", 404, "JOB_NOT_FOUND"));
    }

    // Handle status transitions and archiving flags
    if (validated.status) {
      if (validated.status === "Archived" && job.status !== "Archived") {
        job.archivedAt = new Date();
      } else if (validated.status !== "Archived" && job.status === "Archived") {
        job.archivedAt = null;
      }
      job.status = validated.status;
    }

    if (validated.title !== undefined) job.title = validated.title;
    if (validated.department !== undefined) job.department = validated.department;
    if (validated.location !== undefined) job.location = validated.location;
    if (validated.employmentType !== undefined) job.employmentType = validated.employmentType;
    if (validated.description !== undefined) job.description = validated.description;
    if (validated.requirements !== undefined) job.requirements = validated.requirements;
    if (validated.experienceMin !== undefined) job.experienceMin = validated.experienceMin;
    if (validated.experienceMax !== undefined) job.experienceMax = validated.experienceMax;
    if (validated.closesAt !== undefined) job.closesAt = validated.closesAt;

    await job.save();

    sseEventHub.broadcast({
      type: "job:updated",
      entity: "job",
      entityId: job.id,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft archives a job per data integrity rules (preserves linked records and history).
 */
export const deleteJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid job ID format", 400, "INVALID_ID"));
    }

    const job = await Job.findById(id);
    if (!job) {
      return next(new AppError("Job opening not found", 404, "JOB_NOT_FOUND"));
    }

    // Soft archive rather than physical cascade deletion
    job.status = "Archived";
    job.archivedAt = new Date();
    await job.save();

    sseEventHub.broadcast({
      type: "job:updated",
      entity: "job",
      entityId: job.id,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      data: {
        job,
        archived: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

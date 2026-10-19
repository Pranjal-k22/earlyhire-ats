import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Job } from "../models/job.model.js";
import { Application } from "../models/application.model.js";
import { Interview } from "../models/interview.model.js";
import { Offer } from "../models/offer.model.js";
import { User, normalizeRole } from "../models/user.model.js";
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
 * Returns IDs of all other recruiters in the system to prevent cross-recruiter job leakage.
 */
const getOtherRecruiterIds = async (
  userId: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId[]> => {
  const otherRecruiters = await User.find({
    role: { $in: ["recruiter", "hiring_team", "hiring_manager"] },
    _id: { $ne: userId },
  }).select("_id");
  return otherRecruiters.map((r) => r._id as mongoose.Types.ObjectId);
};

/**
 * Creates a new job opening.
 * Recruiter role sets ownerId to the authenticated recruiter.
 * Platform manager can optionally assign to a recruiter or self.
 */
export const createJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const validated = createJobSchema.parse(req.body);
    const userRole = normalizeRole(req.user.role);

    let ownerId = req.user._id;
    if (userRole === "platform_manager" && (req.body as { ownerId?: string }).ownerId) {
      const customOwner = (req.body as { ownerId: string }).ownerId;
      if (mongoose.Types.ObjectId.isValid(customOwner)) {
        ownerId = new mongoose.Types.ObjectId(customOwner);
      }
    }

    const jobData = {
      ...validated,
      ownerId,
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
 * - Recruiters (hiring_team) can only view jobs posted by themselves.
 * - Candidates can only view active, open jobs.
 * - Admins (platform_manager) have full visibility across all jobs.
 */
export const getJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = jobQuerySchema.parse(req.query);
    const filter: Record<string, unknown> = {};

    const userRole = req.user ? normalizeRole(req.user.role) : "candidate";

    if (userRole === "hiring_team") {
      // Recruiter isolation: strictly cannot see jobs posted by another recruiter
      const otherRecruiterIds = await getOtherRecruiterIds(req.user!._id);
      if (otherRecruiterIds.length > 0) {
        filter.ownerId = { $nin: otherRecruiterIds };
      }
    } else if (userRole === "candidate") {
      // Candidates can only view open jobs
      filter.status = "Open";
      filter.archivedAt = null;
    }

    // Text search on title or department
    if (query.search && query.search.trim()) {
      const sanitized = escapeRegex(query.search.trim());
      filter.$or = [
        { title: { $regex: sanitized, $options: "i" } },
        { department: { $regex: sanitized, $options: "i" } },
        { location: { $regex: sanitized, $options: "i" } },
      ];
    }

    // Status filtering (only applicable for non-candidates)
    if (userRole !== "candidate") {
      if (query.status && query.status.toLowerCase() !== "all") {
        const normalizedStatus =
          query.status.charAt(0).toUpperCase() + query.status.slice(1).toLowerCase();
        filter.status = normalizedStatus;
      } else if (!query.includeArchived) {
        // Default: exclude archived jobs from regular lists
        filter.status = { $ne: "Archived" };
        filter.archivedAt = null;
      }
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

    // Compute pipeline counts for returned jobs in one efficient aggregation
    const jobIds = jobs.map((j) => j._id);
    const stageAggregation = await Application.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      {
        $group: {
          _id: { jobId: "$jobId", stage: { $ifNull: ["$currentStage", "$stage"] } },
          count: { $sum: 1 },
        },
      },
    ]);

    const countsMap: Record<
      string,
      {
        total: number;
        Applied: number;
        Screening: number;
        Interview: number;
        Offer: number;
        Hired: number;
        Rejected: number;
      }
    > = {};

    for (const item of stageAggregation) {
      const jId = item._id.jobId.toString();
      if (!countsMap[jId]) {
        countsMap[jId] = {
          total: 0,
          Applied: 0,
          Screening: 0,
          Interview: 0,
          Offer: 0,
          Hired: 0,
          Rejected: 0,
        };
      }
      const stageName = item._id.stage as keyof typeof countsMap[string];
      if (countsMap[jId][stageName] !== undefined && stageName !== "total") {
        countsMap[jId][stageName] += item.count;
      }
      countsMap[jId].total += item.count;
    }

    const jobsWithPipeline = jobs.map((j) => {
      const obj = (j.toJSON() as unknown) as Record<string, unknown>;
      obj.pipelineCounts = countsMap[j.id] || {
        total: 0,
        Applied: 0,
        Screening: 0,
        Interview: 0,
        Offer: 0,
        Hired: 0,
        Rejected: 0,
      };
      return obj;
    });

    res.status(200).json({
      success: true,
      data: jobsWithPipeline,
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
 * Enforces ownership access for recruiters.
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

    const userRole = req.user ? normalizeRole(req.user.role) : "candidate";

    if (userRole === "hiring_team") {
      const jobOwnerId =
        job.ownerId && (job.ownerId as { _id?: mongoose.Types.ObjectId })._id
          ? (job.ownerId as { _id: mongoose.Types.ObjectId })._id.toString()
          : job.ownerId?.toString();

      const otherRecruiterIds = await getOtherRecruiterIds(req.user!._id);
      const isOtherRecruiter = otherRecruiterIds.some((otherId) => otherId.toString() === jobOwnerId);

      if (isOtherRecruiter) {
        return next(
          new AppError(
            "You do not have permission to access jobs posted by another recruiter",
            403,
            "FORBIDDEN"
          )
        );
      }
    } else if (userRole === "candidate") {
      if (job.status === "Archived") {
        return next(new AppError("Job opening not found", 404, "JOB_NOT_FOUND"));
      }
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
 * Restricts updates to the owning recruiter or platform managers.
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

    const userRole = req.user ? normalizeRole(req.user.role) : "candidate";
    if (userRole === "hiring_team") {
      const jobOwnerId =
        job.ownerId && (job.ownerId as { _id?: mongoose.Types.ObjectId })._id
          ? (job.ownerId as { _id: mongoose.Types.ObjectId })._id.toString()
          : job.ownerId?.toString();

      const otherRecruiterIds = await getOtherRecruiterIds(req.user!._id);
      const isOtherRecruiter = otherRecruiterIds.some((otherId) => otherId.toString() === jobOwnerId);

      if (isOtherRecruiter) {
        return next(
          new AppError(
            "You do not have permission to modify jobs posted by another recruiter",
            403,
            "FORBIDDEN"
          )
        );
      }
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
 * Soft archives a job per data integrity rules.
 * Restricts deletion to the owning recruiter or platform managers.
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

    const userRole = req.user ? normalizeRole(req.user.role) : "candidate";
    if (userRole === "hiring_team") {
      const jobOwnerId =
        job.ownerId && (job.ownerId as { _id?: mongoose.Types.ObjectId })._id
          ? (job.ownerId as { _id: mongoose.Types.ObjectId })._id.toString()
          : job.ownerId?.toString();

      const otherRecruiterIds = await getOtherRecruiterIds(req.user!._id);
      const isOtherRecruiter = otherRecruiterIds.some((otherId) => otherId.toString() === jobOwnerId);

      if (isOtherRecruiter) {
        return next(
          new AppError(
            "You do not have permission to delete jobs posted by another recruiter",
            403,
            "FORBIDDEN"
          )
        );
      }
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

/**
 * Returns comprehensive pipeline statistics for a single job opening.
 * Enforces recruiter ownership access and calculates stage, interview, and offer metrics.
 */
export const getJobPipelineStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid job ID format", 400, "INVALID_ID"));
    }

    const job = await Job.findById(id).populate("ownerId", "name email role");
    if (!job) {
      return next(new AppError("Job opening not found", 404, "JOB_NOT_FOUND"));
    }

    const userRole = req.user ? normalizeRole(req.user.role) : "candidate";
    if (userRole === "hiring_team") {
      const jobOwnerId =
        job.ownerId && (job.ownerId as { _id?: mongoose.Types.ObjectId })._id
          ? (job.ownerId as { _id: mongoose.Types.ObjectId })._id.toString()
          : job.ownerId?.toString();

      const otherRecruiterIds = await getOtherRecruiterIds(req.user!._id);
      const isOtherRecruiter = otherRecruiterIds.some((otherId) => otherId.toString() === jobOwnerId);

      if (isOtherRecruiter) {
        return next(
          new AppError(
            "You do not have permission to view pipeline stats for jobs posted by another recruiter",
            403,
            "FORBIDDEN"
          )
        );
      }
    }

    const jobObjectId = new mongoose.Types.ObjectId(id);

    // 1. Stage counts
    const stageAggregation = await Application.aggregate([
      { $match: { jobId: jobObjectId } },
      {
        $group: {
          _id: { $ifNull: ["$currentStage", "$stage"] },
          count: { $sum: 1 },
        },
      },
    ]);

    const stageCounts: Record<string, number> = {
      Applied: 0,
      Screening: 0,
      Interview: 0,
      Offer: 0,
      Hired: 0,
      Rejected: 0,
    };

    let totalApplications = 0;
    for (const item of stageAggregation) {
      if (item._id && stageCounts[item._id] !== undefined) {
        stageCounts[item._id] = item.count;
      }
      totalApplications += item.count;
    }

    // 2. Interview status breakdown
    const interviewAggregation = await Interview.aggregate([
      { $match: { jobId: jobObjectId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const interviewCounts: Record<string, number> = {
      scheduled: 0,
      completed: 0,
      cancelled: 0,
      rescheduled: 0,
    };
    for (const item of interviewAggregation) {
      if (item._id && interviewCounts[item._id] !== undefined) {
        interviewCounts[item._id] = item.count;
      }
    }

    // 3. Offer status breakdown
    const offerAggregation = await Offer.aggregate([
      { $match: { jobId: jobObjectId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const offerCounts: Record<string, number> = {
      Draft: 0,
      PendingApproval: 0,
      Approved: 0,
      Extended: 0,
      Accepted: 0,
      Declined: 0,
    };
    for (const item of offerAggregation) {
      if (item._id && offerCounts[item._id] !== undefined) {
        offerCounts[item._id] = item.count;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        jobId: job.id,
        title: job.title,
        department: job.department,
        location: job.location,
        employmentType: job.employmentType,
        status: job.status,
        owner: job.ownerId,
        totalApplications,
        stages: stageCounts,
        interviews: interviewCounts,
        offers: offerCounts,
      },
    });
  } catch (error) {
    next(error);
  }
};


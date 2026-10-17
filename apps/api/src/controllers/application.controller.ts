import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Application, IApplicationDocument } from "../models/application.model.js";
import {
  InterviewStageHistory,
  HiringStage,
  IInterviewStageHistoryDocument,
} from "../models/stageHistory.model.js";
import { Candidate } from "../models/candidate.model.js";
import { Job } from "../models/job.model.js";
import {
  createApplicationSchema,
  stageTransitionSchema,
  updateApplicationSchema,
  applicationQuerySchema,
} from "../schemas/application.schema.js";
import { AppError } from "../middleware/errorHandler.js";

/**
 * Valid stage transitions state machine per PRD §4 & Architecture.md §4.4
 */
export const VALID_STAGE_TRANSITIONS: Record<HiringStage, HiringStage[]> = {
  Applied: ["Screening", "Rejected"],
  Screening: ["Interview", "Rejected"],
  Interview: ["Offer", "Rejected"],
  Offer: ["Hired", "Rejected"],
  Hired: [], // Terminal stage
  Rejected: [], // Terminal stage
};

/**
 * Helper to execute database operations in a transaction when replica set is available,
 * or safely execute directly when running on single-node standalone MongoDB.
 */
async function runWithTransaction<T>(
  fn: (session?: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  const client = (mongoose.connection as unknown as { client?: { topology?: { description?: { type?: string } } } }).client;
  const topologyType = client?.topology?.description?.type;
  const isReplicaSet = topologyType === "ReplicaSetWithPrimary" || topologyType === "Sharded";

  if (isReplicaSet) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  } else {
    return await fn();
  }
}

/**
 * Creates a new application linking an active Candidate to an open Job.
 * Initial stage is set to "Applied" and the first stage history audit record is created.
 */
export const createApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const validated = createApplicationSchema.parse(req.body);

    // Validate ID formats
    if (!mongoose.Types.ObjectId.isValid(validated.candidateId)) {
      return next(new AppError("Invalid candidate ID format", 400, "INVALID_ID"));
    }
    if (!mongoose.Types.ObjectId.isValid(validated.jobId)) {
      return next(new AppError("Invalid job ID format", 400, "INVALID_ID"));
    }
    if (validated.recruiterId && !mongoose.Types.ObjectId.isValid(validated.recruiterId)) {
      return next(new AppError("Invalid recruiter ID format", 400, "INVALID_ID"));
    }

    // Reference validation: Candidate must exist and not be archived
    const candidate = await Candidate.findById(validated.candidateId);
    if (!candidate) {
      return next(new AppError("Candidate not found", 404, "CANDIDATE_NOT_FOUND"));
    }
    if (candidate.archivedAt) {
      return next(
        new AppError(
          "Candidate is archived and cannot receive new applications",
          422,
          "CANDIDATE_ARCHIVED"
        )
      );
    }

    // Reference validation: Job must exist, be Open, and not be archived
    const job = await Job.findById(validated.jobId);
    if (!job) {
      return next(new AppError("Job not found", 404, "JOB_NOT_FOUND"));
    }
    if (job.status !== "Open" || job.archivedAt) {
      return next(
        new AppError(
          `Applications can only be created for open jobs (current status: ${job.status})`,
          422,
          "JOB_NOT_OPEN"
        )
      );
    }

    // Preliminary check for duplicate active application
    const existing = await Application.findOne({
      candidateId: validated.candidateId,
      jobId: validated.jobId,
      status: "Active",
    });

    if (existing) {
      return next(
        new AppError(
          "An active application already exists for this candidate and job",
          409,
          "DUPLICATE_APPLICATION"
        )
      );
    }

    const recruiterId = validated.recruiterId
      ? new mongoose.Types.ObjectId(validated.recruiterId)
      : req.user._id;

    let createdApplication: IApplicationDocument;
    let initialHistory: IInterviewStageHistoryDocument;

    try {
      const result = await runWithTransaction(async (session) => {
        const [appDoc] = await Application.create(
          [
            {
              candidateId: candidate._id,
              jobId: job._id,
              recruiterId,
              stage: "Applied",
              currentStage: "Applied",
              status: "Active",
              appliedAt: new Date(),
              lastStageChangedAt: new Date(),
              source: validated.source || candidate.source || "Other",
              createdBy: req.user!._id,
              updatedBy: req.user!._id,
              version: 0,
            },
          ],
          session ? { session } : {}
        );

        const [historyDoc] = await InterviewStageHistory.create(
          [
            {
              applicationId: appDoc._id,
              fromStage: null,
              toStage: "Applied",
              actorId: req.user!._id,
              changedAt: new Date(),
              reason: "Application created",
              durationMsFromPreviousStage: null,
            },
          ],
          session ? { session } : {}
        );

        return { appDoc, historyDoc };
      });

      createdApplication = result.appDoc;
      initialHistory = result.historyDoc;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: unknown }).code === 11000
      ) {
        return next(
          new AppError(
            "An active application already exists for this candidate and job",
            409,
            "DUPLICATE_APPLICATION"
          )
        );
      }
      throw error;
    }

    // Populate references for client convenience
    await createdApplication.populate([
      { path: "candidateId", select: "name fullName email currentTitle skills source experienceYears" },
      { path: "jobId", select: "title department location employmentType status" },
      { path: "recruiterId", select: "name email role" },
    ]);

    res.status(201).json({
      success: true,
      data: {
        application: createdApplication,
        historyEvent: initialHistory,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists applications with bounded pagination and filter support.
 */
export const getApplications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = applicationQuerySchema.parse(req.query);

    const filter: Record<string, unknown> = {};

    if (query.jobId) {
      if (!mongoose.Types.ObjectId.isValid(query.jobId)) {
        return next(new AppError("Invalid job ID format", 400, "INVALID_ID"));
      }
      filter.jobId = new mongoose.Types.ObjectId(query.jobId);
    }

    if (query.candidateId) {
      if (!mongoose.Types.ObjectId.isValid(query.candidateId)) {
        return next(new AppError("Invalid candidate ID format", 400, "INVALID_ID"));
      }
      filter.candidateId = new mongoose.Types.ObjectId(query.candidateId);
    }

    if (query.recruiterId) {
      if (!mongoose.Types.ObjectId.isValid(query.recruiterId)) {
        return next(new AppError("Invalid recruiter ID format", 400, "INVALID_ID"));
      }
      filter.recruiterId = new mongoose.Types.ObjectId(query.recruiterId);
    }

    const requestedStage = query.stage || query.currentStage;
    if (requestedStage) {
      filter.$or = [{ stage: requestedStage }, { currentStage: requestedStage }];
    }

    if (query.status) {
      filter.status = query.status;
    }

    // Applied date range filter
    if (query.appliedFrom || query.appliedTo) {
      const dateFilter: Record<string, Date> = {};
      if (query.appliedFrom) {
        const fromDate = new Date(query.appliedFrom);
        if (!isNaN(fromDate.getTime())) {
          dateFilter.$gte = fromDate;
        }
      }
      if (query.appliedTo) {
        const toDate = new Date(query.appliedTo);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          dateFilter.$lte = toDate;
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        filter.appliedAt = dateFilter;
      }
    }

    // Search by candidate name/email or job title
    if (query.search && query.search.trim()) {
      const sanitized = query.search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      const [matchedCandidates, matchedJobs] = await Promise.all([
        Candidate.find({
          $or: [
            { name: { $regex: sanitized, $options: "i" } },
            { fullName: { $regex: sanitized, $options: "i" } },
            { email: { $regex: sanitized, $options: "i" } },
          ],
        }).select("_id"),
        Job.find({
          title: { $regex: sanitized, $options: "i" },
        }).select("_id"),
      ]);

      const candIds = matchedCandidates.map((c) => c._id);
      const jobIds = matchedJobs.map((j) => j._id);

      const searchConditions: Record<string, unknown>[] = [
        { candidateId: { $in: candIds } },
        { jobId: { $in: jobIds } },
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const skip = (query.page - 1) * query.limit;
    const sortField = query.sort === "stage" ? "stage" : query.sort;
    const sortOrder = query.order === "asc" ? 1 : -1;

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(query.limit)
        .populate("candidateId", "name fullName email currentTitle skills source experienceYears")
        .populate("jobId", "title department location employmentType status")
        .populate("recruiterId", "name email role")
        .populate("createdBy", "name email role")
        .populate("updatedBy", "name email role"),
      Application.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        applications,
        pagination: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a single application by ID with populated Candidate, Job, and Recruiter details.
 */
export const getApplicationById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid application ID format", 400, "INVALID_ID"));
    }

    const application = await Application.findById(id)
      .populate("candidateId", "name fullName email phone location currentTitle skills source experienceYears resumeUrl summary")
      .populate("jobId", "title department location employmentType status description requirements")
      .populate("recruiterId", "name email role")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role");

    if (!application) {
      return next(new AppError("Application not found", 404, "APPLICATION_NOT_FOUND"));
    }

    res.status(200).json({
      success: true,
      data: {
        application,
        candidate: application.candidateId,
        job: application.jobId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Advances or transitions an application's hiring stage via state-machine validation.
 * Records transition history atomically with duration and optional reason.
 */
export const transitionStage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid application ID format", 400, "INVALID_ID"));
    }

    const validated = stageTransitionSchema.parse(req.body);

    const application = await Application.findById(id);

    if (!application) {
      return next(new AppError("Application not found", 404, "APPLICATION_NOT_FOUND"));
    }

    const currentStage = (application.currentStage || application.stage) as HiringStage;

    // Reject transitions from terminal stages
    if (currentStage === "Hired" || currentStage === "Rejected") {
      return next(
        new AppError(
          `Cannot transition application from terminal stage '${currentStage}'`,
          422,
          "INVALID_STAGE_TRANSITION"
        )
      );
    }

    // State machine check
    const permittedNextStages = VALID_STAGE_TRANSITIONS[currentStage] || [];
    if (!permittedNextStages.includes(validated.toStage)) {
      return next(
        new AppError(
          `Invalid stage transition from '${currentStage}' to '${validated.toStage}'. Permitted transitions: ${permittedNextStages.join(", ") || "none"}`,
          422,
          "INVALID_STAGE_TRANSITION"
        )
      );
    }

    // Concurrency optimistic stage check if provided
    if (validated.expectedStage && validated.expectedStage !== currentStage) {
      return next(
        new AppError(
          `Stage conflict: expected '${validated.expectedStage}', but application is currently at '${currentStage}'`,
          409,
          "STAGE_CONFLICT"
        )
      );
    }

    // Concurrency optimistic version check if provided
    if (
      validated.expectedVersion !== undefined &&
      validated.expectedVersion !== application.version
    ) {
      return next(
        new AppError(
          `Version conflict: expected version ${validated.expectedVersion}, but current version is ${application.version}`,
          409,
          "VERSION_CONFLICT"
        )
      );
    }

    const previousChangedAt = application.lastStageChangedAt || application.appliedAt || new Date();
    const durationMs = Math.max(0, Date.now() - new Date(previousChangedAt).getTime());

    const now = new Date();

    application.stage = validated.toStage;
    application.currentStage = validated.toStage;
    application.lastStageChangedAt = now;
    if (validated.toStage === "Rejected") {
      application.rejectedAt = now;
    }
    if (validated.toStage === "Hired") {
      application.hiredAt = now;
    }
    application.updatedBy = req.user._id;
    application.version = (application.version || 0) + 1;

    let historyDoc: IInterviewStageHistoryDocument;

    await runWithTransaction(async (session) => {
      await application.save(session ? { session } : undefined);

      const [history] = await InterviewStageHistory.create(
        [
          {
            applicationId: application._id,
            fromStage: currentStage,
            toStage: validated.toStage,
            actorId: req.user!._id,
            changedAt: now,
            reason: validated.reason || null,
            durationMsFromPreviousStage: durationMs,
          },
        ],
        session ? { session } : {}
      );
      historyDoc = history;
    });

    await application.populate([
      { path: "candidateId", select: "name fullName email currentTitle skills source experienceYears" },
      { path: "jobId", select: "title department location employmentType status" },
      { path: "recruiterId", select: "name email role" },
      { path: "updatedBy", select: "name email role" },
    ]);

    res.status(200).json({
      success: true,
      data: {
        application,
        historyEvent: historyDoc!,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves the full stage transition history for a given application, ordered chronologically.
 */
export const getApplicationHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid application ID format", 400, "INVALID_ID"));
    }

    const application = await Application.findById(id);
    if (!application) {
      return next(new AppError("Application not found", 404, "APPLICATION_NOT_FOUND"));
    }

    const sortOrder = req.query.order === "desc" ? -1 : 1;

    const history = await InterviewStageHistory.find({ applicationId: id })
      .sort({ changedAt: sortOrder })
      .populate("actorId", "name email role");

    res.status(200).json({
      success: true,
      data: {
        history,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates application metadata (e.g. assigned recruiter, source, or withdrawal status).
 * Does not allow updating stage or bypassing the state machine.
 */
export const updateApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid application ID format", 400, "INVALID_ID"));
    }

    // Explicitly reject stage mutation attempts through generic PATCH endpoint
    if (req.body.stage !== undefined || req.body.currentStage !== undefined) {
      return next(
        new AppError(
          "Stage cannot be changed through this endpoint. Please use PATCH /api/v1/applications/:id/stage",
          422,
          "INVALID_STAGE_UPDATE"
        )
      );
    }

    const validated = updateApplicationSchema.parse(req.body);

    const application = await Application.findById(id);
    if (!application) {
      return next(new AppError("Application not found", 404, "APPLICATION_NOT_FOUND"));
    }

    if (validated.recruiterId) {
      application.recruiterId = new mongoose.Types.ObjectId(validated.recruiterId);
    }
    if (validated.status) {
      application.status = validated.status;
    }
    if (validated.source) {
      application.source = validated.source;
    }

    application.updatedBy = req.user._id;
    await application.save();

    await application.populate([
      { path: "candidateId", select: "name fullName email currentTitle skills source experienceYears" },
      { path: "jobId", select: "title department location employmentType status" },
      { path: "recruiterId", select: "name email role" },
      { path: "updatedBy", select: "name email role" },
    ]);

    res.status(200).json({
      success: true,
      data: {
        application,
      },
    });
  } catch (error) {
    next(error);
  }
};

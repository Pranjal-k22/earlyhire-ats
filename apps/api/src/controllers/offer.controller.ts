import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Offer, OfferStatus, OFFER_STATUSES } from "../models/offer.model.js";
import { Application } from "../models/application.model.js";
import { Candidate } from "../models/candidate.model.js";
import { Job } from "../models/job.model.js";
import { User, normalizeRole } from "../models/user.model.js";
import { InterviewStageHistory } from "../models/stageHistory.model.js";
import { Notification } from "../models/notification.model.js";
import { AppError } from "../middleware/errorHandler.js";
import { sseEventHub } from "../services/sse/sseEventHub.js";

const createOfferSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  title: z.string().trim().min(2, "Job title is required"),
  salary: z.number().min(0, "Salary must be non-negative"),
  currency: z.string().trim().default("INR"),
  employmentType: z.enum(["FullTime", "PartTime", "Contract", "Internship"]).default("FullTime"),
  location: z.string().trim().default("Remote"),
  startDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid start date"),
  expiryDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid expiry date"),
  notes: z.string().max(3000).optional(),
});

const respondOfferSchema = z.object({
  response: z.enum(["Accepted", "Declined"]),
  notes: z.string().max(2000).optional(),
});

/**
 * Creates or drafts a job offer for an application.
 */
export const createOffer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const validated = createOfferSchema.parse(req.body);

    if (!mongoose.Types.ObjectId.isValid(validated.applicationId)) {
      return next(new AppError("Invalid application ID format", 400, "INVALID_ID"));
    }

    const application = await Application.findById(validated.applicationId);
    if (!application) {
      return next(new AppError("Application not found", 404, "APPLICATION_NOT_FOUND"));
    }

    const job = await Job.findById(application.jobId);
    if (!job) {
      return next(new AppError("Job not found", 404, "JOB_NOT_FOUND"));
    }

    const userRole = normalizeRole(req.user.role);
    if (userRole === "hiring_team") {
      const jobOwnerId =
        job.ownerId && (job.ownerId as { _id?: mongoose.Types.ObjectId })._id
          ? (job.ownerId as { _id: mongoose.Types.ObjectId })._id.toString()
          : job.ownerId?.toString();

      const otherRecruiters = await User.find({
        role: { $in: ["recruiter", "hiring_team", "hiring_manager"] },
        _id: { $ne: req.user._id },
      }).select("_id");
      const isOtherRecruiterJob = otherRecruiters.some((r) => r._id.toString() === jobOwnerId);
      const isRecruiter =
        application.recruiterId && application.recruiterId.toString() === req.user._id.toString();

      if (isOtherRecruiterJob && !isRecruiter) {
        return next(
          new AppError(
            "You do not have permission to create offers for jobs posted by another recruiter",
            403,
            "FORBIDDEN"
          )
        );
      }
    }

    const candidate = await Candidate.findById(application.candidateId);
    if (!candidate) {
      return next(new AppError("Candidate not found", 404, "CANDIDATE_NOT_FOUND"));
    }

    // Candidate user resolution
    const candidateUser = await User.findOne({ email: candidate.email.toLowerCase() });
    const candidateUserId = candidateUser ? candidateUser._id : req.user._id;

    const offerDoc = await Offer.create({
      applicationId: application._id,
      jobId: job._id,
      candidateId: candidate._id,
      candidateUserId,
      createdBy: req.user._id,
      approvedBy: userRole === "platform_manager" ? req.user._id : null,
      title: validated.title,
      salary: validated.salary,
      currency: validated.currency.toUpperCase(),
      employmentType: validated.employmentType,
      location: validated.location,
      startDate: validated.startDate ? new Date(validated.startDate) : null,
      expiryDate: validated.expiryDate ? new Date(validated.expiryDate) : null,
      status: userRole === "platform_manager" ? "Approved" : "Draft",
      notes: validated.notes || "",
    });

    sseEventHub.broadcast({
      type: "offer:created",
      entity: "offer",
      entityId: offerDoc.id,
      applicationId: application.id,
      jobId: job.id,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: {
        offer: offerDoc.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves the offer for a specific application.
 */
export const getOfferForApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { applicationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return next(new AppError("Invalid application ID format", 400, "INVALID_ID"));
    }

    const userRole = normalizeRole(req.user.role);
    if (userRole === "candidate") {
      const application = await Application.findById(applicationId);
      if (!application) {
        return next(new AppError("Application not found", 404, "APPLICATION_NOT_FOUND"));
      }
      const candidate = await Candidate.findById(application.candidateId);
      const isOwner =
        (req.user.candidateProfileId &&
          req.user.candidateProfileId.toString() === application.candidateId.toString()) ||
        (candidate && candidate.email.toLowerCase() === req.user.email.toLowerCase()) ||
        (candidate && candidate.createdBy && candidate.createdBy.toString() === req.user.id);

      if (!isOwner) {
        return next(
          new AppError("You do not have permission to view this offer", 403, "FORBIDDEN")
        );
      }
    }

    const offer = await Offer.findOne({ applicationId })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email");

    res.status(200).json({
      success: true,
      data: {
        offer: offer ? offer.toJSON() : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists offers for the currently authenticated candidate.
 */
export const getMyOffers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    // Find candidate by email or candidateProfileId
    const candidateConditions: Array<Record<string, unknown>> = [{ email: req.user.email.toLowerCase() }];
    if (req.user.candidateProfileId) {
      candidateConditions.push({ _id: req.user.candidateProfileId });
    }
    const candidate = await Candidate.findOne({ $or: candidateConditions });

    const orClauses: Array<Record<string, unknown>> = [{ candidateUserId: req.user._id }];
    if (candidate) {
      orClauses.push({ candidateId: candidate._id });
    }

    const offers = await Offer.find({
      $or: orClauses,
      status: { $in: ["Extended", "Accepted", "Declined"] }, // Candidates see extended, accepted, or declined
    })
      .populate("jobId", "title department location employmentType")
      .populate("applicationId", "currentStage stage appliedAt")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        offers: offers.map((o) => o.toJSON()),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approves a drafted or pending offer.
 */
export const approveOffer = async (
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
      return next(new AppError("Invalid offer ID format", 400, "INVALID_ID"));
    }

    const offer = await Offer.findById(id);
    if (!offer) {
      return next(new AppError("Offer not found", 404, "OFFER_NOT_FOUND"));
    }

    offer.status = "Approved";
    offer.approvedBy = req.user._id;
    await offer.save();

    sseEventHub.broadcast({
      type: "offer:approved",
      entity: "offer",
      entityId: offer.id,
      applicationId: offer.applicationId.toString(),
      jobId: offer.jobId.toString(),
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      data: {
        offer: offer.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Extends an offer to the candidate, updating application stage to 'Offer' and notifying candidate.
 */
export const extendOffer = async (
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
      return next(new AppError("Invalid offer ID format", 400, "INVALID_ID"));
    }

    const offer = await Offer.findById(id);
    if (!offer) {
      return next(new AppError("Offer not found", 404, "OFFER_NOT_FOUND"));
    }

    offer.status = "Extended";
    if (!offer.approvedBy) {
      offer.approvedBy = req.user._id;
    }
    await offer.save();

    // Advance application to 'Offer' stage if not already there
    const application = await Application.findById(offer.applicationId);
    if (application) {
      const currentStage = application.currentStage || application.stage;
      if (currentStage !== "Offer" && currentStage !== "Hired") {
        const now = new Date();
        const prevChanged = application.lastStageChangedAt || application.appliedAt || now;
        const durationMs = Math.max(0, now.getTime() - new Date(prevChanged).getTime());

        application.stage = "Offer";
        application.currentStage = "Offer";
        application.lastStageChangedAt = now;
        application.updatedBy = req.user._id;
        application.version = (application.version || 0) + 1;
        await application.save();

        await InterviewStageHistory.create({
          applicationId: application._id,
          fromStage: currentStage,
          toStage: "Offer",
          actorId: req.user._id,
          changedAt: now,
          reason: "Formal offer extended to candidate",
          durationMsFromPreviousStage: durationMs,
        });

        sseEventHub.broadcast({
          type: "application:stage_changed",
          entity: "application",
          entityId: application.id,
          jobId: application.jobId.toString(),
          timestamp: now.toISOString(),
        });
      }
    }

    // Notify candidate
    if (offer.candidateUserId) {
      await Notification.create({
        recipientUserId: offer.candidateUserId,
        title: "Official Job Offer Received!",
        message: `Congratulations! An offer for "${offer.title}" with compensation ${offer.currency} ${offer.salary.toLocaleString()} has been extended to you.`,
        type: "offer_extended",
        link: "/candidate/portal",
        metadata: { offerId: offer.id, jobId: offer.jobId },
      });
    }

    sseEventHub.broadcast({
      type: "offer:extended",
      entity: "offer",
      entityId: offer.id,
      candidateUserId: offer.candidateUserId.toString(),
      jobId: offer.jobId.toString(),
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      data: {
        offer: offer.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Candidate accepts or declines an extended offer.
 * If accepted, advances application to 'Hired'.
 */
export const respondToOffer = async (
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
      return next(new AppError("Invalid offer ID format", 400, "INVALID_ID"));
    }

    const validated = respondOfferSchema.parse(req.body);

    const offer = await Offer.findById(id);
    if (!offer) {
      return next(new AppError("Offer not found", 404, "OFFER_NOT_FOUND"));
    }

    // Verify candidate identity
    const candidate = await Candidate.findById(offer.candidateId);
    const isOwner =
      offer.candidateUserId.toString() === req.user._id.toString() ||
      (candidate && candidate.email.toLowerCase() === req.user.email.toLowerCase()) ||
      (req.user.candidateProfileId &&
        req.user.candidateProfileId.toString() === offer.candidateId.toString());

    if (!isOwner) {
      return next(
        new AppError("You do not have permission to respond to this offer", 403, "FORBIDDEN")
      );
    }

    if (offer.status !== "Extended") {
      return next(
        new AppError(
          `Cannot respond to offer with status '${offer.status}'. Must be 'Extended'.`,
          400,
          "INVALID_OFFER_STATUS"
        )
      );
    }

    const now = new Date();
    offer.status = validated.response;
    offer.candidateResponseNotes = validated.notes || "";
    offer.respondedAt = now;
    await offer.save();

    const application = await Application.findById(offer.applicationId);

    if (validated.response === "Accepted" && application) {
      const prevStage = application.currentStage || application.stage;
      const prevChanged = application.lastStageChangedAt || application.appliedAt || now;
      const durationMs = Math.max(0, now.getTime() - new Date(prevChanged).getTime());

      application.stage = "Hired";
      application.currentStage = "Hired";
      application.hiredAt = now;
      application.lastStageChangedAt = now;
      application.updatedBy = req.user._id;
      application.version = (application.version || 0) + 1;
      await application.save();

      await InterviewStageHistory.create({
        applicationId: application._id,
        fromStage: prevStage,
        toStage: "Hired",
        actorId: req.user._id,
        changedAt: now,
        reason: "Candidate accepted the formal offer",
        durationMsFromPreviousStage: durationMs,
      });

      // Notify recruiter / creator
      await Notification.create({
        recipientUserId: offer.createdBy,
        title: "Offer Accepted! Candidate Hired 🎉",
        message: `Great news! The candidate accepted the offer for "${offer.title}". Application moved to Hired.`,
        type: "offer_accepted",
        link: `/pipeline?jobId=${offer.jobId}`,
        metadata: { offerId: offer.id, applicationId: application.id },
      });

      sseEventHub.broadcast({
        type: "application:stage_changed",
        entity: "application",
        entityId: application.id,
        jobId: application.jobId.toString(),
        timestamp: now.toISOString(),
      });
    } else if (validated.response === "Declined") {
      // Notify recruiter / creator
      await Notification.create({
        recipientUserId: offer.createdBy,
        title: "Offer Declined by Candidate",
        message: `Candidate has declined the offer for "${offer.title}". Notes: ${validated.notes || "None provided"}`,
        type: "offer_declined",
        link: `/pipeline?jobId=${offer.jobId}`,
        metadata: { offerId: offer.id },
      });
    }

    sseEventHub.broadcast({
      type: "offer:responded",
      entity: "offer",
      entityId: offer.id,
      response: validated.response,
      jobId: offer.jobId.toString(),
      timestamp: now.toISOString(),
    });

    res.status(200).json({
      success: true,
      data: {
        offer: offer.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { InterviewFeedback } from "../models/interviewFeedback.model.js";
import { Interview } from "../models/interview.model.js";
import { Application } from "../models/application.model.js";
import { Candidate } from "../models/candidate.model.js";
import { Notification } from "../models/notification.model.js";
import { aiRouter } from "../services/ai/aiRouter.js";
import { AppError } from "../middleware/errorHandler.js";
import { normalizeRole } from "../models/user.model.js";

const submitFeedbackSchema = z.object({
  interviewId: z.string().min(1, "Interview ID is required"),
  applicationId: z.string().min(1, "Application ID is required"),
  ratings: z.object({
    technicalRating: z.number().min(1).max(5),
    communicationRating: z.number().min(1).max(5),
    problemSolvingRating: z.number().min(1).max(5),
    cultureAndValuesRating: z.number().min(1).max(5),
    overallRating: z.number().min(1).max(5),
  }),
  strengths: z.string().trim().default(""),
  concerns: z.string().trim().default(""),
  internalNotes: z.string().trim().default(""),
  candidateReleasableFeedback: z.string().trim().default(""),
  recommendation: z.enum(["strong_hire", "hire", "hold", "no_hire"]).default("hold"),
});

/**
 * Submits structured interview evaluation feedback.
 */
export const submitFeedback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const validated = submitFeedbackSchema.parse(req.body);

    const interview = await Interview.findById(validated.interviewId);
    if (!interview) {
      return next(new AppError("Interview not found", 404, "INTERVIEW_NOT_FOUND"));
    }

    const feedbackDoc = await InterviewFeedback.create({
      interviewId: interview.id,
      applicationId: validated.applicationId,
      interviewerId: req.user.id,
      interviewerName: req.user.name,
      ratings: validated.ratings,
      strengths: validated.strengths,
      concerns: validated.concerns,
      internalNotes: validated.internalNotes,
      candidateReleasableFeedback: validated.candidateReleasableFeedback,
      recommendation: validated.recommendation,
      isReleasedToCandidate: false,
    });

    res.status(201).json({
      success: true,
      data: {
        feedback: feedbackDoc.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves feedback for an application with strict privacy masking for candidates.
 */
export const getFeedbackForApplication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { applicationId } = req.params;
    const application = await Application.findById(applicationId);
    if (!application) {
      return next(new AppError("Application not found", 404, "APPLICATION_NOT_FOUND"));
    }

    const userRole = normalizeRole(req.user.role);
    const isCandidate = userRole === "candidate";

    if (isCandidate) {
      // Must verify application belongs to candidate
      const candidate = await Candidate.findById(application.candidateId);
      const isOwner =
        (req.user.candidateProfileId && req.user.candidateProfileId.toString() === application.candidateId.toString()) ||
        (candidate && candidate.email.toLowerCase() === req.user.email.toLowerCase()) ||
        (candidate && candidate.createdBy && candidate.createdBy.toString() === req.user.id);

      if (!isOwner) {
        return next(new AppError("You do not have permission to view feedback for this application", 403, "FORBIDDEN"));
      }

      // Candidates ONLY receive feedback that has been explicitly approved and released
      const releasedFeedbacks = await InterviewFeedback.find({
        applicationId,
        isReleasedToCandidate: true,
      }).select("candidateReleasableFeedback releasedAt createdAt");

      res.status(200).json({
        success: true,
        data: {
          feedbacks: releasedFeedbacks.map((f) => ({
            id: f.id,
            feedback: f.candidateReleasableFeedback,
            releasedAt: f.releasedAt || f.createdAt,
          })),
        },
      });
      return;
    }

    // Hiring team and Platform managers receive complete feedback including internal notes
    const allFeedbacks = await InterviewFeedback.find({ applicationId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        feedbacks: allFeedbacks.map((f) => f.toJSON()),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Explicitly releases candidate-approved feedback to the candidate.
 */
export const releaseFeedback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const userRole = normalizeRole(req.user.role);
    if (userRole !== "hiring_team" && userRole !== "platform_manager") {
      return next(new AppError("Only hiring team members can release feedback", 403, "FORBIDDEN"));
    }

    const { id } = req.params;
    const feedback = await InterviewFeedback.findById(id);
    if (!feedback) {
      return next(new AppError("Feedback entry not found", 404, "FEEDBACK_NOT_FOUND"));
    }

    feedback.isReleasedToCandidate = true;
    feedback.releasedAt = new Date();
    feedback.releasedBy = new mongoose.Types.ObjectId(req.user.id);
    await feedback.save();

    // Notify candidate
    const application = await Application.findById(feedback.applicationId).populate("candidateId");
    if (application && application.candidateId) {
      const interview = await Interview.findById(feedback.interviewId);
      if (interview) {
        await Notification.create({
          recipientUserId: interview.candidateUserId,
          title: "Interview Feedback Released",
          message: "The hiring team has released constructive feedback for your recent interview.",
          type: "feedback_released",
          link: "/candidate/interviews",
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        released: true,
        feedback: feedback.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Synthesizes multiple interviewer evaluations using AI.
 */
export const synthesizeFeedback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { applicationId } = req.params;
    const application = await Application.findById(applicationId).populate("jobId").populate("candidateId");
    if (!application) {
      return next(new AppError("Application not found", 404, "APPLICATION_NOT_FOUND"));
    }

    const feedbacks = await InterviewFeedback.find({ applicationId });
    if (feedbacks.length === 0) {
      return next(new AppError("No feedback entries submitted yet to synthesize", 400, "FEEDBACK_EMPTY"));
    }

    const feedbackItems = feedbacks.map((f) => ({
      interviewerName: f.interviewerName,
      rating: f.ratings.overallRating,
      notes: f.internalNotes,
      strengths: f.strengths,
      concerns: f.concerns,
    }));

    const synthesis = await aiRouter.synthesizeInterviewFeedback({
      jobTitle: (application.jobId as unknown as { title: string })?.title || "Role",
      candidateName: (application.candidateId as unknown as { name: string })?.name || "Candidate",
      interviewFeedbackItems: feedbackItems,
      userId: req.user.id,
    });

    res.status(200).json({
      success: true,
      data: {
        synthesis: synthesis.data,
      },
    });
  } catch (error) {
    next(error);
  }
};

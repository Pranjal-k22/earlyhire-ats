import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { ApplicationStageReview } from "../models/stageReview.model.js";
import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import { Candidate } from "../models/candidate.model.js";
import { ResumeFile } from "../models/resume.model.js";
import { aiRouter } from "../services/ai/aiRouter.js";
import { AppError } from "../middleware/errorHandler.js";

const recordDecisionSchema = z.object({
  decision: z.enum(["advance", "hold", "reject"]),
  notes: z.string().trim().default(""),
});

/**
 * Retrieves existing stage review or triggers AI stage generation for Screening or Interview.
 */
export const getOrGenerateStageReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { applicationId } = req.params;
    const application = await Application.findById(applicationId);
    if (!application) {
      return next(new AppError("Application not found", 404, "APPLICATION_NOT_FOUND"));
    }

    const stage = application.currentStage;
    if (stage !== "Screening" && stage !== "Interview") {
      return next(
        new AppError(
          `AI Stage Reviews are generated for 'Screening' or 'Interview' stages. Current stage is '${stage}'.`,
          400,
          "INVALID_STAGE"
        )
      );
    }

    // Check for existing review
    let review = await ApplicationStageReview.findOne({ applicationId, stage });
    if (review) {
      res.status(200).json({
        success: true,
        data: {
          review: review.toJSON(),
        },
      });
      return;
    }

    // Generate new stage review
    const job = await Job.findById(application.jobId);
    const candidate = await Candidate.findById(application.candidateId);
    if (!job || !candidate) {
      return next(new AppError("Associated Job or Candidate record missing", 404, "RECORD_NOT_FOUND"));
    }

    // Attempt to locate candidate resume text
    const resume = await ResumeFile.findOne({
      $or: [{ candidateId: candidate.id }, { candidateUserId: req.user.id }],
      isDeleted: false,
    }).sort({ createdAt: -1 });

    const resumeText = resume?.parsedText || candidate.summary || "Candidate applied for role.";

    if (stage === "Screening") {
      const aiResponse = await aiRouter.generateScreeningReview({
        jobTitle: job.title,
        jobDescription: job.description,
        resumeText,
        candidateName: candidate.name,
        userId: req.user.id,
      });

      const data = aiResponse.data;
      review = await ApplicationStageReview.create({
        applicationId: application.id,
        stage: "Screening",
        jobId: job.id,
        candidateId: candidate.id,
        reviewType: "screening_review",
        suitabilityScore: data.suitabilityScore,
        aiSummary: data.rationale,
        suggestedQuestions: data.suggestedScreeningQuestions,
        rubricCriteria: ["Core Skills Alignment", "Communication Clarity", "Role Experience"],
        strengths: data.keyStrengths,
        gapsOrRisks: data.ambiguitiesOrGaps,
        recommendedDecision: data.recommendedDecision,
        status: "completed",
        provider: aiResponse.provider,
        model: aiResponse.model,
        latencyMs: aiResponse.latencyMs,
      });
    } else {
      // Stage === "Interview"
      const aiResponse = await aiRouter.generateInterviewBrief({
        jobTitle: job.title,
        jobDescription: job.description,
        resumeText,
        candidateName: candidate.name,
        userId: req.user.id,
      });

      const data = aiResponse.data;
      const combinedQuestions = [
        ...data.technicalCompetencyQuestions.map((q) => ({
          question: q.question,
          purpose: q.category,
          expectedSignal: q.rubricEvidenceCriteria,
        })),
        ...data.behavioralQuestions.map((q) => ({
          question: q.question,
          purpose: q.competency,
          expectedSignal: q.whatToLookFor,
        })),
      ];

      review = await ApplicationStageReview.create({
        applicationId: application.id,
        stage: "Interview",
        jobId: job.id,
        candidateId: candidate.id,
        reviewType: "interview_brief",
        suitabilityScore: 80,
        aiSummary: data.riskMitigationNotes,
        suggestedQuestions: combinedQuestions,
        rubricCriteria: ["Technical Competency", "Problem Solving", "Collaboration"],
        strengths: data.candidateFocusAreas,
        gapsOrRisks: [data.riskMitigationNotes].filter(Boolean),
        recommendedDecision: "advance",
        status: "completed",
        provider: aiResponse.provider,
        model: aiResponse.model,
        latencyMs: aiResponse.latencyMs,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        review: review.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Records human hiring team decision independently of AI recommendations.
 */
export const recordHumanDecision = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { reviewId } = req.params;
    const validated = recordDecisionSchema.parse(req.body);

    const review = await ApplicationStageReview.findById(reviewId);
    if (!review) {
      return next(new AppError("Stage review not found", 404, "REVIEW_NOT_FOUND"));
    }

    review.humanDecision = {
      decision: validated.decision,
      actorId: new mongoose.Types.ObjectId(req.user.id),
      actorName: req.user.name,
      notes: validated.notes,
      decidedAt: new Date(),
    };

    await review.save();

    res.status(200).json({
      success: true,
      data: {
        review: review.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { atsReviewService } from "../services/ai/atsReviewService.js";
import { AtsAnalysis } from "../models/atsAnalysis.model.js";
import { ResumeFile } from "../models/resume.model.js";
import { AppError } from "../middleware/errorHandler.js";
import { normalizeRole } from "../models/user.model.js";

const analyzeRequestSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  resumeId: z.string().optional(),
  forceRefresh: z.boolean().optional(),
});

/**
 * Triggers an ATS resume match analysis against a job opening.
 * Candidate can evaluate their own resume; hiring team can evaluate any candidate's resume.
 */
export const runAtsAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const validated = analyzeRequestSchema.parse(req.body);

    let targetResumeId = validated.resumeId;

    // If candidate didn't pass resumeId, fallback to active resumeId on profile
    if (!targetResumeId) {
      if (req.user.resumeId) {
        targetResumeId = req.user.resumeId.toString();
      } else {
        const latestResume = await ResumeFile.findOne({
          candidateUserId: req.user.id,
          isDeleted: false,
        }).sort({ createdAt: -1 });

        if (!latestResume) {
          return next(
            new AppError("Please upload a resume first before requesting an ATS analysis", 400, "RESUME_REQUIRED")
          );
        }
        targetResumeId = latestResume.id;
      }
    }

    // Verify resume ownership if candidate role
    const resume = await ResumeFile.findById(targetResumeId);
    if (!resume || resume.isDeleted) {
      return next(new AppError("Resume file not found", 404, "RESUME_NOT_FOUND"));
    }

    const userRole = normalizeRole(req.user.role);
    const isOwner = resume.candidateUserId.toString() === req.user.id;
    const isHiringTeam = userRole === "hiring_team" || userRole === "platform_manager";

    if (!isOwner && !isHiringTeam) {
      return next(new AppError("You do not have permission to analyze this resume", 403, "FORBIDDEN"));
    }

    const report = await atsReviewService.analyzeResumeAgainstJob({
      resumeId: targetResumeId,
      jobId: validated.jobId,
      candidateUserId: resume.candidateUserId.toString(),
      forceRefresh: validated.forceRefresh,
    });

    res.status(200).json({
      success: true,
      data: {
        analysis: report.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists all ATS analyses generated for the authenticated candidate.
 */
export const getMyAnalyses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const analyses = await AtsAnalysis.find({
      candidateUserId: req.user.id,
    })
      .populate("jobId", "title department location status")
      .populate("resumeId", "originalFilename createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        analyses: analyses.map((a) => a.toJSON()),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a specific ATS analysis by ID.
 */
export const getAnalysisById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { id } = req.params;
    const analysis = await AtsAnalysis.findById(id)
      .populate("jobId", "title department location status")
      .populate("resumeId", "originalFilename createdAt");

    if (!analysis) {
      return next(new AppError("Analysis report not found", 404, "ANALYSIS_NOT_FOUND"));
    }

    const userRole = normalizeRole(req.user.role);
    const isOwner = analysis.candidateUserId.toString() === req.user.id;
    const isPrivileged = userRole === "hiring_team" || userRole === "platform_manager";

    if (!isOwner && !isPrivileged) {
      return next(new AppError("You do not have permission to view this analysis report", 403, "FORBIDDEN"));
    }

    res.status(200).json({
      success: true,
      data: {
        analysis: analysis.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists all candidate analyses for a specific job opening (Hiring Team only).
 */
export const getAnalysesForJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { jobId } = req.params;
    const analyses = await AtsAnalysis.find({ jobId })
      .populate("candidateUserId", "name email")
      .populate("resumeId", "originalFilename")
      .sort({ overallScore: -1 });

    res.status(200).json({
      success: true,
      data: {
        analyses: analyses.map((a) => a.toJSON()),
      },
    });
  } catch (error) {
    next(error);
  }
};

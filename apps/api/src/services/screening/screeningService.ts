import fsSync from "node:fs";
import fs from "node:fs/promises";
import mongoose from "mongoose";
import { Application, IApplicationDocument, IAtsSnapshot } from "../../models/application.model.js";
import { ResumeFile } from "../../models/resume.model.js";
import { IAtsAnalysisDocument } from "../../models/atsAnalysis.model.js";
import { atsReviewService } from "../ai/atsReviewService.js";
import { resumeStorage } from "../storage/resumeStorage.js";
import { sseEventHub } from "../sse/sseEventHub.js";
import { notificationService } from "../notification/notificationService.js";
import { AppError } from "../../middleware/errorHandler.js";

export class ScreeningService {
  private activeScreenings: Map<string, Promise<IApplicationDocument | null>> = new Map();

  /**
   * Evaluates the score and assigns an explainable screening recommendation.
   */
  public getScreeningRecommendation(
    overallScore: number,
    hasParsingLimitations: boolean = false
  ): "strong_match" | "potential_match" | "needs_review" | "insufficient_evidence" {
    if (hasParsingLimitations) return "insufficient_evidence";
    if (overallScore >= 80) return "strong_match";
    if (overallScore >= 60) return "potential_match";
    if (overallScore >= 40) return "needs_review";
    return "insufficient_evidence";
  }

  /**
   * Safely queues and initiates asynchronous automatic screening for an application.
   * Non-blocking: returns immediately after updating initial processing state.
   */
  public triggerAutomaticScreening(params: {
    applicationId: string;
    triggerSource?: string;
    forceRefresh?: boolean;
  }): void {
    const { applicationId, triggerSource = "application_submission", forceRefresh = false } = params;

    // Concurrency / Idempotency guard: Prevent concurrent runs for the same application
    if (this.activeScreenings.has(applicationId)) {
      return;
    }

    // Launch asynchronous execution decoupled from HTTP lifecycle
    const promise = this._runScreening(applicationId, triggerSource, forceRefresh);
    this.activeScreenings.set(applicationId, promise);
  }

  /**
   * Executes the full resume parsing, evaluation, snapshot persistence, and notification workflow.
   */
  public async executeScreening(
    applicationId: string,
    triggerSource: string = "application_submission",
    forceRefresh: boolean = false
  ): Promise<IApplicationDocument | null> {
    const existing = this.activeScreenings.get(applicationId);
    if (existing) {
      return await existing;
    }

    const promise = this._runScreening(applicationId, triggerSource, forceRefresh);
    this.activeScreenings.set(applicationId, promise);
    return await promise;
  }

  private async _runScreening(
    applicationId: string,
    triggerSource: string = "application_submission",
    forceRefresh: boolean = false
  ): Promise<IApplicationDocument | null> {
    try {
      const application = await Application.findById(applicationId)
        .populate("candidateId")
        .populate("jobId")
        .populate("resumeId");

      if (!application) {
        console.warn(`[ScreeningService] Application ${applicationId} not found`);
        return null;
      }

      const candidate = application.candidateId as unknown as {
        _id: mongoose.Types.ObjectId;
        id?: string;
        fullName?: string;
        name?: string;
        email?: string;
        userId?: mongoose.Types.ObjectId;
        createdBy?: mongoose.Types.ObjectId;
      };

      const job = application.jobId as unknown as {
        _id: mongoose.Types.ObjectId;
        id?: string;
        title: string;
        department?: string;
        ownerId?: mongoose.Types.ObjectId;
        requirements?: string[];
        skills?: string[];
      };

      const resume = application.resumeId as unknown as {
        _id: mongoose.Types.ObjectId;
        id?: string;
        version?: number;
        contentSha256?: string;
        parsedText?: string;
        storagePath?: string;
        mimeType?: string;
        parsingStatus?: string;
        isDeleted?: boolean;
      };

      if (!resume || resume.isDeleted) {
        // Mark needs review: Resume not found or removed
        application.atsSnapshot = {
          overallScore: 0,
          breakdown: { skillsScore: 0, experienceScore: 0, educationScore: 0, roleRelevanceScore: 0 },
          status: "needs_review",
          provider: "none",
          model: "none",
          resumeVersion: 1,
          promptVersion: "v1.0",
          rubricVersion: "v2.0-deterministic-hybrid",
          assessedAt: new Date(),
          snapshotTimestamp: new Date(),
          startedAt: new Date(),
          completedAt: new Date(),
          reportRef: null,
          matchedSkills: [],
          requiredSkillsFound: [],
          missingCriteria: [],
          screeningRecommendation: "needs_review",
          retryCount: (application.atsSnapshot?.retryCount || 0),
          errorCategory: "RESUME_MISSING",
          triggerSource,
        };
        await application.save();

        const recruiterUserId = application.recruiterId?.toString() || job.ownerId?.toString();
        if (recruiterUserId) {
          await notificationService.notifyScreeningResult({
            applicationId: application.id,
            candidateName: candidate.fullName || candidate.name || "Candidate",
            jobId: job._id.toString(),
            jobTitle: job.title,
            recruiterUserId,
            score: 0,
            recommendation: "needs_review",
            status: "needs_review",
          });
        }
        return application;
      }

      // Update to processing state
      application.atsSnapshot = {
        overallScore: application.atsSnapshot?.overallScore || 0,
        breakdown: application.atsSnapshot?.breakdown || {
          skillsScore: 0,
          experienceScore: 0,
          educationScore: 0,
          roleRelevanceScore: 0,
        },
        status: "processing",
        provider: "none",
        model: "none",
        resumeVersion: resume.version || 1,
        resumeContentHash: resume.contentSha256 || null,
        jobContentHash: null,
        promptVersion: "v1.0",
        rubricVersion: "v2.0-deterministic-hybrid",
        assessedAt: new Date(),
        snapshotTimestamp: new Date(),
        startedAt: new Date(),
        completedAt: null,
        reportRef: application.atsSnapshot?.reportRef || null,
        matchedSkills: application.atsSnapshot?.matchedSkills || [],
        requiredSkillsFound: application.atsSnapshot?.requiredSkillsFound || [],
        missingCriteria: application.atsSnapshot?.missingCriteria || [],
        screeningRecommendation: null,
        retryCount: (application.atsSnapshot?.retryCount || 0),
        errorCategory: null,
        triggerSource,
      };
      await application.save();

      // Broadcast progress via SSE
      sseEventHub.broadcast({
        type: "application:updated",
        entity: "application",
        entityId: application.id,
        jobId: job._id.toString(),
        timestamp: new Date().toISOString(),
      });

      // Step 1: Ensure resume text is parsed and available
      const resumeDoc = await ResumeFile.findById(resume._id);
      if (resumeDoc && (!resumeDoc.parsedText || resumeDoc.parsedText.trim().length === 0)) {
        if (resumeDoc.storagePath && fsSync.existsSync(resumeDoc.storagePath)) {
          try {
            const buffer = await fs.readFile(resumeDoc.storagePath);
            const extracted = await resumeStorage.extractText(buffer, resumeDoc.mimeType);
            if (extracted && extracted.trim().length > 0) {
              resumeDoc.parsedText = extracted;
              resumeDoc.parsingStatus = "completed";
              resumeDoc.parsingError = null;
              await resumeDoc.save();
            }
          } catch (extractErr) {
            console.warn(`[ScreeningService] Could not extract text for resume ${resumeDoc._id}:`, extractErr);
          }
        }
      }

      const hasText = Boolean(resumeDoc?.parsedText && resumeDoc.parsedText.trim().length > 0);
      if (!hasText) {
        // Document unreadable or empty — Mark needs_review instead of zeroing with success
        application.atsSnapshot = {
          overallScore: 0,
          breakdown: { skillsScore: 0, experienceScore: 0, educationScore: 0, roleRelevanceScore: 0 },
          status: "needs_review",
          provider: "none",
          model: "none",
          resumeVersion: resume.version || 1,
          resumeContentHash: resume.contentSha256 || null,
          jobContentHash: null,
          promptVersion: "v1.0",
          rubricVersion: "v2.0-deterministic-hybrid",
          assessedAt: new Date(),
          snapshotTimestamp: new Date(),
          startedAt: application.atsSnapshot?.startedAt || new Date(),
          completedAt: new Date(),
          reportRef: null,
          matchedSkills: [],
          requiredSkillsFound: [],
          missingCriteria: [],
          screeningRecommendation: "needs_review",
          retryCount: application.atsSnapshot?.retryCount || 0,
          errorCategory: "UNREADABLE_RESUME_TEXT",
          triggerSource,
        };
        await application.save();

        const recruiterUserId = application.recruiterId?.toString() || job.ownerId?.toString();
        if (recruiterUserId) {
          await notificationService.notifyScreeningResult({
            applicationId: application.id,
            candidateName: candidate.fullName || candidate.name || "Candidate",
            jobId: job._id.toString(),
            jobTitle: job.title,
            recruiterUserId,
            score: 0,
            recommendation: "needs_review",
            status: "needs_review",
          });
        }
        return application;
      }

      // Step 2: Run Job-Specific Evaluation via AtsReviewService
      const candidateUserId =
        candidate.userId?.toString() ||
        candidate.createdBy?.toString() ||
        application.createdBy?.toString() ||
        application.recruiterId.toString();

      const analysis: IAtsAnalysisDocument = await atsReviewService.analyzeResumeAgainstJob({
        resumeId: resume._id.toString(),
        jobId: job._id.toString(),
        candidateUserId,
        applicationId: application.id,
        forceRefresh,
      });

      // Step 3: Compute recommendation and build final snapshot
      const overallScore = analysis.overallScore;
      const recommendation = this.getScreeningRecommendation(overallScore);

      const finalSnapshot: IAtsSnapshot = {
        overallScore,
        breakdown: analysis.breakdown,
        status: "completed",
        provider: analysis.provider,
        model: analysis.model,
        resumeVersion: analysis.resumeVersion || resume.version || 1,
        resumeContentHash: analysis.resumeContentHash || resume.contentSha256 || null,
        jobContentHash: analysis.jobContentHash || null,
        promptVersion: analysis.promptVersion || "v1.0",
        rubricVersion: analysis.rubricVersion || "v2.0-deterministic-hybrid",
        assessedAt: new Date(),
        snapshotTimestamp: new Date(),
        startedAt: application.atsSnapshot?.startedAt || new Date(),
        completedAt: new Date(),
        reportRef: analysis._id,
        matchedSkills: analysis.requiredSkillsFound || [],
        requiredSkillsFound: analysis.requiredSkillsFound || [],
        missingCriteria: analysis.missingCriteria || [],
        screeningRecommendation: recommendation,
        retryCount: application.atsSnapshot?.retryCount || 0,
        errorCategory: null,
        triggerSource,
      };

      application.atsAnalysisId = analysis._id;
      application.atsSnapshot = finalSnapshot;
      await application.save();

      // Step 4: Publish Real-time Events
      sseEventHub.broadcast({
        type: "ats:completed",
        entity: "ats_analysis",
        entityId: analysis.id,
        applicationId: application.id,
        jobId: job._id.toString(),
        timestamp: new Date().toISOString(),
      });

      sseEventHub.broadcast({
        type: "application:updated",
        entity: "application",
        entityId: application.id,
        jobId: job._id.toString(),
        timestamp: new Date().toISOString(),
      });

      // Step 5: Notify Recruiter
      const recruiterUserId = application.recruiterId?.toString() || job.ownerId?.toString();
      if (recruiterUserId) {
        await notificationService.notifyScreeningResult({
          applicationId: application.id,
          candidateName: candidate.fullName || candidate.name || "Candidate",
          jobId: job._id.toString(),
          jobTitle: job.title,
          recruiterUserId,
          score: overallScore,
          recommendation,
          status: "completed",
        });
      }

      return application;
    } catch (err: unknown) {
      console.error(`[ScreeningService] Screening failed for application ${applicationId}:`, err);

      try {
        const app = await Application.findById(applicationId).populate("jobId candidateId");
        if (app) {
          app.atsSnapshot = {
            overallScore: 0,
            breakdown: { skillsScore: 0, experienceScore: 0, educationScore: 0, roleRelevanceScore: 0 },
            status: "needs_review",
            provider: "error_fallback",
            model: "none",
            resumeVersion: 1,
            promptVersion: "v1.0",
            rubricVersion: "v2.0-deterministic-hybrid",
            assessedAt: new Date(),
            snapshotTimestamp: new Date(),
            completedAt: new Date(),
            reportRef: null,
            matchedSkills: [],
            requiredSkillsFound: [],
            missingCriteria: [],
            screeningRecommendation: "needs_review",
            retryCount: (app.atsSnapshot?.retryCount || 0),
            errorCategory: err instanceof Error ? err.message : "EVALUATION_ERROR",
            triggerSource,
          };
          await app.save();

          const cand = app.candidateId as unknown as { fullName?: string; name?: string };
          const job = app.jobId as unknown as { _id: mongoose.Types.ObjectId; title: string; ownerId?: mongoose.Types.ObjectId };
          const recruiterUserId = app.recruiterId?.toString() || job?.ownerId?.toString();

          if (recruiterUserId && job) {
            await notificationService.notifyScreeningResult({
              applicationId: app.id,
              candidateName: cand?.fullName || cand?.name || "Candidate",
              jobId: job._id.toString(),
              jobTitle: job.title,
              recruiterUserId,
              score: 0,
              recommendation: "needs_review",
              status: "needs_review",
            });
          }
        }
      } catch (innerErr) {
        console.error("[ScreeningService] Failed to record error state:", innerErr);
      }

      return null;
    } finally {
      this.activeScreenings.delete(applicationId);
    }
  }

  /**
   * Authorized recruiter retry for recoverable failed or needs_review screening runs.
   */
  public async retryScreening(applicationId: string, actorUserId: string): Promise<IApplicationDocument> {
    const application = await Application.findById(applicationId);
    if (!application) {
      throw new AppError("Application not found", 404, "APPLICATION_NOT_FOUND");
    }

    const currentRetry = application.atsSnapshot?.retryCount || 0;
    if (application.atsSnapshot) {
      application.atsSnapshot.retryCount = currentRetry + 1;
      application.atsSnapshot.status = "processing";
      await application.save();
    }

    // Trigger screening with forceRefresh
    this.triggerAutomaticScreening({
      applicationId,
      triggerSource: `recruiter_retry:${actorUserId}`,
      forceRefresh: true,
    });

    return application;
  }
}

export const screeningService = new ScreeningService();

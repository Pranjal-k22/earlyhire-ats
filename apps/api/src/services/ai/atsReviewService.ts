import fsSync from "node:fs";
import fs from "node:fs/promises";
import { AtsAnalysis, IAtsAnalysisDocument } from "../../models/atsAnalysis.model.js";
import { ResumeFile } from "../../models/resume.model.js";
import { Job } from "../../models/job.model.js";
import { aiRouter } from "./aiRouter.js";
import { resumeStorage } from "../storage/resumeStorage.js";
import { AppError } from "../../middleware/errorHandler.js";

export class AtsReviewService {
  private promptVersion = "v1.0";
  private rubricVersion = "v1.0";

  /**
   * Performs an ATS resume match analysis against a job opening.
   * Leverages deterministic cache when identical resume, job, and rubric versions are evaluated.
   */
  public async analyzeResumeAgainstJob(params: {
    resumeId: string;
    jobId: string;
    candidateUserId: string;
    applicationId?: string;
    forceRefresh?: boolean;
  }): Promise<IAtsAnalysisDocument> {
    const { resumeId, jobId, candidateUserId, applicationId, forceRefresh } = params;

    // Check for cached completed analysis unless forceRefresh requested
    if (!forceRefresh) {
      const existing = await AtsAnalysis.findOne({
        resumeId,
        jobId,
        promptVersion: this.promptVersion,
        rubricVersion: this.rubricVersion,
        status: "completed",
      });

      if (existing) {
        return existing;
      }
    }

    // Load Resume and Job
    const resume = await ResumeFile.findById(resumeId);
    if (!resume || resume.isDeleted) {
      throw new AppError("Resume file not found or has been removed", 404, "RESUME_NOT_FOUND");
    }

    const job = await Job.findById(jobId);
    if (!job) {
      throw new AppError("Job opening not found", 404, "JOB_NOT_FOUND");
    }

    // If resume text is missing or empty, attempt on-demand re-extraction from private storage
    if (!resume.parsedText || resume.parsedText.trim().length === 0) {
      if (resume.storagePath && fsSync.existsSync(resume.storagePath)) {
        try {
          const fileBuffer = await fs.readFile(resume.storagePath);
          const reExtracted = await resumeStorage.extractText(fileBuffer, resume.mimeType);
          if (reExtracted && reExtracted.trim().length > 0) {
            resume.parsedText = reExtracted;
            resume.parsingStatus = "completed";
            resume.parsingError = null;
            await resume.save();
          }
        } catch {
          // Fall through to error below
        }
      }
    }

    // Ensure resume text is available
    if (!resume.parsedText || resume.parsedText.trim().length === 0) {
      throw new AppError(
        "Resume content is not parsed yet or is empty. Please upload a readable text or PDF resume.",
        400,
        "RESUME_TEXT_UNAVAILABLE"
      );
    }

    // Call AI Router
    const requiredSkills =
      (job as unknown as { skills?: string[] }).skills &&
      (job as unknown as { skills: string[] }).skills.length > 0
        ? (job as unknown as { skills: string[] }).skills
        : job.requirements || [];

    const aiResponse = await aiRouter.analyzeResumeForJob({
      jobTitle: job.title,
      department: job.department || "General",
      jobDescription: job.description,
      requiredSkills,
      preferredSkills: [],
      resumeText: resume.parsedText,
      userId: candidateUserId,
    });

    const data = aiResponse.data;

    // Create or update analysis record
    const analysisDoc = await AtsAnalysis.findOneAndUpdate(
      {
        resumeId,
        jobId,
        promptVersion: this.promptVersion,
        rubricVersion: this.rubricVersion,
      },
      {
        candidateUserId,
        resumeId,
        jobId,
        applicationId: applicationId || null,
        overallScore: data.overallScore,
        breakdown: data.breakdown,
        requiredSkillsFound: data.requiredSkillsFound,
        missingCriteria: data.missingCriteria,
        experienceEvidence: data.experienceEvidence,
        concreteSuggestions: data.concreteSuggestions,
        suggestedInterviewTopics: data.suggestedInterviewTopics,
        confidence: data.confidence,
        summary: data.summary,
        provider: aiResponse.provider,
        model: aiResponse.model,
        promptVersion: this.promptVersion,
        rubricVersion: this.rubricVersion,
        inputTokens: aiResponse.inputTokens,
        outputTokens: aiResponse.outputTokens,
        latencyMs: aiResponse.latencyMs,
        status: "completed",
        errorMessage: null,
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );

    return analysisDoc;
  }
}

export const atsReviewService = new AtsReviewService();

import fsSync from "node:fs";
import fs from "node:fs/promises";
import { AtsAnalysis, IAtsAnalysisDocument, AnalysisStatus } from "../../models/atsAnalysis.model.js";
import { ResumeFile } from "../../models/resume.model.js";
import { Job } from "../../models/job.model.js";
import { aiRouter } from "./aiRouter.js";
import { resumeStorage } from "../storage/resumeStorage.js";
import { computeDeterministicAtsScore, calculateWeightedAtsScore } from "./atsScoringService.js";
import { AppError } from "../../middleware/errorHandler.js";

export class AtsReviewService {
  private promptVersion = "v1.0";
  private rubricVersion = "v2.0-deterministic-hybrid";

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

    // Check for cached completed analysis unless forceRefresh requested (never return deterministic cache)
    if (!forceRefresh) {
      const existing = await AtsAnalysis.findOne({
        resumeId,
        jobId,
        promptVersion: this.promptVersion,
        rubricVersion: this.rubricVersion,
        provider: { $nin: ["deterministic_engine", "ollama"] },
        status: { $in: ["completed", "dual_complete", "partial_gemini", "partial_groq"] },
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

    const requiredSkills =
      (job as unknown as { skills?: string[] }).skills &&
      (job as unknown as { skills: string[] }).skills.length > 0
        ? (job as unknown as { skills: string[] }).skills
        : job.requirements || [];

    // Step 1: Run Deterministic ATS Baseline as fallback/reference
    const deterministic = computeDeterministicAtsScore({
      resumeText: resume.parsedText,
      requiredSkills,
      preferredSkills: [],
      jobTitle: job.title,
      jobDescription: job.description,
    });

    // Step 2: Call AI Provider for Genuine Semantic Analysis & Reasoning
    let aiResponse;
    try {
      aiResponse = await aiRouter.analyzeResumeForJob({
        jobTitle: job.title,
        department: job.department || "General",
        jobDescription: job.description,
        requiredSkills,
        preferredSkills: [],
        resumeText: resume.parsedText,
        userId: candidateUserId,
      });
    } catch (aiErr) {
      console.warn("[AtsReviewService] AI inference failed, falling back to deterministic baseline:", aiErr);
      aiResponse = null;
    }

    // Step 3: Extract AI Findings directly or use fallback if offline
    let finalBreakdown;
    let finalScore;
    let requiredSkillsFound: string[];
    let missingCriteria: string[];
    let experienceEvidence: string[];
    let concreteSuggestions: string[];
    let suggestedInterviewTopics: string[];
    let confidence: "low" | "medium" | "high";
    let summary: string;
    let provider: string;
    let model: string;
    let inputTokens = 0;
    let outputTokens = 0;
    let latencyMs = 0;
    let status: AnalysisStatus = "completed";

    if (aiResponse && aiResponse.provider !== "heuristic_fallback") {
      const data = aiResponse.data;
      // Direct authentic AI evaluation of candidate resume against job description
      finalBreakdown = {
        skillsScore: Math.min(100, Math.max(0, Math.round(data.breakdown.skillsScore))),
        experienceScore: Math.min(100, Math.max(0, Math.round(data.breakdown.experienceScore))),
        educationScore: Math.min(100, Math.max(0, Math.round(data.breakdown.educationScore))),
        roleRelevanceScore: Math.min(100, Math.max(0, Math.round(data.breakdown.roleRelevanceScore))),
      };

      // Server-side authoritative score strictly calculated from canonical 4-part weights (40/30/15/15)
      finalScore = calculateWeightedAtsScore(finalBreakdown);

      requiredSkillsFound = data.requiredSkillsFound && data.requiredSkillsFound.length > 0
        ? data.requiredSkillsFound
        : deterministic.matchedSkills;
      missingCriteria = data.missingCriteria && data.missingCriteria.length > 0
        ? data.missingCriteria
        : deterministic.missingCriteria;
      experienceEvidence = data.experienceEvidence && data.experienceEvidence.length > 0
        ? data.experienceEvidence
        : [
            `Evidenced ${deterministic.detectedSections.join(", ")} sections.`,
            `Quantitative metrics density: ${deterministic.breakdown.achievementScore}% score.`,
          ];
      concreteSuggestions = data.concreteSuggestions && data.concreteSuggestions.length > 0
        ? data.concreteSuggestions
        : deterministic.recommendations.map((r) => r.suggestedAction);
      suggestedInterviewTopics = data.suggestedInterviewTopics && data.suggestedInterviewTopics.length > 0
        ? data.suggestedInterviewTopics
        : [
            "Technical architecture and system design trade-offs",
            "Hands-on experience with core job criteria",
          ];
      confidence = data.confidence || "high";
      summary = data.summary;
      provider = aiResponse.provider;
      model = aiResponse.model;
      inputTokens = aiResponse.inputTokens || 0;
      outputTokens = aiResponse.outputTokens || 0;
      latencyMs = aiResponse.latencyMs || 0;
      status = "completed";
    } else {
      // Deterministic fallback path when AI providers are unavailable
      finalBreakdown = {
        skillsScore: deterministic.breakdown.skillsScore,
        experienceScore: deterministic.breakdown.experienceScore,
        educationScore: deterministic.breakdown.educationScore,
        roleRelevanceScore: deterministic.breakdown.roleRelevanceScore,
      };
      finalScore = deterministic.overallScore;
      requiredSkillsFound = deterministic.matchedSkills;
      missingCriteria = deterministic.missingCriteria;
      experienceEvidence = [
        `Evidenced ${deterministic.detectedSections.join(", ")} sections.`,
        `Quantitative metrics density: ${deterministic.breakdown.achievementScore}% score.`,
      ];
      concreteSuggestions = deterministic.recommendations.map((r) => r.suggestedAction);
      suggestedInterviewTopics = [
        "Technical architecture and system design trade-offs",
        "Hands-on experience with core job criteria",
      ];
      confidence = "medium";
      summary = `Deterministic compatibility assessment: ${finalScore}% match grounded in resume evidence.`;
      provider = "deterministic_engine";
      model = "rubric-v2.0";
      status = "completed";
    }

    const recommendationsWithEvidence = deterministic.recommendations.map((r) => ({
      issue: r.issue,
      whyItMatters: r.whyItMatters,
      existingEvidence: r.existingEvidence,
      suggestedAction: r.suggestedAction,
      source: r.source,
    }));

    // Step 4: Persist or Update Analysis Record
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
        resumeVersion: resume.version || 1,
        resumeContentHash: resume.contentSha256 || null,
        jobId,
        applicationId: applicationId || null,
        overallScore: finalScore,
        breakdown: finalBreakdown,
        requiredSkillsFound,
        missingCriteria,
        experienceEvidence,
        concreteSuggestions,
        recommendationsWithEvidence,
        suggestedInterviewTopics,
        confidence,
        summary,
        provider,
        model,
        providerStatuses: {
          [provider]: status,
        },
        promptVersion: this.promptVersion,
        rubricVersion: this.rubricVersion,
        inputTokens,
        outputTokens,
        latencyMs,
        status,
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

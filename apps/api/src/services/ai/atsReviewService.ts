import fsSync from "node:fs";
import fs from "node:fs/promises";
import { AtsAnalysis, IAtsAnalysisDocument, AnalysisStatus } from "../../models/atsAnalysis.model.js";
import { ResumeFile } from "../../models/resume.model.js";
import { Job } from "../../models/job.model.js";
import { aiRouter } from "./aiRouter.js";
import { resumeStorage } from "../storage/resumeStorage.js";
import { computeDeterministicAtsScore } from "./atsScoringService.js";
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

    // Check for cached completed analysis unless forceRefresh requested
    if (!forceRefresh) {
      const existing = await AtsAnalysis.findOne({
        resumeId,
        jobId,
        promptVersion: this.promptVersion,
        rubricVersion: this.rubricVersion,
        status: { $in: ["completed", "dual_complete", "partial_ollama", "partial_gemini"] },
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

    // Step 1: Run Deterministic ATS Scoring Engine
    const deterministic = computeDeterministicAtsScore({
      resumeText: resume.parsedText,
      requiredSkills,
      preferredSkills: [],
      jobTitle: job.title,
      jobDescription: job.description,
    });

    // Step 2: Call AI Provider for Semantic Analysis & Reasoning
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

    // Step 3: Reconcile Deterministic & AI Findings
    let finalScore = deterministic.overallScore;
    let finalBreakdown = {
      skillsScore: deterministic.breakdown.skillsScore,
      experienceScore: deterministic.breakdown.experienceScore,
      educationScore: deterministic.breakdown.sectionScore,
      roleRelevanceScore: Math.round(
        (deterministic.breakdown.skillsScore + deterministic.breakdown.experienceScore) / 2
      ),
    };
    let requiredSkillsFound = deterministic.matchedSkills;
    let missingCriteria = deterministic.missingCriteria;
    let experienceEvidence: string[] = [
      `Evidenced ${deterministic.detectedSections.join(", ")} sections.`,
      `Quantitative metrics density: ${deterministic.breakdown.achievementScore}% score.`,
    ];
    let concreteSuggestions = deterministic.recommendations.map((r) => r.suggestedAction);
    let suggestedInterviewTopics: string[] = [
      "Technical architecture and system design trade-offs",
      "Hands-on experience with core job criteria",
    ];
    let confidence: "low" | "medium" | "high" = "medium";
    let summary = `Deterministic compatibility assessment: ${finalScore}% match grounded in resume evidence.`;
    let provider = "deterministic_engine";
    let model = "rubric-v2.0";
    let inputTokens = 0;
    let outputTokens = 0;
    let latencyMs = 0;
    let status: AnalysisStatus = "completed";

    if (aiResponse) {
      const data = aiResponse.data;
      // Weighted reconciliation: 70% deterministic grounding + 30% AI semantic nuance
      finalScore = Math.round(deterministic.overallScore * 0.7 + data.overallScore * 0.3);
      finalBreakdown = {
        skillsScore: Math.round(deterministic.breakdown.skillsScore * 0.7 + data.breakdown.skillsScore * 0.3),
        experienceScore: Math.round(deterministic.breakdown.experienceScore * 0.7 + data.breakdown.experienceScore * 0.3),
        educationScore: Math.round(deterministic.breakdown.sectionScore * 0.7 + data.breakdown.educationScore * 0.3),
        roleRelevanceScore: Math.round(
          ((deterministic.breakdown.skillsScore + deterministic.breakdown.experienceScore) / 2) * 0.7 +
            data.breakdown.roleRelevanceScore * 0.3
        ),
      };

      requiredSkillsFound = Array.from(new Set([...deterministic.matchedSkills, ...data.requiredSkillsFound]));
      missingCriteria = deterministic.missingCriteria.length > 0 ? deterministic.missingCriteria : data.missingCriteria;
      experienceEvidence = data.experienceEvidence || experienceEvidence;
      concreteSuggestions = Array.from(new Set([...deterministic.recommendations.map((r) => r.suggestedAction), ...data.concreteSuggestions]));
      suggestedInterviewTopics = data.suggestedInterviewTopics || suggestedInterviewTopics;
      confidence = data.confidence || "medium";
      summary = data.summary || summary;
      provider = aiResponse.provider;
      model = aiResponse.model;
      inputTokens = aiResponse.inputTokens || 0;
      outputTokens = aiResponse.outputTokens || 0;
      latencyMs = aiResponse.latencyMs || 0;

      if (aiResponse.provider === "ollama") {
        status = "partial_ollama";
      } else if (aiResponse.provider === "gemini") {
        status = "partial_gemini";
      } else {
        status = "completed";
      }
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

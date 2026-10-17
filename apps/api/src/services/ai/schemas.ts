import { z } from "zod";

/**
 * Structured schema for Resume-to-Job ATS Analysis
 */
export const atsAnalysisOutputSchema = z.object({
  overallScore: z.number().min(0).max(100),
  breakdown: z.object({
    skillsScore: z.number().min(0).max(100),
    experienceScore: z.number().min(0).max(100),
    educationScore: z.number().min(0).max(100),
    roleRelevanceScore: z.number().min(0).max(100),
  }),
  requiredSkillsFound: z.array(z.string().trim()).default([]),
  missingCriteria: z.array(z.string().trim()).default([]),
  experienceEvidence: z.array(z.string().trim()).default([]),
  concreteSuggestions: z.array(z.string().trim()).default([]),
  suggestedInterviewTopics: z.array(z.string().trim()).default([]),
  confidence: z.enum(["low", "medium", "high"]).default("medium"),
  summary: z.string().trim().default(""),
});

export type AtsAnalysisOutput = z.infer<typeof atsAnalysisOutputSchema>;

/**
 * Structured schema for Stage B — Screening Stage Review
 */
export const screeningReviewOutputSchema = z.object({
  suitabilityScore: z.number().min(0).max(100),
  keyStrengths: z.array(z.string().trim()).default([]),
  ambiguitiesOrGaps: z.array(z.string().trim()).default([]),
  suggestedScreeningQuestions: z.array(
    z.object({
      question: z.string().trim(),
      purpose: z.string().trim(),
      expectedSignal: z.string().trim(),
    })
  ).default([]),
  recommendedDecision: z.enum(["advance", "hold", "reject_suggested"]).default("hold"),
  rationale: z.string().trim().default(""),
});

export type ScreeningReviewOutput = z.infer<typeof screeningReviewOutputSchema>;

/**
 * Structured schema for Stage C — Interview Brief & Rubric
 */
export const interviewBriefOutputSchema = z.object({
  candidateFocusAreas: z.array(z.string().trim()).default([]),
  technicalCompetencyQuestions: z.array(
    z.object({
      category: z.string().trim(),
      question: z.string().trim(),
      rubricEvidenceCriteria: z.string().trim(),
    })
  ).default([]),
  behavioralQuestions: z.array(
    z.object({
      competency: z.string().trim(),
      question: z.string().trim(),
      whatToLookFor: z.string().trim(),
    })
  ).default([]),
  riskMitigationNotes: z.string().trim().default(""),
});

export type InterviewBriefOutput = z.infer<typeof interviewBriefOutputSchema>;

/**
 * Structured schema for Stage D — Interview Feedback Synthesis
 */
export const feedbackSynthesisOutputSchema = z.object({
  consensusScore: z.number().min(0).max(100),
  agreedStrengths: z.array(z.string().trim()).default([]),
  differingEvaluations: z.array(z.string().trim()).default([]),
  missingEvidenceAreas: z.array(z.string().trim()).default([]),
  synthesizedCandidateFeedback: z.string().trim().default(""),
  internalRecommendationSummary: z.string().trim().default(""),
});

export type FeedbackSynthesisOutput = z.infer<typeof feedbackSynthesisOutputSchema>;

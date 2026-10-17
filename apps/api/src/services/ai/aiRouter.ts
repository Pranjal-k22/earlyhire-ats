import { IAIProvider, AIProviderResponse } from "./aiProvider.js";
import { GeminiProvider } from "./geminiProvider.js";
import { GroqProvider } from "./groqProvider.js";
import { FallbackProvider } from "./fallbackProvider.js";
import {
  atsAnalysisOutputSchema,
  AtsAnalysisOutput,
  screeningReviewOutputSchema,
  ScreeningReviewOutput,
  interviewBriefOutputSchema,
  InterviewBriefOutput,
  feedbackSynthesisOutputSchema,
  FeedbackSynthesisOutput,
} from "./schemas.js";
import {
  ATS_SYSTEM_INSTRUCTION,
  buildAtsAnalysisPrompt,
  buildScreeningReviewPrompt,
  buildInterviewBriefPrompt,
  buildFeedbackSynthesisPrompt,
} from "./promptTemplates.js";
import { AIUsageRecord } from "../../models/aiUsage.model.js";
import { env } from "../../config/env.js";

export class AIRouter {
  private primaryProvider: IAIProvider;
  private fallbackProvider: IAIProvider;
  private heuristicProvider: FallbackProvider;

  constructor() {
    this.heuristicProvider = new FallbackProvider();

    // Configure primary provider
    if (env.AI_PROVIDER === "groq") {
      this.primaryProvider = new GroqProvider();
    } else if (env.AI_PROVIDER === "mock") {
      this.primaryProvider = this.heuristicProvider;
    } else {
      this.primaryProvider = new GeminiProvider();
    }

    // Configure secondary fallback provider
    if (env.AI_FALLBACK_PROVIDER === "gemini") {
      this.fallbackProvider = new GeminiProvider();
    } else if (env.AI_FALLBACK_PROVIDER === "groq") {
      this.fallbackProvider = new GroqProvider();
    } else {
      this.fallbackProvider = this.heuristicProvider;
    }
  }

  /**
   * Executes AI generation through provider chain with automatic fallback and metric logging.
   */
  private async executeWithFallback<T>(
    operation: "ats_analysis" | "screening_review" | "interview_brief" | "feedback_summary",
    prompt: string,
    systemInstruction: string,
    schemaDescription: string,
    userId?: string
  ): Promise<AIProviderResponse<T>> {
    let lastError: Error | null = null;
    const providersToTry: IAIProvider[] = [];

    if (this.primaryProvider.isAvailable()) {
      providersToTry.push(this.primaryProvider);
    }
    if (this.fallbackProvider.isAvailable() && this.fallbackProvider !== this.primaryProvider) {
      providersToTry.push(this.fallbackProvider);
    }
    // Guaranteed fallback
    providersToTry.push(this.heuristicProvider);

    for (const provider of providersToTry) {
      try {
        const response = await provider.generateStructuredOutput<T>({
          prompt,
          systemInstruction,
          schemaDescription,
        });

        // Record usage metric
        try {
          await AIUsageRecord.create({
            provider: response.provider,
            model: response.model,
            operation,
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens,
            latencyMs: response.latencyMs,
            success: true,
            userId: userId || null,
          });
        } catch (err) {
          console.warn("[AIUsage] Logging error:", err);
        }

        return response;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[AIRouter] Provider ${provider.name} failed for ${operation}:`, lastError.message);

        try {
          await AIUsageRecord.create({
            provider: provider.name,
            model: provider.defaultModel,
            operation,
            inputTokens: 0,
            outputTokens: 0,
            latencyMs: 0,
            success: false,
            errorMessage: lastError.message,
            userId: userId || null,
          });
        } catch {
          // ignore
        }
      }
    }

    throw lastError || new Error("All AI providers in chain failed");
  }

  /**
   * Evaluates candidate resume against job requirements.
   */
  public async analyzeResumeForJob(params: {
    jobTitle: string;
    department: string;
    jobDescription: string;
    requiredSkills: string[];
    preferredSkills?: string[];
    resumeText: string;
    userId?: string;
  }): Promise<AIProviderResponse<AtsAnalysisOutput>> {
    const prompt = buildAtsAnalysisPrompt(params);
    const response = await this.executeWithFallback<AtsAnalysisOutput>(
      "ats_analysis",
      prompt,
      ATS_SYSTEM_INSTRUCTION,
      "atsAnalysisOutputSchema",
      params.userId
    );

    // Validate and sanitize against schema
    const parsed = atsAnalysisOutputSchema.parse(response.data);
    return { ...response, data: parsed };
  }

  /**
   * Generates Stage B Screening questions and evaluation.
   */
  public async generateScreeningReview(params: {
    jobTitle: string;
    jobDescription: string;
    resumeText: string;
    candidateName: string;
    notesSummary?: string;
    userId?: string;
  }): Promise<AIProviderResponse<ScreeningReviewOutput>> {
    const prompt = buildScreeningReviewPrompt(params);
    const response = await this.executeWithFallback<ScreeningReviewOutput>(
      "screening_review",
      prompt,
      ATS_SYSTEM_INSTRUCTION,
      "screeningReviewOutputSchema",
      params.userId
    );

    const parsed = screeningReviewOutputSchema.parse(response.data);
    return { ...response, data: parsed };
  }

  /**
   * Generates Stage C Interview prep brief and rubric questions.
   */
  public async generateInterviewBrief(params: {
    jobTitle: string;
    jobDescription: string;
    resumeText: string;
    candidateName: string;
    screeningNotes?: string;
    userId?: string;
  }): Promise<AIProviderResponse<InterviewBriefOutput>> {
    const prompt = buildInterviewBriefPrompt(params);
    const response = await this.executeWithFallback<InterviewBriefOutput>(
      "interview_brief",
      prompt,
      ATS_SYSTEM_INSTRUCTION,
      "interviewBriefOutputSchema",
      params.userId
    );

    const parsed = interviewBriefOutputSchema.parse(response.data);
    return { ...response, data: parsed };
  }

  /**
   * Synthesizes post-interview feedback from interviewers into candidate-releasable & internal summaries.
   */
  public async synthesizeInterviewFeedback(params: {
    jobTitle: string;
    candidateName: string;
    interviewFeedbackItems: Array<{
      interviewerName: string;
      rating: number;
      notes: string;
      strengths: string;
      concerns: string;
    }>;
    userId?: string;
  }): Promise<AIProviderResponse<FeedbackSynthesisOutput>> {
    const prompt = buildFeedbackSynthesisPrompt(params);
    const response = await this.executeWithFallback<FeedbackSynthesisOutput>(
      "feedback_summary",
      prompt,
      ATS_SYSTEM_INSTRUCTION,
      "feedbackSynthesisOutputSchema",
      params.userId
    );

    const parsed = feedbackSynthesisOutputSchema.parse(response.data);
    return { ...response, data: parsed };
  }
}

export const aiRouter = new AIRouter();

import { IAIProvider, AIProviderResponse } from "./aiProvider.js";
import { OllamaProvider } from "./ollamaProvider.js";
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
import mongoose from "mongoose";

export class AIRouter {
  private primaryProvider: IAIProvider;
  private fallbackProvider: IAIProvider | null = null;
  private heuristicProvider: FallbackProvider;

  constructor() {
    this.heuristicProvider = new FallbackProvider();

    // Configure primary provider
    if (env.AI_PROVIDER === "groq") {
      this.primaryProvider = new GroqProvider();
    } else if (env.AI_PROVIDER === "gemini") {
      this.primaryProvider = new GeminiProvider();
    } else if (env.AI_PROVIDER === "mock") {
      this.primaryProvider = this.heuristicProvider;
    } else if (env.AI_PROVIDER === "ollama") {
      this.primaryProvider = new OllamaProvider();
    } else {
      this.primaryProvider = new GroqProvider();
    }

    // Configure secondary fallback provider
    if (env.AI_FALLBACK_PROVIDER === "gemini") {
      this.fallbackProvider = new GeminiProvider();
    } else if (env.AI_FALLBACK_PROVIDER === "groq") {
      this.fallbackProvider = new GroqProvider();
    } else if (env.AI_FALLBACK_PROVIDER === "mock") {
      this.fallbackProvider = this.heuristicProvider;
    } else if (env.AI_FALLBACK_PROVIDER === "ollama") {
      this.fallbackProvider = new OllamaProvider();
    } else {
      this.fallbackProvider = null;
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

    if (operation === "ats_analysis") {
      // ATS score checking must strictly be done by Groq or Gemini, NEVER Ollama
      const groq = new GroqProvider();
      const gemini = new GeminiProvider();

      const candidateProviders =
        env.AI_PROVIDER === "gemini"
          ? [gemini, groq]
          : [groq, gemini];

      for (const p of candidateProviders) {
        if (p.isAvailable() && !providersToTry.some((existing) => existing.name === p.name)) {
          providersToTry.push(p);
        }
      }
    } else {
      if (this.primaryProvider && this.primaryProvider.isAvailable()) {
        providersToTry.push(this.primaryProvider);
      }
      if (
        this.fallbackProvider &&
        this.fallbackProvider.isAvailable() &&
        this.fallbackProvider !== this.primaryProvider
      ) {
        providersToTry.push(this.fallbackProvider);
      }
    }

    // Explicit safeguard: Ensure Ollama is NEVER included for ATS score checking
    const filteredProviders =
      operation === "ats_analysis"
        ? providersToTry.filter((p) => p.name !== "ollama")
        : providersToTry;

    // Always guarantee heuristic fallback provider is present so recruitment operations never fail when external AI is offline
    if (!filteredProviders.includes(this.heuristicProvider)) {
      filteredProviders.push(this.heuristicProvider);
    }

    for (const provider of filteredProviders) {
      try {
        const response = await provider.generateStructuredOutput<T>({
          prompt,
          systemInstruction,
          schemaDescription,
        });

        // Record usage metric if database is connected
        const validUserId = userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null;
        if (mongoose.connection.readyState === 1) {
          try {
            await AIUsageRecord.create({
              provider: response.provider,
              model: response.model,
              operation,
              inputTokens: response.inputTokens,
              outputTokens: response.outputTokens,
              latencyMs: response.latencyMs,
              success: true,
              userId: validUserId,
            });
          } catch (err) {
            console.warn("[AIUsage] Logging error:", err);
          }
        }

        return response;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[AIRouter] Provider ${provider.name} failed for ${operation}:`, lastError.message);

        if (mongoose.connection.readyState === 1) {
          try {
            const validUserId = userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null;
            await AIUsageRecord.create({
              provider: provider.name,
              model: provider.defaultModel,
              operation,
              inputTokens: 0,
              outputTokens: 0,
              latencyMs: 0,
              success: false,
              errorMessage: lastError.message,
              userId: validUserId,
            });
          } catch {
            // ignore
          }
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

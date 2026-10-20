import { IAIProvider, GenerateStructuredOutputOptions, AIProviderResponse } from "./aiProvider.js";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/errorHandler.js";

export class GroqProvider implements IAIProvider {
  public readonly name = "groq";
  public readonly defaultModel: string;
  private apiKey?: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || env.GROQ_API_KEY;
    this.defaultModel = model || env.GROQ_MODEL || "qwen/qwen3.8-27b";
  }

  public isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public async generateStructuredOutput<T>(
    options: GenerateStructuredOutputOptions
  ): Promise<AIProviderResponse<T>> {
    if (!this.isAvailable()) {
      throw new AppError("Groq API key is not configured", 503, "AI_PROVIDER_UNCONFIGURED");
    }

    const startTime = Date.now();
    const endpoint = "https://api.groq.com/openai/v1/chat/completions";

    const messages = [];
    if (options.systemInstruction) {
      messages.push({ role: "system", content: options.systemInstruction });
    }
    messages.push({ role: "user", content: options.prompt });

    let activeModel = this.defaultModel;
    let retries = 2;
    let lastError: Error | null = null;

    while (retries >= 0) {
      const requestBody = {
        model: activeModel,
        messages,
        response_format: { type: "json_object" },
        max_tokens: options.maxTokens || 2048,
        temperature: options.temperature ?? 0.2,
      };

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (response.status === 429) {
          if (retries > 0) {
            retries--;
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          throw new AppError("Groq API rate limit exceeded (HTTP 429)", 429, "AI_RATE_LIMIT");
        }

        if (!response.ok) {
          const errText = await response.text();
          // If configured model doesn't exist, fallback to verified qwen/qwen3.8-27b
          if (
            (response.status === 404 || errText.includes("model_not_found") || errText.includes("does not exist")) &&
            activeModel !== "qwen/qwen3.8-27b"
          ) {
            console.warn(`[GroqProvider] Model ${activeModel} not found, falling back to qwen/qwen3.8-27b`);
            activeModel = "qwen/qwen3.8-27b";
            retries--;
            continue;
          }

          throw new AppError(
            `Groq API error (${response.status}): ${errText.slice(0, 200)}`,
            502,
            "AI_PROVIDER_ERROR"
          );
        }

        const json = await response.json() as {
          choices?: Array<{
            message?: { content?: string };
            finish_reason?: string;
          }>;
          usage?: {
            prompt_tokens?: number;
            completion_tokens?: number;
          };
        };

        let rawText = json.choices?.[0]?.message?.content;
        if (!rawText) {
          throw new AppError("Empty response returned from Groq API", 502, "AI_EMPTY_RESPONSE");
        }

        // Clean any markdown code blocks if model wrapped JSON
        const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          rawText = codeBlockMatch[1].trim();
        }

        const parsedData = JSON.parse(rawText) as T;
        const latencyMs = Date.now() - startTime;

        return {
          data: parsedData,
          rawText,
          provider: this.name,
          model: this.defaultModel,
          inputTokens: json.usage?.prompt_tokens || Math.round(options.prompt.length / 4),
          outputTokens: json.usage?.completion_tokens || Math.round(rawText.length / 4),
          latencyMs,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (retries > 0 && !(err instanceof AppError && err.statusCode === 429)) {
          retries--;
          await new Promise((r) => setTimeout(r, 1000));
        } else {
          break;
        }
      }
    }

    throw lastError || new AppError("Failed to generate content with Groq", 502, "AI_FAILURE");
  }
}

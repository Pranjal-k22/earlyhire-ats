import { IAIProvider, GenerateStructuredOutputOptions, AIProviderResponse } from "./aiProvider.js";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/errorHandler.js";

export class GeminiProvider implements IAIProvider {
  public readonly name = "gemini";
  public readonly defaultModel: string;
  private apiKey?: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || env.GEMINI_API_KEY;
    this.defaultModel = model || env.GEMINI_MODEL || "gemini-2.5-flash";
  }

  public isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public async generateStructuredOutput<T>(
    options: GenerateStructuredOutputOptions
  ): Promise<AIProviderResponse<T>> {
    if (!this.isAvailable()) {
      throw new AppError("Gemini API key is not configured", 503, "AI_PROVIDER_UNCONFIGURED");
    }

    const startTime = Date.now();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.defaultModel}:generateContent`;

    const requestBody = {
      systemInstruction: options.systemInstruction
        ? { parts: [{ text: options.systemInstruction }] }
        : undefined,
      contents: [
        {
          role: "user",
          parts: [{ text: options.prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: options.maxTokens || 2048,
        temperature: options.temperature ?? 0.2,
      },
    };

    let retries = 2;
    let lastError: Error | null = null;

    while (retries >= 0) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey!,
          },
          body: JSON.stringify(requestBody),
        });

        if (response.status === 429) {
          if (retries > 0) {
            retries--;
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          throw new AppError("Gemini API rate limit exceeded (HTTP 429)", 429, "AI_RATE_LIMIT");
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new AppError(
            `Gemini API error (${response.status}): ${errText.slice(0, 200)}`,
            502,
            "AI_PROVIDER_ERROR"
          );
        }

        const json = await response.json() as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
            finishReason?: string;
          }>;
          usageMetadata?: {
            promptTokenCount?: number;
            candidatesTokenCount?: number;
          };
        };

        const parts = json.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find((p) => p.text && p.text.trim().length > 0) || parts[0];
        let rawText = textPart?.text;
        if (!rawText) {
          throw new AppError("Empty response returned from Gemini API", 502, "AI_EMPTY_RESPONSE");
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
          inputTokens: json.usageMetadata?.promptTokenCount || Math.round(options.prompt.length / 4),
          outputTokens: json.usageMetadata?.candidatesTokenCount || Math.round(rawText.length / 4),
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

    throw lastError || new AppError("Failed to generate content with Gemini", 502, "AI_FAILURE");
  }
}

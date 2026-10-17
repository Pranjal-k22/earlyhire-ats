import { IAIProvider, GenerateStructuredOutputOptions, AIProviderResponse } from "./aiProvider.js";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/errorHandler.js";

/**
 * OllamaProvider
 * 
 * Executes local LLM inference against Ollama's native HTTP API (POST /api/chat).
 * Supports JSON structured output, bounded request timeouts, and token metrics.
 */
export class OllamaProvider implements IAIProvider {
  public readonly name = "ollama";
  public readonly defaultModel: string;
  public readonly baseUrl: string;
  public readonly timeoutMs: number;

  constructor(baseUrl?: string, model?: string, timeoutMs?: number) {
    this.baseUrl = (baseUrl !== undefined ? baseUrl : (env.OLLAMA_BASE_URL || "http://127.0.0.1:11434")).trim().replace(/\/+$/, "");
    this.defaultModel = model || env.OLLAMA_MODEL || "qwen2.5:7b";
    this.timeoutMs = timeoutMs || env.OLLAMA_TIMEOUT_MS || 120000;
  }

  public isAvailable(): boolean {
    return Boolean(this.baseUrl && this.baseUrl.trim().length > 0);
  }

  public async generateStructuredOutput<T>(
    options: GenerateStructuredOutputOptions
  ): Promise<AIProviderResponse<T>> {
    if (!this.isAvailable()) {
      throw new AppError("Ollama base URL is not configured", 503, "AI_PROVIDER_UNCONFIGURED");
    }

    const startTime = Date.now();
    const endpoint = `${this.baseUrl}/api/chat`;

    const messages = [];
    if (options.systemInstruction) {
      messages.push({ role: "system", content: options.systemInstruction });
    }
    messages.push({ role: "user", content: options.prompt });

    const requestBody = {
      model: this.defaultModel,
      messages,
      stream: false,
      format: "json",
      options: {
        temperature: options.temperature ?? 0.2,
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new AppError(
            `Ollama model '${this.defaultModel}' is not installed. Please run 'ollama pull ${this.defaultModel}' in your terminal.`,
            502,
            "OLLAMA_MODEL_NOT_FOUND"
          );
        }
        const errText = await response.text();
        throw new AppError(
          `Ollama API error (${response.status}): ${errText.slice(0, 200)}`,
          502,
          "AI_PROVIDER_ERROR"
        );
      }

      const json = (await response.json()) as {
        model?: string;
        message?: { content?: string };
        done?: boolean;
        prompt_eval_count?: number;
        eval_count?: number;
      };

      const rawText = json.message?.content;
      if (!rawText || rawText.trim().length === 0) {
        throw new AppError("Empty response returned from Ollama API", 502, "AI_EMPTY_RESPONSE");
      }

      let parsedData: T;
      try {
        parsedData = JSON.parse(rawText) as T;
      } catch {
        // Fallback for markdown-wrapped json output
        const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[1]) as T;
          } catch {
            throw new AppError("Failed to parse structured JSON from Ollama response", 502, "AI_MALFORMED_OUTPUT");
          }
        } else {
          throw new AppError("Failed to parse structured JSON from Ollama response", 502, "AI_MALFORMED_OUTPUT");
        }
      }

      const latencyMs = Date.now() - startTime;
      const reportedModel = json.model || this.defaultModel;

      return {
        data: parsedData,
        rawText,
        provider: this.name,
        model: reportedModel,
        inputTokens: typeof json.prompt_eval_count === "number" ? json.prompt_eval_count : 0,
        outputTokens: typeof json.eval_count === "number" ? json.eval_count : 0,
        latencyMs,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;

      if ((err as Error)?.name === "AbortError") {
        throw new AppError(
          `Ollama inference timed out after ${Math.round(this.timeoutMs / 1000)}s. The local model may still be loading or system is under high load.`,
          504,
          "OLLAMA_TIMEOUT"
        );
      }

      const errMsg = (err as Error)?.message || String(err);
      if (errMsg.includes("fetch failed") || errMsg.includes("ECONNREFUSED")) {
        throw new AppError(
          `Local Ollama service is unreachable at ${this.baseUrl}. Please verify Ollama is installed and running (run 'ollama serve' in your terminal).`,
          503,
          "OLLAMA_UNREACHABLE"
        );
      }

      throw new AppError(
        `Failed to generate content with Ollama: ${errMsg.slice(0, 200)}`,
        502,
        "AI_FAILURE"
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

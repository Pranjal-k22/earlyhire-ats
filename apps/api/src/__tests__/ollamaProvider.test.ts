import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OllamaProvider } from "../services/ai/ollamaProvider.js";
import { atsAnalysisOutputSchema } from "../services/ai/schemas.js";

describe("OllamaProvider Unit & Error Handling Suite", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("conforms to IAIProvider interface and reports availability based on baseUrl", () => {
    const provider = new OllamaProvider("http://127.0.0.1:11434", "qwen2.5:7b");
    expect(provider.name).toBe("ollama");
    expect(provider.defaultModel).toBe("qwen2.5:7b");
    expect(provider.baseUrl).toBe("http://127.0.0.1:11434");
    expect(provider.isAvailable()).toBe(true);

    const emptyProvider = new OllamaProvider("");
    expect(emptyProvider.isAvailable()).toBe(false);
  });

  it("successfully generates structured ATS output and extracts token usage", async () => {
    const mockOutput = {
      overallScore: 88,
      breakdown: {
        skillsScore: 90,
        experienceScore: 85,
        educationScore: 90,
        roleRelevanceScore: 87,
      },
      requiredSkillsFound: ["TypeScript", "Node.js", "React"],
      missingCriteria: ["Kubernetes (not evidenced in this resume)"],
      experienceEvidence: ["Built scalable microservices in Node.js", "Led React frontend migration"],
      concreteSuggestions: ["Highlight hands-on Docker and Kubernetes deployments"],
      suggestedInterviewTopics: ["System architecture and state management"],
      confidence: "high",
      summary: "Candidate exhibits strong core fullstack alignment with clear competencies in TypeScript and Node.js.",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        model: "qwen2.5:7b",
        created_at: "2026-10-18T00:00:00Z",
        message: {
          role: "assistant",
          content: JSON.stringify(mockOutput),
        },
        done: true,
        done_reason: "stop",
        prompt_eval_count: 512,
        eval_count: 256,
      }),
    });

    const provider = new OllamaProvider("http://127.0.0.1:11434", "qwen2.5:7b", 10000);
    const result = await provider.generateStructuredOutput<typeof mockOutput>({
      prompt: "Evaluate candidate against Senior Engineer requirements",
      systemInstruction: "You are an objective ATS evaluator.",
      schemaDescription: "atsAnalysisOutputSchema",
    });

    expect(result.provider).toBe("ollama");
    expect(result.model).toBe("qwen2.5:7b");
    expect(result.inputTokens).toBe(512);
    expect(result.outputTokens).toBe(256);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    // Validate schema
    const validated = atsAnalysisOutputSchema.parse(result.data);
    expect(validated.overallScore).toBe(88);
    expect(validated.requiredSkillsFound).toContain("TypeScript");
    expect(validated.confidence).toBe("high");
  });

  it("handles markdown code-block wrapped JSON from Ollama", async () => {
    const mockOutput = {
      overallScore: 75,
      breakdown: {
        skillsScore: 70,
        experienceScore: 80,
        educationScore: 75,
        roleRelevanceScore: 75,
      },
      requiredSkillsFound: ["Python"],
      missingCriteria: ["Go (not evidenced in this resume)"],
      experienceEvidence: ["Developed backend services"],
      concreteSuggestions: ["Mention cloud experience"],
      suggestedInterviewTopics: ["Concurrency in Python"],
      confidence: "medium",
      summary: "Good backend background.",
    };

    const wrappedJson = "```json\n" + JSON.stringify(mockOutput) + "\n```";

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        model: "qwen2.5:7b",
        message: {
          role: "assistant",
          content: wrappedJson,
        },
        done: true,
      }),
    });

    const provider = new OllamaProvider("http://127.0.0.1:11434", "qwen2.5:7b");
    const result = await provider.generateStructuredOutput<typeof mockOutput>({
      prompt: "Evaluate candidate",
      schemaDescription: "atsAnalysisOutputSchema",
    });

    expect(result.data.overallScore).toBe(75);
    expect(result.data.requiredSkillsFound).toContain("Python");
  });

  it("handles connection refused with 503 OLLAMA_UNREACHABLE error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("fetch failed: connect ECONNREFUSED 127.0.0.1:11434"));

    const provider = new OllamaProvider("http://127.0.0.1:11434", "qwen2.5:7b");

    await expect(
      provider.generateStructuredOutput({
        prompt: "Evaluate candidate",
        schemaDescription: "atsAnalysisOutputSchema",
      })
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 503,
        code: "OLLAMA_UNREACHABLE",
      })
    );
  });

  it("handles 404 model not found with 502 OLLAMA_MODEL_NOT_FOUND error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "model 'nonexistent-model' not found",
    });

    const provider = new OllamaProvider("http://127.0.0.1:11434", "nonexistent-model");

    await expect(
      provider.generateStructuredOutput({
        prompt: "Evaluate candidate",
        schemaDescription: "atsAnalysisOutputSchema",
      })
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 502,
        code: "OLLAMA_MODEL_NOT_FOUND",
      })
    );
  });

  it("handles timeout with 504 OLLAMA_TIMEOUT error", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    globalThis.fetch = vi.fn().mockRejectedValue(abortError);

    const provider = new OllamaProvider("http://127.0.0.1:11434", "qwen2.5:7b", 1000);

    await expect(
      provider.generateStructuredOutput({
        prompt: "Evaluate candidate",
        schemaDescription: "atsAnalysisOutputSchema",
      })
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 504,
        code: "OLLAMA_TIMEOUT",
      })
    );
  });

  it("handles empty assistant response with 502 AI_EMPTY_RESPONSE error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        model: "qwen2.5:7b",
        message: { role: "assistant", content: "" },
        done: true,
      }),
    });

    const provider = new OllamaProvider("http://127.0.0.1:11434", "qwen2.5:7b");

    await expect(
      provider.generateStructuredOutput({
        prompt: "Evaluate candidate",
        schemaDescription: "atsAnalysisOutputSchema",
      })
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 502,
        code: "AI_EMPTY_RESPONSE",
      })
    );
  });
});

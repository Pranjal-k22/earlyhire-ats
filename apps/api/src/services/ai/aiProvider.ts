export interface GenerateStructuredOutputOptions {
  prompt: string;
  systemInstruction?: string;
  schemaDescription: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIProviderResponse<T> {
  data: T;
  rawText: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface IAIProvider {
  readonly name: string;
  readonly defaultModel: string;
  isAvailable(): boolean;
  generateStructuredOutput<T>(
    options: GenerateStructuredOutputOptions
  ): Promise<AIProviderResponse<T>>;
}

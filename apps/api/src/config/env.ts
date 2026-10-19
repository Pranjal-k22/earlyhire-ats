import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isTestMode = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

dotenv.config({ path: path.resolve(__dirname, "../../../../.env"), override: !isTestMode });
dotenv.config({ path: path.resolve(__dirname, "../../../.env"), override: !isTestMode });
dotenv.config({ override: !isTestMode });

if (isTestMode) {
  process.env.NODE_ENV = "test";
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default(isTestMode ? "test" : "development"),
    PORT: z.string().default("5000").transform((val) => parseInt(val, 10)),
    HOST: z.string().default("0.0.0.0"),
    CLIENT_URL: z.string().default("http://localhost:5173"),
    MONGODB_URI: z.string().default("mongodb://localhost:27017/earlyai_ats_dev"),
    JWT_SECRET: z.string().default("development_jwt_secret_at_least_32_characters_long_placeholder"),
    JWT_EXPIRES_IN: z.string().default("7d"),
    COOKIE_SAME_SITE: z.enum(["lax", "none", "strict"]).optional(),
    RESUME_STORAGE_DIR: z.string().default("uploads/resumes"),
    RESUME_STORAGE_DRIVER: z.enum(["local", "r2"]).default("local"),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ENDPOINT: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    AI_PROVIDER: z.enum(["ollama", "gemini", "groq", "mock"]).default("ollama"),
    AI_FALLBACK_PROVIDER: z.enum(["ollama", "gemini", "groq", "mock", "none"]).default("mock"),
    OLLAMA_BASE_URL: z.string().default("http://127.0.0.1:11434"),
    OLLAMA_MODEL: z.string().default("qwen2.5:7b"),
    OLLAMA_TIMEOUT_MS: z
      .union([z.string().transform((val) => parseInt(val, 10)), z.number()])
      .default(180000),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
    GROQ_API_KEY: z.string().optional(),
    GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_REDIRECT_URI: z.string().optional(),
  })
  .transform((data) => {
    if (data.NODE_ENV === "test" || isTestMode) {
      return {
        ...data,
        NODE_ENV: "test" as const,
        MONGODB_URI: process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/earlyai_ats_test",
        AI_PROVIDER: (process.env.TEST_AI_PROVIDER as "ollama" | "gemini" | "groq" | "mock") || "mock",
        AI_FALLBACK_PROVIDER: (process.env.TEST_AI_FALLBACK_PROVIDER as "ollama" | "gemini" | "groq" | "mock" | "none") || "mock",
        RESUME_STORAGE_DRIVER: (process.env.TEST_RESUME_STORAGE_DRIVER as "local" | "r2") || data.RESUME_STORAGE_DRIVER || "local",
      };
    }
    return data;
  })
  .superRefine((data, ctx) => {
    // Validate Cloudflare R2 required configuration when driver is 'r2'
    if (data.RESUME_STORAGE_DRIVER === "r2") {
      if (!data.R2_BUCKET_NAME || data.R2_BUCKET_NAME.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["R2_BUCKET_NAME"],
          message: "R2_BUCKET_NAME is required when RESUME_STORAGE_DRIVER=r2",
        });
      }
      if (!data.R2_ACCESS_KEY_ID || data.R2_ACCESS_KEY_ID.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["R2_ACCESS_KEY_ID"],
          message: "R2_ACCESS_KEY_ID is required when RESUME_STORAGE_DRIVER=r2",
        });
      }
      if (!data.R2_SECRET_ACCESS_KEY || data.R2_SECRET_ACCESS_KEY.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["R2_SECRET_ACCESS_KEY"],
          message: "R2_SECRET_ACCESS_KEY is required when RESUME_STORAGE_DRIVER=r2",
        });
      }
      if (
        (!data.R2_ENDPOINT || data.R2_ENDPOINT.trim().length === 0) &&
        (!data.R2_ACCOUNT_ID || data.R2_ACCOUNT_ID.trim().length === 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["R2_ENDPOINT"],
          message: "Either R2_ENDPOINT or R2_ACCOUNT_ID is required when RESUME_STORAGE_DRIVER=r2",
        });
      }
    }

    if (data.NODE_ENV === "production") {
      // Production must never silently fall back to local storage
      if (data.RESUME_STORAGE_DRIVER !== "r2") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["RESUME_STORAGE_DRIVER"],
          message: "Production environment requires RESUME_STORAGE_DRIVER=r2 to ensure durable resume storage across instance redeployments",
        });
      }
      if (!data.MONGODB_URI || data.MONGODB_URI.includes("localhost") || data.MONGODB_URI === "mongodb://localhost:27017/earlyai_ats_dev") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["MONGODB_URI"],
          message: "A valid production MONGODB_URI (e.g. MongoDB Atlas) must be configured in production mode",
        });
      }
      if (
        !data.JWT_SECRET ||
        data.JWT_SECRET === "development_jwt_secret_at_least_32_characters_long_placeholder" ||
        data.JWT_SECRET.length < 32
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message: "A secure JWT_SECRET with at least 32 characters is required in production mode",
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;

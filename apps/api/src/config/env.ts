import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.string().default("5000").transform((val) => parseInt(val, 10)),
    HOST: z.string().default("0.0.0.0"),
    CLIENT_URL: z.string().default("http://localhost:5173"),
    MONGODB_URI: z.string().default("mongodb://localhost:27017/earlyai_ats_dev"),
    JWT_SECRET: z.string().default("development_jwt_secret_at_least_32_characters_long_placeholder"),
    JWT_EXPIRES_IN: z.string().default("7d"),
    COOKIE_SAME_SITE: z.enum(["lax", "none", "strict"]).optional(),
  })
  .transform((data) => {
    if (data.NODE_ENV === "test") {
      return {
        ...data,
        MONGODB_URI: process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/earlyai_ats_test",
      };
    }
    return data;
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
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

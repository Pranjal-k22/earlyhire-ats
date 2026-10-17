import { z } from "zod";
import { HIRING_STAGES } from "../models/stageHistory.model.js";
import { APPLICATION_STATUSES } from "../models/application.model.js";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createApplicationSchema = z.object({
  candidateId: z
    .string({ required_error: "Candidate ID is required" })
    .trim()
    .min(1, "Candidate ID is required"),
  jobId: z
    .string({ required_error: "Job ID is required" })
    .trim()
    .min(1, "Job ID is required"),
  recruiterId: z
    .string()
    .trim()
    .regex(objectIdRegex, "Invalid recruiter ID format")
    .optional(),
  source: z.string().trim().max(100).optional(),
});

export const stageTransitionSchema = z.object({
  toStage: z.enum(HIRING_STAGES, {
    errorMap: () => ({
      message: `toStage must be one of: ${HIRING_STAGES.join(", ")}`,
    }),
  }),
  expectedStage: z.enum(HIRING_STAGES).optional(),
  expectedVersion: z.number().int().min(0).optional(),
  reason: z.string().trim().max(1000).optional().nullable(),
});

export const updateApplicationSchema = z
  .object({
    recruiterId: z
      .string()
      .trim()
      .regex(objectIdRegex, "Invalid recruiter ID format")
      .optional(),
    status: z.enum(APPLICATION_STATUSES).optional(),
    source: z.string().trim().max(100).optional(),
    stage: z.any().optional(),
    currentStage: z.any().optional(),
  })
  .refine(
    (data) => data.stage === undefined && data.currentStage === undefined,
    {
      message: "Stage cannot be updated via this endpoint. Use /stage endpoint.",
      path: ["stage"],
    }
  );

export const applicationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  jobId: z.string().trim().optional(),
  candidateId: z.string().trim().optional(),
  recruiterId: z.string().trim().optional(),
  stage: z.enum(HIRING_STAGES).optional(),
  currentStage: z.enum(HIRING_STAGES).optional(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  sort: z.enum(["appliedAt", "lastStageChangedAt", "createdAt", "stage"]).default("appliedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().trim().optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type StageTransitionInput = z.infer<typeof stageTransitionSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type ApplicationQueryInput = z.infer<typeof applicationQuerySchema>;

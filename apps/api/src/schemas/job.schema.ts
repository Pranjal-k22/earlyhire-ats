import { z } from "zod";

const employmentTypeEnum = z.enum(["FullTime", "PartTime", "Contract", "Internship"]);
const jobStatusEnum = z.enum(["Open", "Paused", "Closed", "Archived"]);

// Helper to normalize status values case-insensitively
const normalizeStatus = (val: unknown): string => {
  if (typeof val !== "string") return "Open";
  const lower = val.trim().toLowerCase();
  if (lower === "open") return "Open";
  if (lower === "paused" || lower === "on_hold" || lower === "onhold") return "Paused";
  if (lower === "closed") return "Closed";
  if (lower === "archived") return "Archived";
  return val;
};

// Helper to normalize employment type case-insensitively
const normalizeEmploymentType = (val: unknown): string => {
  if (typeof val !== "string") return "FullTime";
  const lower = val.trim().toLowerCase().replace(/[-_\s]/g, "");
  if (lower === "fulltime") return "FullTime";
  if (lower === "parttime") return "PartTime";
  if (lower === "contract") return "Contract";
  if (lower === "internship") return "Internship";
  return val;
};

export const createJobSchema = z
  .object({
    title: z
      .string({ required_error: "Job title is required" })
      .trim()
      .min(2, "Title must be at least 2 characters")
      .max(150, "Title cannot exceed 150 characters"),
    department: z.string().trim().default("General"),
    location: z.string().trim().default("Remote"),
    employmentType: z
      .preprocess(normalizeEmploymentType, employmentTypeEnum)
      .default("FullTime"),
    description: z
      .string({ required_error: "Job description is required" })
      .trim()
      .min(2, "Description must be at least 2 characters")
      .max(10000, "Description cannot exceed 10,000 characters"),
    requirements: z
      .preprocess((val) => {
        if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
        if (typeof val === "string") {
          return val
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean);
        }
        return [];
      }, z.array(z.string()))
      .default([]),
    experienceMin: z.coerce.number().min(0, "Experience cannot be negative").max(50).default(0),
    experienceMax: z.coerce.number().min(0, "Experience cannot be negative").max(50).optional(),
    status: z.preprocess(normalizeStatus, jobStatusEnum).default("Open"),
    openedAt: z.coerce.date().optional(),
    closesAt: z
      .preprocess((val) => (val === "" || val === null ? null : val), z.coerce.date().nullable().optional())
      .default(null),
  })
  .refine(
    (data) => {
      if (data.experienceMax !== undefined && data.experienceMax !== null) {
        return data.experienceMax >= data.experienceMin;
      }
      return true;
    },
    {
      message: "Maximum experience must be greater than or equal to minimum experience",
      path: ["experienceMax"],
    }
  )
  .refine(
    (data) => {
      if (data.closesAt && data.openedAt) {
        return data.closesAt >= data.openedAt;
      }
      return true;
    },
    {
      message: "Closing date cannot predate opening date",
      path: ["closesAt"],
    }
  );

export const updateJobSchema = z
  .object({
    title: z.string().trim().min(2).max(150).optional(),
    department: z.string().trim().optional(),
    location: z.string().trim().optional(),
    employmentType: z.preprocess(normalizeEmploymentType, employmentTypeEnum).optional(),
    description: z.string().trim().min(2).max(10000).optional(),
    requirements: z
      .preprocess((val) => {
        if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
        if (typeof val === "string") {
          return val
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean);
        }
        return undefined;
      }, z.array(z.string()).optional())
      .optional(),
    experienceMin: z.coerce.number().min(0).max(50).optional(),
    experienceMax: z.coerce.number().min(0).max(50).optional(),
    status: z.preprocess(normalizeStatus, jobStatusEnum).optional(),
    closesAt: z
      .preprocess((val) => (val === "" || val === null ? null : val), z.coerce.date().nullable().optional())
      .optional(),
  })
  .refine(
    (data) => {
      if (data.experienceMin !== undefined && data.experienceMax !== undefined) {
        return data.experienceMax >= data.experienceMin;
      }
      return true;
    },
    {
      message: "Maximum experience must be greater than or equal to minimum experience",
      path: ["experienceMax"],
    }
  );

export const jobQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  search: z.string().trim().max(100, "Search query cannot exceed 100 characters").optional(),
  department: z.string().trim().max(100).optional(),
  location: z.string().trim().max(100).optional(),
  employmentType: z.string().trim().optional(),
  createdFrom: z.string().trim().optional(),
  createdTo: z.string().trim().optional(),
  sort: z.enum(["openedAt", "createdAt", "title", "status"]).default("openedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  includeArchived: z
    .preprocess((val) => val === "true" || val === true, z.boolean())
    .optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type JobQueryInput = z.infer<typeof jobQuerySchema>;

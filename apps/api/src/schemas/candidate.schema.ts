import { z } from "zod";

const VALID_SOURCES = [
  "Referral",
  "LinkedIn",
  "CompanyWebsite",
  "JobBoard",
  "Agency",
  "Other",
] as const;

export const candidateSourceSchema = z.preprocess((val) => {
  if (typeof val !== "string") return val;
  const normalized = val.trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (normalized === "referral") return "Referral";
  if (normalized === "linkedin") return "LinkedIn";
  if (normalized === "companywebsite") return "CompanyWebsite";
  if (normalized === "jobboard") return "JobBoard";
  if (normalized === "agency") return "Agency";
  if (normalized === "other") return "Other";
  return val;
}, z.enum(VALID_SOURCES, {
  errorMap: () => ({
    message: "Source must be one of: Referral, LinkedIn, CompanyWebsite, JobBoard, Agency, Other",
  }),
}));

export const resumeUrlSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .or(z.literal(""))
  .refine(
    (url) => {
      if (!url) return true;
      try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    {
      message: "Resume URL must be a valid HTTP or HTTPS web address",
    }
  )
  .transform((url) => {
    if (!url || url.trim() === "") return null;
    return url.trim();
  });

export const phoneSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine(
    (phone) => {
      if (!phone || phone.trim() === "") return true;
      // Allow international + format, spaces, hyphens, parentheses, 5-20 characters
      return /^(\+?\d{1,4}[-.\s]?)?(\(?\d{1,4}\)?[-.\s]?)?[\d-.\s]{5,20}$/.test(phone.trim());
    },
    {
      message: "Please provide a valid contact phone number (e.g. +91 98765 43210)",
    }
  );

export const skillsSchema = z
  .preprocess((val) => {
    if (typeof val === "string") {
      return val
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return val;
  }, z.array(z.string().trim().min(1, "Skill cannot be empty").max(50, "Skill name is too long")))
  .default([])
  .transform((skills) => {
    // Deduplicate case-insensitively
    const seen = new Set<string>();
    const deduplicated: string[] = [];
    for (const skill of skills) {
      const lower = skill.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        deduplicated.push(skill);
      }
    }
    return deduplicated;
  });

export const createCandidateSchema = z
  .object({
    name: z
      .string({ required_error: "Candidate name is required" })
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(150, "Name cannot exceed 150 characters")
      .optional(),
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(150, "Full name cannot exceed 150 characters")
      .optional(),
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Please provide a valid email address"),
    phone: phoneSchema,
    location: z.string().trim().max(150).optional().default("Remote"),
    currentTitle: z.string().trim().max(150).optional().default(""),
    experienceYears: z.coerce
      .number({ invalid_type_error: "Experience years must be a number" })
      .min(0, "Experience years cannot be negative")
      .max(60, "Experience years cannot exceed 60 years")
      .default(0),
    skills: skillsSchema,
    resumeUrl: resumeUrlSchema,
    source: candidateSourceSchema.default("Other"),
    summary: z.string().trim().max(2000, "Summary cannot exceed 2000 characters").optional().default(""),
  })
  .refine((data) => Boolean(data.name || data.fullName), {
    message: "Candidate name is required",
    path: ["name"],
  })
  .transform((data) => ({
    ...data,
    name: (data.name || data.fullName) as string,
    fullName: (data.fullName || data.name) as string,
  }));

export const updateCandidateSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(150).optional(),
    fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(150).optional(),
    email: z.string().trim().toLowerCase().email("Please provide a valid email address").optional(),
    phone: phoneSchema,
    location: z.string().trim().max(150).optional(),
    currentTitle: z.string().trim().max(150).optional(),
    experienceYears: z.coerce
      .number()
      .min(0, "Experience years cannot be negative")
      .max(60, "Experience years cannot exceed 60 years")
      .optional(),
    skills: skillsSchema.optional(),
    resumeUrl: resumeUrlSchema,
    source: candidateSourceSchema.optional(),
    summary: z.string().trim().max(2000).optional(),
  })
  .transform((data) => {
    const result = { ...data };
    if (result.name && !result.fullName) result.fullName = result.name;
    if (result.fullName && !result.name) result.name = result.fullName;
    return result;
  });

export const candidateQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100, "Search query cannot exceed 100 characters").optional(),
  skill: z.string().trim().max(50, "Skill filter cannot exceed 50 characters").optional(),
  source: z.string().trim().optional(),
  createdFrom: z.string().trim().optional(),
  createdTo: z.string().trim().optional(),
  experienceMin: z.coerce.number().min(0).max(60).optional(),
  experienceMax: z.coerce.number().min(0).max(60).optional(),
  sort: z.enum(["createdAt", "name", "fullName", "experienceYears"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  includeArchived: z
    .preprocess((val) => val === "true" || val === true || val === 1 || val === "1", z.boolean())
    .default(false),
});

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;
export type UpdateCandidateInput = z.infer<typeof updateCandidateSchema>;
export type CandidateQueryInput = z.infer<typeof candidateQuerySchema>;

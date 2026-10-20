import { z } from "zod";

/**
 * Password Policy:
 * - Minimum 8 characters, maximum 128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 */
export const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password cannot exceed 128 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const signupSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  password: passwordSchema,
  // Public signup strictly creates candidate accounts.
  // Any attempt to supply privileged roles (admin, platform_manager, hiring_team, etc.) is rejected with 403 FORBIDDEN.
  role: z.string().optional(),
});

export const recruiterSignupSchema = z.object({
  name: z
    .string({ required_error: "Full name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  email: z
    .string({ required_error: "Work email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid work email address"),
  password: passwordSchema,
  company: z
    .string({ required_error: "Company / organization name is required" })
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name cannot exceed 100 characters"),
  department: z.string().trim().max(100).optional(),
  headline: z.string().trim().max(150).optional(),
  phone: z.string().trim().max(30).optional(),
  inviteCode: z.string().trim().optional(),
  role: z.enum(["recruiter", "hiring_team"]).optional().default("recruiter"),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type RecruiterSignupInput = z.infer<typeof recruiterSignupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

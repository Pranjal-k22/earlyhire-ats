import { z } from "zod";

export const createNoteSchema = z.object({
  body: z
    .string({ required_error: "Note body is required" })
    .trim()
    .min(1, "Note cannot be empty")
    .max(5000, "Note cannot exceed 5000 characters")
    .refine(
      (val) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(val),
      {
        message: "Note cannot contain executable script tags",
      }
    ),
});

export const noteQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type NoteQueryInput = z.infer<typeof noteQuerySchema>;

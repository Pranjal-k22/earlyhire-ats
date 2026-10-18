import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, AlertCircle } from "lucide-react";
import { Candidate, CandidateFormData } from "../../types/candidate";

const candidateFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(150, "Name cannot exceed 150 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (phone) => {
        if (!phone || phone === "") return true;
        return /^(\+?\d{1,4}[-.\s]?)?(\(?\d{1,4}\)?[-.\s]?)?[\d-.\s]{5,20}$/.test(phone);
      },
      { message: "Please enter a valid phone number (e.g. +91 98765 43210)" }
    ),
  location: z.string().trim().max(150).optional(),
  currentTitle: z.string().trim().max(150).optional(),
  experienceYears: z.coerce
    .number({ invalid_type_error: "Experience years must be a number" })
    .min(0, "Experience cannot be negative")
    .max(60, "Experience cannot exceed 60 years"),
  skillsRaw: z.string().optional(),
  resumeUrl: z
    .string()
    .trim()
    .optional()
    .refine(
      (url) => {
        if (!url || url === "") return true;
        try {
          const parsed = new URL(url);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Resume URL must be a valid HTTP or HTTPS address" }
    ),
  source: z.enum(["Referral", "LinkedIn", "CompanyWebsite", "JobBoard", "Agency", "Other"]),
  summary: z.string().trim().max(2000, "Summary cannot exceed 2000 characters").optional(),
});

type FormValues = z.infer<typeof candidateFormSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CandidateFormData) => Promise<void>;
  initialData?: Candidate | null;
  serverError?: string | null;
}

export const CandidateFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  serverError,
}) => {
  const isEditing = Boolean(initialData);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(candidateFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      location: "",
      currentTitle: "",
      experienceYears: 0,
      skillsRaw: "",
      resumeUrl: "",
      source: "Other",
      summary: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || initialData.fullName || "",
        email: initialData.email,
        phone: initialData.phone || "",
        location: initialData.location || "",
        currentTitle: initialData.currentTitle || "",
        experienceYears: initialData.experienceYears || 0,
        skillsRaw: (initialData.skills || []).join(", "),
        resumeUrl: initialData.resumeUrl || "",
        source: initialData.source || "Other",
        summary: initialData.summary || "",
      });
    } else {
      reset({
        name: "",
        email: "",
        phone: "",
        location: "",
        currentTitle: "",
        experienceYears: 0,
        skillsRaw: "",
        resumeUrl: "",
        source: "Other",
        summary: "",
      });
    }
  }, [initialData, reset, isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const onFormSubmit = async (values: FormValues) => {
    const skills = values.skillsRaw
      ? values.skillsRaw
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const payload: CandidateFormData = {
      name: values.name,
      email: values.email,
      phone: values.phone?.trim() || undefined,
      location: values.location?.trim() || undefined,
      currentTitle: values.currentTitle?.trim() || undefined,
      experienceYears: values.experienceYears,
      skills,
      resumeUrl: values.resumeUrl?.trim() ? values.resumeUrl.trim() : null,
      source: values.source,
      summary: values.summary?.trim() || undefined,
    };

    await onSubmit(payload);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="candidate-modal-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 id="candidate-modal-title" className="text-lg font-bold text-slate-900">
              {isEditing ? "Edit Candidate Profile" : "Add New Candidate"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing
                ? "Update contact details, skills, and background."
                : "Enter candidate specifications to register them in the talent pool."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="mx-6 mt-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          {/* Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-slate-700 mb-1">
                Candidate Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                placeholder="e.g. Priya Sharma"
                {...register("name")}
                className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                  errors.name
                    ? "border-rose-300 focus:ring-rose-500"
                    : "border-slate-200 focus:ring-brand-500"
                }`}
              />
              {errors.name && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="e.g. priya.sharma@example.com"
                {...register("email")}
                className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                  errors.email
                    ? "border-rose-300 focus:ring-rose-500"
                    : "border-slate-200 focus:ring-brand-500"
                }`}
              />
              {errors.email && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Current Title & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="currentTitle" className="block text-xs font-semibold text-slate-700 mb-1">
                Current Title / Role
              </label>
              <input
                id="currentTitle"
                type="text"
                placeholder="e.g. Senior Frontend Engineer"
                {...register("currentTitle")}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-xs font-semibold text-slate-700 mb-1">
                Location
              </label>
              <input
                id="location"
                type="text"
                placeholder="e.g. Bengaluru / Hybrid"
                {...register("location")}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Phone & Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                id="phone"
                type="text"
                placeholder="e.g. +91 98765 43210"
                {...register("phone")}
                className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                  errors.phone
                    ? "border-rose-300 focus:ring-rose-500"
                    : "border-slate-200 focus:ring-brand-500"
                }`}
              />
              {errors.phone && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="experienceYears" className="block text-xs font-semibold text-slate-700 mb-1">
                Experience (Years)
              </label>
              <input
                id="experienceYears"
                type="number"
                min={0}
                max={60}
                {...register("experienceYears")}
                className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                  errors.experienceYears
                    ? "border-rose-300 focus:ring-rose-500"
                    : "border-slate-200 focus:ring-brand-500"
                }`}
              />
              {errors.experienceYears && (
                <p className="text-xs text-rose-600 mt-1 font-medium">
                  {errors.experienceYears.message}
                </p>
              )}
            </div>
          </div>

          {/* Source & Resume URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="source" className="block text-xs font-semibold text-slate-700 mb-1">
                Candidate Source
              </label>
              <select
                id="source"
                {...register("source")}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              >
                <option value="LinkedIn">LinkedIn</option>
                <option value="Referral">Referral</option>
                <option value="CompanyWebsite">Company Website</option>
                <option value="JobBoard">Job Board</option>
                <option value="Agency">Agency</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="resumeUrl" className="block text-xs font-semibold text-slate-700 mb-1">
                Resume URL (HTTPS)
              </label>
              <input
                id="resumeUrl"
                type="url"
                placeholder="https://example.com/resumes/priya.pdf"
                {...register("resumeUrl")}
                className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                  errors.resumeUrl
                    ? "border-rose-300 focus:ring-rose-500"
                    : "border-slate-200 focus:ring-brand-500"
                }`}
              />
              {errors.resumeUrl && (
                <p className="text-xs text-rose-600 mt-1 font-medium">
                  {errors.resumeUrl.message}
                </p>
              )}
            </div>
          </div>

          {/* Skills */}
          <div>
            <label htmlFor="skillsRaw" className="block text-xs font-semibold text-slate-700 mb-1">
              Skills & Tech Stack (comma separated)
            </label>
            <input
              id="skillsRaw"
              type="text"
              placeholder="e.g. React, TypeScript, Node.js, GraphQL, Tailwind CSS"
              {...register("skillsRaw")}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
            />
          </div>

          {/* Profile Summary */}
          <div>
            <label htmlFor="summary" className="block text-xs font-semibold text-slate-700 mb-1">
              Candidate Summary / Recruiter Notes
            </label>
            <textarea
              id="summary"
              rows={3}
              placeholder="Overview of background, key accomplishments, or interview readiness..."
              {...register("summary")}
              className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white transition-all resize-y ${
                errors.summary
                  ? "border-rose-300 focus:ring-rose-500"
                  : "border-slate-200 focus:ring-brand-500"
              }`}
            />
            {errors.summary && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.summary.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              {isSubmitting && (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{isEditing ? "Save Changes" : "Register Candidate"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

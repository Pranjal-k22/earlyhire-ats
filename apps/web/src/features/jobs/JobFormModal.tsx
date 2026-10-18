import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, AlertCircle } from "lucide-react";
import { Job, JobFormData } from "../../types/job";

const jobFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Job title must be at least 2 characters")
      .max(150, "Title cannot exceed 150 characters"),
    department: z.string().trim().min(1, "Department is required"),
    location: z.string().trim().min(1, "Location is required"),
    employmentType: z.enum(["FullTime", "PartTime", "Contract", "Internship"]),
    description: z
      .string()
      .trim()
      .min(10, "Job description must be at least 10 characters")
      .max(10000, "Description cannot exceed 10,000 characters"),
    requirementsRaw: z.string().optional(),
    experienceMin: z.coerce.number().min(0, "Experience cannot be negative"),
    experienceMax: z.coerce.number().min(0, "Experience cannot be negative").optional(),
    status: z.enum(["Open", "Paused", "Closed", "Archived"]),
  })
  .refine(
    (data) => {
      if (data.experienceMax !== undefined && !isNaN(data.experienceMax)) {
        return data.experienceMax >= data.experienceMin;
      }
      return true;
    },
    {
      message: "Max experience must be greater than or equal to min experience",
      path: ["experienceMax"],
    }
  );

type FormValues = z.infer<typeof jobFormSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: JobFormData) => Promise<void>;
  initialData?: Job | null;
  serverError?: string | null;
}

export const JobFormModal: React.FC<Props> = ({
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
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: "",
      department: "Engineering",
      location: "Bengaluru / Hybrid",
      employmentType: "FullTime",
      description: "",
      requirementsRaw: "",
      experienceMin: 0,
      experienceMax: undefined,
      status: "Open",
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        department: initialData.department,
        location: initialData.location,
        employmentType: initialData.employmentType,
        description: initialData.description,
        requirementsRaw: initialData.requirements.join(", "),
        experienceMin: initialData.experienceMin,
        experienceMax: initialData.experienceMax ?? undefined,
        status: initialData.status,
      });
    } else {
      reset({
        title: "",
        department: "Engineering",
        location: "Bengaluru / Hybrid",
        employmentType: "FullTime",
        description: "",
        requirementsRaw: "",
        experienceMin: 0,
        experienceMax: undefined,
        status: "Open",
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
    const requirements = values.requirementsRaw
      ? values.requirementsRaw
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const payload: JobFormData = {
      title: values.title,
      department: values.department,
      location: values.location,
      employmentType: values.employmentType,
      description: values.description,
      requirements,
      experienceMin: values.experienceMin,
      experienceMax:
        values.experienceMax !== undefined && !isNaN(values.experienceMax)
          ? values.experienceMax
          : undefined,
      status: values.status,
    };

    await onSubmit(payload);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-modal-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 id="job-modal-title" className="text-lg font-bold text-slate-900">
              {isEditing ? "Edit Job Opening" : "Create New Job Opening"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing
                ? "Update specifications and status for this opening."
                : "Fill in the details below to publish an open role."}
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
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-xs font-semibold text-slate-700 mb-1">
              Job Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              placeholder="e.g. Senior Frontend Engineer"
              {...register("title")}
              className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                errors.title
                  ? "border-rose-300 focus:ring-rose-500"
                  : "border-slate-200 focus:ring-brand-500"
              }`}
            />
            {errors.title && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.title.message}</p>
            )}
          </div>

          {/* Department & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="department" className="block text-xs font-semibold text-slate-700 mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <input
                id="department"
                type="text"
                placeholder="e.g. Engineering"
                {...register("department")}
                className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                  errors.department
                    ? "border-rose-300 focus:ring-rose-500"
                    : "border-slate-200 focus:ring-brand-500"
                }`}
              />
              {errors.department && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errors.department.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="location" className="block text-xs font-semibold text-slate-700 mb-1">
                Location <span className="text-rose-500">*</span>
              </label>
              <input
                id="location"
                type="text"
                placeholder="e.g. Remote or Bengaluru"
                {...register("location")}
                className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                  errors.location
                    ? "border-rose-300 focus:ring-rose-500"
                    : "border-slate-200 focus:ring-brand-500"
                }`}
              />
              {errors.location && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errors.location.message}</p>
              )}
            </div>
          </div>

          {/* Employment Type & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="employmentType" className="block text-xs font-semibold text-slate-700 mb-1">
                Employment Type
              </label>
              <select
                id="employmentType"
                {...register("employmentType")}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              >
                <option value="FullTime">Full Time</option>
                <option value="PartTime">Part Time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                id="status"
                {...register("status")}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              >
                <option value="Open">Open</option>
                <option value="Paused">Paused</option>
                <option value="Closed">Closed</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Experience Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="experienceMin" className="block text-xs font-semibold text-slate-700 mb-1">
                Min Experience (years)
              </label>
              <input
                id="experienceMin"
                type="number"
                min={0}
                max={50}
                {...register("experienceMin")}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
              {errors.experienceMin && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errors.experienceMin.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="experienceMax" className="block text-xs font-semibold text-slate-700 mb-1">
                Max Experience (years)
              </label>
              <input
                id="experienceMax"
                type="number"
                min={0}
                max={50}
                placeholder="Optional"
                {...register("experienceMax")}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
              {errors.experienceMax && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errors.experienceMax.message}</p>
              )}
            </div>
          </div>

          {/* Requirements / Skills */}
          <div>
            <label htmlFor="requirementsRaw" className="block text-xs font-semibold text-slate-700 mb-1">
              Requirements & Skills (comma separated)
            </label>
            <input
              id="requirementsRaw"
              type="text"
              placeholder="e.g. React, TypeScript, Tailwind CSS, REST APIs"
              {...register("requirementsRaw")}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-xs font-semibold text-slate-700 mb-1">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="Describe the responsibilities, team impact, and role context..."
              {...register("description")}
              className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white transition-all resize-y ${
                errors.description
                  ? "border-rose-300 focus:ring-rose-500"
                  : "border-slate-200 focus:ring-brand-500"
              }`}
            />
            {errors.description && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.description.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? "Save Changes" : "Publish Job"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

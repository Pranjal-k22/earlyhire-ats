import React from "react";
import { X, MapPin, Briefcase, Calendar, Award, Edit, Archive, AlertTriangle, Send } from "lucide-react";
import { Job, JobStatus } from "../../types/job";
import { JobStatusBadge } from "./JobStatusBadge";

interface Props {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (job: Job) => void;
  onArchive: (job: Job) => Promise<void>;
  onStatusChange: (job: Job, newStatus: JobStatus) => Promise<void>;
  isCandidate?: boolean;
  onApply?: (job: Job) => void;
}

export const JobDetailModal: React.FC<Props> = ({
  job,
  isOpen,
  onClose,
  onEdit,
  onArchive,
  onStatusChange,
  isCandidate = false,
  onApply,
}) => {
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

  if (!isOpen || !job) return null;

  const isArchived = job.status === "Archived";

  const ownerName =
    typeof job.ownerId === "object" && job.ownerId !== null ? job.ownerId.name : "Lead Recruiter";

  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-detail-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 cursor-default"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <JobStatusBadge status={job.status} size="md" />
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                {job.department}
              </span>
            </div>
            <h3 id="job-detail-title" className="text-xl font-bold text-slate-900 tracking-tight">
              {job.title}
            </h3>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {job.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                {job.employmentType}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Opened: {formatDate(job.openedAt)}
              </span>
            </div>
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

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <div>
              <p className="text-slate-400 font-medium">Experience Range</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {job.experienceMin}
                {job.experienceMax ? ` – ${job.experienceMax}` : "+"} years
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Recruiter</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{ownerName}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Application Deadline</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {job.closesAt ? formatDate(job.closesAt) : "Rolling / Open"}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Role Description
            </h4>
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-white p-4 rounded-xl border border-slate-100">
              {job.description}
            </div>
          </div>

          {/* Requirements & Skills */}
          {job.requirements && job.requirements.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                Required Skills & Qualifications
              </h4>
              <div className="flex flex-wrap gap-2">
                {job.requirements.map((req, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200 rounded-lg"
                  >
                    <Award className="w-3.5 h-3.5 text-brand-500" />
                    <span>{req}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Archived Alert Notice */}
          {isArchived && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                This job opening is archived. It is retained for historical application records and is excluded from active candidate listings.
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          {isCandidate ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
              >
                Close
              </button>

              {job.status === "Open" ? (
                <button
                  type="button"
                  data-testid="job-apply-modal-button"
                  onClick={() => {
                    onApply?.(job);
                  }}
                  className="px-5 py-2 text-xs font-bold text-white gradient-btn-primary rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Apply Now</span>
                </button>
              ) : (
                <span className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 rounded-xl">
                  Applications Closed
                </span>
              )}
            </>
          ) : (
            <>
              {/* Quick status change toggles */}
              <div className="flex items-center gap-2">
                {!isArchived && (
                  <>
                    {job.status === "Open" ? (
                      <button
                        type="button"
                        onClick={() => onStatusChange(job, "Paused")}
                        className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all"
                      >
                        Pause Role
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onStatusChange(job, "Open")}
                        className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all"
                      >
                        Reopen Role
                      </button>
                    )}

                    {job.status !== "Closed" && (
                      <button
                        type="button"
                        onClick={() => onStatusChange(job, "Closed")}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-all"
                      >
                        Close Role
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {!isArchived && (
                  <button
                    type="button"
                    onClick={() => onArchive(job)}
                    className="px-3.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive Job</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onEdit(job)}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from "react";
import {
  Briefcase,
  Search,
  Plus,
  Filter,
  MapPin,
  Clock,
  Edit,
  Archive,
  RefreshCw,
  Eye,
  AlertCircle,
  FolderOpen,
  Send,
  CheckCircle2,
} from "lucide-react";
import { Job, JobFormData, JobStatus } from "../../types/job";
import { fetchJobs, createJob, updateJob, archiveJob } from "../../api/jobApi";
import { applyForJobApi } from "../../api/applicationApi";
import { JobStatusBadge } from "./JobStatusBadge";
import { JobFormModal } from "./JobFormModal";
import { JobDetailModal } from "./JobDetailModal";

interface JobsViewProps {
  isCandidate?: boolean;
  onApplyJob?: (job: Job) => void;
}

export const JobsView: React.FC<JobsViewProps> = ({
  isCandidate = false,
  onApplyJob,
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formServerError, setFormServerError] = useState<string | null>(null);

  const [selectedJobForDetail, setSelectedJobForDetail] = useState<Job | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Candidate quick apply state
  const [applyingJob, setApplyingJob] = useState<Job | null>(null);
  const [coverLetter, setCoverLetter] = useState<string>("");
  const [isSubmittingApp, setIsSubmittingApp] = useState<boolean>(false);
  const [appFeedback, setAppFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Load jobs from API
  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchJobs({
        search: searchQuery.trim() || undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        includeArchived: selectedStatus === "Archived" || selectedStatus === "all",
        page,
        limit: 12,
      });

      setJobs(response.data);
      setTotalPages(response.pagination.totalPages || 1);
      setTotalCount(response.pagination.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job openings");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedStatus, page]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Modal open handlers
  const handleOpenCreateModal = () => {
    if (isCandidate) return;
    setEditingJob(null);
    setFormServerError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (job: Job) => {
    if (isCandidate) return;
    setEditingJob(job);
    setFormServerError(null);
    setIsDetailModalOpen(false);
    setIsFormModalOpen(true);
  };

  const handleOpenDetailModal = (job: Job) => {
    setSelectedJobForDetail(job);
    setIsDetailModalOpen(true);
  };

  const handleApplyClick = (job: Job) => {
    if (onApplyJob) {
      onApplyJob(job);
      return;
    }
    setApplyingJob(job);
    setCoverLetter("");
    setAppFeedback(null);
  };

  const handleConfirmApply = async () => {
    if (!applyingJob) return;
    setIsSubmittingApp(true);
    setAppFeedback(null);
    try {
      await applyForJobApi({
        jobId: applyingJob.id,
        notes: coverLetter.trim() || undefined,
      });
      setAppFeedback({
        type: "success",
        message: `Application submitted successfully for ${applyingJob.title}!`,
      });
      setTimeout(() => {
        setApplyingJob(null);
        setAppFeedback(null);
      }, 2000);
    } catch (err: unknown) {
      setAppFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to submit application",
      });
    } finally {
      setIsSubmittingApp(false);
    }
  };

  // Submit create or edit
  const handleFormSubmit = async (formData: JobFormData) => {
    setFormServerError(null);
    try {
      if (editingJob) {
        const res = await updateJob(editingJob.id, formData);
        setJobs((prev) => prev.map((j) => (j.id === editingJob.id ? res.data.job : j)));
        if (selectedJobForDetail?.id === editingJob.id) {
          setSelectedJobForDetail(res.data.job);
        }
      } else {
        await createJob(formData);
        await loadJobs();
      }
      setIsFormModalOpen(false);
    } catch (err) {
      setFormServerError(err instanceof Error ? err.message : "Operation failed. Please check your input.");
    }
  };

  // Status toggle
  const handleStatusChange = async (job: Job, newStatus: JobStatus) => {
    try {
      const res = await updateJob(job.id, { status: newStatus });
      setJobs((prev) => prev.map((j) => (j.id === job.id ? res.data.job : j)));
      if (selectedJobForDetail?.id === job.id) {
        setSelectedJobForDetail(res.data.job);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to change job status");
    }
  };

  // Archive job
  const handleArchiveJob = async (job: Job) => {
    if (!window.confirm(`Are you sure you want to archive "${job.title}"? Historical applications will remain intact.`)) {
      return;
    }
    try {
      const res = await archiveJob(job.id);
      if (selectedStatus !== "Archived" && selectedStatus !== "all") {
        setJobs((prev) => prev.filter((j) => j.id !== job.id));
      } else {
        setJobs((prev) => prev.map((j) => (j.id === job.id ? res.data.job : j)));
      }
      setIsDetailModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to archive job");
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Job Openings</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
              {totalCount} Total
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isCandidate
              ? "Browse open roles, review job descriptions, and apply directly."
              : "Create, manage, and monitor job requisitions across all departments."}
          </p>
        </div>

        {!isCandidate && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Job</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by title, department, or location..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 mr-1 shrink-0 hidden sm:block" />
          {(["all", "Open", "Paused", "Closed", "Archived"] as const).map((status) => {
            const isActive = selectedStatus === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setSelectedStatus(status);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all shrink-0 capitalize ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {status}
              </button>
            );
          })}
          {(searchQuery || selectedStatus !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedStatus("all");
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors shrink-0 ml-1"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* API Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-semibold">Unable to load jobs</p>
              <p className="text-xs text-rose-600 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadJobs}
            className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-card animate-pulse space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="h-5 bg-slate-200 rounded w-1/2" />
                <div className="h-5 bg-slate-200 rounded-full w-16" />
              </div>
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="flex gap-2">
                <div className="h-4 bg-slate-100 rounded w-20" />
                <div className="h-4 bg-slate-100 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && jobs.length === 0 && (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-card">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No job openings found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            {searchQuery || selectedStatus !== "all"
              ? "No roles match your current search criteria. Try modifying your filter or clear search terms."
              : "No job postings have been created yet. Publish an open role to begin receiving applicants."}
          </p>
          {searchQuery || selectedStatus !== "all" ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedStatus("all");
                setPage(1);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Clear All Filters</span>
            </button>
          ) : !isCandidate ? (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Job</span>
            </button>
          ) : null}
        </div>
      )}

      {/* Populated Job Cards Grid */}
      {!loading && !error && jobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Top Status & Department */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {job.department}
                  </span>
                  <JobStatusBadge status={job.status} size="sm" />
                </div>

                {/* Job Title */}
                <h3
                  onClick={() => handleOpenDetailModal(job)}
                  className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors cursor-pointer line-clamp-1"
                >
                  {job.title}
                </h3>

                {/* Location & Employment */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{job.location}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>{job.employmentType}</span>
                  </span>
                </div>

                {/* Description Excerpt */}
                <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                  {job.description}
                </p>

                {/* Requirements Chips */}
                {job.requirements && job.requirements.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {job.requirements.slice(0, 3).map((req, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-[11px] bg-slate-50 text-slate-600 border border-slate-100 rounded-md font-medium"
                      >
                        {req}
                      </span>
                    ))}
                    {job.requirements.length > 3 && (
                      <span className="px-1.5 py-0.5 text-[11px] text-slate-400 font-medium">
                        +{job.requirements.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Actions & Meta */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(job.openedAt).toLocaleDateString()}</span>
                </span>

                {isCandidate ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid={`view-jd-btn-${job.id}`}
                      onClick={() => handleOpenDetailModal(job)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                      title="View Job Description"
                      aria-label="View Job Description"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>View JD</span>
                    </button>
                    {job.status === "Open" ? (
                      <button
                        type="button"
                        data-testid={`apply-job-btn-${job.id}`}
                        onClick={() => handleApplyClick(job)}
                        className="px-3.5 py-1.5 text-xs font-bold text-white gradient-btn-primary rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Apply</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400 px-2 py-1 bg-slate-50 rounded-md">
                        Closed
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenDetailModal(job)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                      title="View Details"
                      aria-label="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(job)}
                      className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                      title="Edit Job"
                      aria-label="Edit Job"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {job.status !== "Archived" && (
                      <button
                        type="button"
                        onClick={() => handleArchiveJob(job)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Archive Job"
                        aria-label="Archive Job"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Showing page <span className="font-semibold text-slate-800">{page}</span> of{" "}
            <span className="font-semibold text-slate-800">{totalPages}</span>
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all shadow-subtle"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all shadow-subtle"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Form Modal */}
      <JobFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingJob}
        serverError={formServerError}
      />

      {/* Job Details Slideout Modal */}
      <JobDetailModal
        job={selectedJobForDetail}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={handleOpenEditModal}
        onArchive={handleArchiveJob}
        onStatusChange={handleStatusChange}
        isCandidate={isCandidate}
        onApply={handleApplyClick}
      />

      {/* Candidate Apply Modal */}
      {applyingJob && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="apply-dialog-title"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => !isSubmittingApp && setApplyingJob(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 cursor-default animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
                  {applyingJob.department}
                </span>
                <h3 id="apply-dialog-title" className="text-lg font-bold text-slate-900 mt-1">
                  Apply for {applyingJob.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {applyingJob.location} • {applyingJob.employmentType}
                </p>
              </div>
              <button
                type="button"
                disabled={isSubmittingApp}
                onClick={() => setApplyingJob(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {appFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  appFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {appFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{appFeedback.message}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="apply-cover-letter"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Cover Note / Message to Recruiter (Optional)
              </label>
              <textarea
                id="apply-cover-letter"
                rows={4}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Briefly describe why your skills align with this opening..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmittingApp}
                onClick={() => setApplyingJob(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-apply-btn"
                disabled={isSubmittingApp}
                onClick={handleConfirmApply}
                className="px-5 py-2 text-xs font-bold text-white gradient-btn-primary rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingApp ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Apply</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

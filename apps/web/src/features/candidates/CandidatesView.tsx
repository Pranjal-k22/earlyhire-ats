import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Filter,
  MapPin,
  Mail,
  Award,
  Edit,
  Archive,
  RefreshCw,
  Eye,
  AlertCircle,
  FolderOpen,
  ExternalLink,
} from "lucide-react";
import { Candidate, CandidateFormData, CandidateSource } from "../../types/candidate";
import {
  fetchCandidates,
  createCandidate,
  updateCandidate,
  archiveCandidate,
} from "../../api/candidateApi";
import { CandidateSourceBadge } from "./CandidateSourceBadge";
import { CandidateFormModal } from "./CandidateFormModal";
import { CandidateDetailModal } from "./CandidateDetailModal";

const SOURCE_OPTIONS: Array<CandidateSource | "all"> = [
  "all",
  "LinkedIn",
  "Referral",
  "CompanyWebsite",
  "JobBoard",
  "Agency",
  "Other",
];

export const CandidatesView: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [formServerError, setFormServerError] = useState<string | null>(null);

  const [selectedCandidateForDetail, setSelectedCandidateForDetail] = useState<Candidate | null>(
    null
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Load candidates from API
  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCandidates({
        search: searchQuery.trim() || undefined,
        source: selectedSource !== "all" ? selectedSource : undefined,
        page,
        limit: 12,
      });

      setCandidates(response.data);
      setTotalPages(response.pagination.totalPages || 1);
      setTotalCount(response.pagination.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load candidate profiles");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedSource, page]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  // Modal handlers
  const handleOpenCreateModal = () => {
    setEditingCandidate(null);
    setFormServerError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setFormServerError(null);
    setIsDetailModalOpen(false);
    setIsFormModalOpen(true);
  };

  const handleOpenDetailModal = (candidate: Candidate) => {
    setSelectedCandidateForDetail(candidate);
    setIsDetailModalOpen(true);
  };

  // Submit create or edit
  const handleFormSubmit = async (formData: CandidateFormData) => {
    setFormServerError(null);
    try {
      if (editingCandidate) {
        const res = await updateCandidate(editingCandidate.id, formData);
        setCandidates((prev) =>
          prev.map((c) => (c.id === editingCandidate.id ? res.data.candidate : c))
        );
        if (selectedCandidateForDetail?.id === editingCandidate.id) {
          setSelectedCandidateForDetail(res.data.candidate);
        }
      } else {
        await createCandidate(formData);
        await loadCandidates();
      }
      setIsFormModalOpen(false);
    } catch (err) {
      setFormServerError(
        err instanceof Error ? err.message : "Operation failed. Please verify your inputs."
      );
    }
  };

  // Archive candidate
  const handleArchiveCandidate = async (candidate: Candidate) => {
    const candidateName = candidate.fullName || candidate.name;
    if (
      !window.confirm(
        `Are you sure you want to archive "${candidateName}"? Historical records and applications will be preserved.`
      )
    ) {
      return;
    }
    try {
      await archiveCandidate(candidate.id);
      setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
      setIsDetailModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to archive candidate");
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Candidate Profiles</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
              {totalCount} Total
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Search, evaluate, and manage candidate records in your talent pool.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Candidate</span>
        </button>
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
            placeholder="Search by name, email, or skills..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
        </div>

        {/* Source Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 mr-1 shrink-0 hidden sm:block" />
          {SOURCE_OPTIONS.map((source) => {
            const isActive = selectedSource === source;
            return (
              <button
                key={source}
                type="button"
                onClick={() => {
                  setSelectedSource(source);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all shrink-0 capitalize ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {source === "all" ? "All Sources" : source}
              </button>
            );
          })}
        </div>
      </div>

      {/* API Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-semibold">Unable to load candidate profiles</p>
              <p className="text-xs text-rose-600 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadCandidates}
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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                  <div className="space-y-1.5">
                    <div className="h-4 bg-slate-200 rounded w-28" />
                    <div className="h-3 bg-slate-100 rounded w-36" />
                  </div>
                </div>
                <div className="h-4 bg-slate-200 rounded-full w-14" />
              </div>
              <div className="h-3 bg-slate-100 rounded w-full" />
              <div className="flex gap-2">
                <div className="h-4 bg-slate-100 rounded w-16" />
                <div className="h-4 bg-slate-100 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && candidates.length === 0 && (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-card">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No candidate profiles found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            {searchQuery || selectedSource !== "all"
              ? "No candidate matches your search or source criteria. Try clearing search filters."
              : "No candidates have been registered yet. Add a candidate profile to build your recruitment pipeline."}
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Candidate</span>
          </button>
        </div>
      )}

      {/* Populated Candidate Cards Grid */}
      {!loading && !error && candidates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {candidates.map((cand) => {
            const displayName = cand.fullName || cand.name;
            const initials = displayName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <div
                key={cand.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Avatar & Source */}
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h3
                          onClick={() => handleOpenDetailModal(cand)}
                          className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors cursor-pointer truncate"
                        >
                          {displayName}
                        </h3>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {cand.currentTitle || "Candidate"}
                        </p>
                      </div>
                    </div>

                    <CandidateSourceBadge source={cand.source} size="sm" />
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{cand.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{cand.location || "Remote"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{cand.experienceYears} Years Experience</span>
                    </div>
                  </div>

                  {/* Skills Tags */}
                  {cand.skills && cand.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
                      {cand.skills.slice(0, 3).map((skill, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-[11px] bg-slate-50 text-slate-600 border border-slate-100 rounded-md font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                      {cand.skills.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[11px] text-slate-400 font-medium">
                          +{cand.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Actions & Meta */}
                <div className="pt-3.5 mt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[11px]">
                    {new Date(cand.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1">
                    {cand.resumeUrl && (
                      <a
                        href={cand.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                        title="Open Resume"
                        aria-label="Open Resume"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenDetailModal(cand)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                      title="View Profile"
                      aria-label="View Profile"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(cand)}
                      className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                      title="Edit Profile"
                      aria-label="Edit Profile"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchiveCandidate(cand)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Archive Candidate"
                      aria-label="Archive Candidate"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
      <CandidateFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingCandidate}
        serverError={formServerError}
      />

      {/* Detail Modal */}
      <CandidateDetailModal
        candidate={selectedCandidateForDetail}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={handleOpenEditModal}
        onArchive={handleArchiveCandidate}
      />
    </div>
  );
};

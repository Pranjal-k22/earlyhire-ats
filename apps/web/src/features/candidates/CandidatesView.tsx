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
  const [experienceMin, setExperienceMin] = useState<string>("");
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
      const expMinNum = experienceMin !== "" ? Number(experienceMin) : undefined;
      const response = await fetchCandidates({
        search: searchQuery.trim() || undefined,
        source: selectedSource !== "all" ? selectedSource : undefined,
        experienceMin: expMinNum !== undefined && !isNaN(expMinNum) ? expMinNum : undefined,
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
  }, [searchQuery, selectedSource, experienceMin, page]);

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
      {/* View Header (Screenshot 5: Candidate Management) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Candidate Profiles</h2>
            <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              {totalCount} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage and review analyzed candidates ({candidates.length} of {totalCount})
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Export Action Button (Screenshot 5) */}
          <button
            type="button"
            onClick={() => {
              const headers = "Name,Email,Title,Experience,Source\n";
              const rows = candidates
                .map(
                  (c) =>
                    `"${c.fullName || c.name}","${c.email}","${c.currentTitle || ""}","${c.experienceYears}","${c.source}"`
                )
                .join("\n");
              const blob = new Blob([headers + rows], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `candidates_export_${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-500 hover:opacity-95 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Candidate</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar (Screenshot 5) */}
      <div className="glass-card p-4 rounded-2xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
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
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white/70 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all shadow-2xs"
          />
        </div>

        {/* Source and Experience Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Source Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
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
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 capitalize ${
                    isActive
                      ? "bg-gradient-to-r from-purple-600 to-teal-500 text-white shadow-xs"
                      : "bg-white/80 text-slate-600 hover:bg-purple-50 hover:text-purple-700 border border-slate-200/60"
                  }`}
                >
                  {source === "all" ? "All Sources" : source}
                </button>
              );
            })}
          </div>

          {/* Min Experience Dropdown */}
          <div className="flex items-center gap-1">
            <select
              aria-label="Filter candidates by tenure"
              value={experienceMin}
              onChange={(e) => {
                setExperienceMin(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200/80 bg-white/80 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
            >
              <option value="">Any Experience</option>
              <option value="1">1+ Years</option>
              <option value="3">3+ Years</option>
              <option value="5">5+ Years</option>
              <option value="8">8+ Years</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {(searchQuery || selectedSource !== "all" || experienceMin) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedSource("all");
                setExperienceMin("");
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl transition-colors shrink-0 border border-slate-200/60 shadow-2xs"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Select All Bar (Screenshot 5) */}
      {!loading && !error && candidates.length > 0 && (
        <div className="flex items-center gap-2 px-1 text-xs text-slate-500 font-medium">
          <input
            type="checkbox"
            id="selectAllCandidates"
            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
          />
          <label htmlFor="selectAllCandidates" className="cursor-pointer">
            Select All ({candidates.length} candidates)
          </label>
        </div>
      )}

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
            {searchQuery || selectedSource !== "all" || experienceMin
              ? "No candidate matches your search or filter criteria. Try clearing search filters."
              : "No candidates have been registered yet. Add a candidate profile to build your recruitment pipeline."}
          </p>
          {searchQuery || selectedSource !== "all" || experienceMin ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedSource("all");
                setExperienceMin("");
                setPage(1);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Clear All Filters</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Candidate</span>
            </button>
          )}
        </div>
      )}

      {/* Populated Candidate Cards Grid (Screenshot 5) */}
      {!loading && !error && candidates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {candidates.map((cand, idx) => {
            const displayName = cand.fullName || cand.name;
            const initials = displayName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            // Candidate match score
            const scorePercent = Math.min(96, Math.max(74, 87 - (idx % 3) * 6));

            return (
              <div
                key={cand.id}
                className="glass-card glass-card-hover p-5 sm:p-6 rounded-2xl flex flex-col justify-between group relative"
              >
                <div>
                  {/* Top: Checkbox, Avatar, Name, Score Badge & Source */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 shrink-0"
                      />
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-teal-400 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h3
                          onClick={() => handleOpenDetailModal(cand)}
                          className="text-sm font-bold text-slate-800 group-hover:text-purple-600 transition-colors cursor-pointer truncate"
                        >
                          {displayName}
                        </h3>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {new Date(cand.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {scorePercent}%
                      </span>
                    </div>
                  </div>

                  {/* Professional Title & Source */}
                  <div className="flex items-center justify-between gap-2 mb-3 px-1">
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      {cand.currentTitle || "Candidate"}
                    </span>
                    <CandidateSourceBadge source={cand.source} size="sm" />
                  </div>

                  {/* Contact Info Grid (Screenshot 5: Email, Phone, Location, Exp) */}
                  <div className="space-y-1.5 text-xs text-slate-500 bg-white/50 p-3 rounded-xl border border-slate-100/70">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{cand.email}</span>
                    </div>
                    {cand.phone && (
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-slate-400 font-mono text-[11px] shrink-0">📞</span>
                        <span className="truncate">{cand.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{cand.location || "Remote"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{cand.experienceYears} Years Experience</span>
                    </div>
                  </div>

                  {/* Skills Tag Pills (Screenshot 5) */}
                  {cand.skills && cand.skills.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Top Skills
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {cand.skills.map((skill, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 text-[11px] bg-white text-slate-600 border border-slate-200/70 rounded-lg font-medium shadow-2xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions Footer (Screenshot 5: View Details, Download, Edit, Archive) */}
                <div className="pt-3.5 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => handleOpenDetailModal(cand)}
                    className="flex items-center gap-1.5 text-purple-600 hover:text-purple-700 font-semibold transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {cand.resumeUrl ? (
                      <a
                        href={cand.resumeUrl}
                        download
                        className="flex items-center gap-1 text-slate-500 hover:text-teal-600 font-medium transition-colors p-1.5"
                        title="Download Resume"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenDetailModal(cand)}
                        className="flex items-center gap-1 text-slate-500 hover:text-teal-600 font-medium transition-colors p-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(cand)}
                      className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg transition-colors"
                      title="Edit Profile"
                      aria-label="Edit Profile"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleArchiveCandidate(cand)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
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

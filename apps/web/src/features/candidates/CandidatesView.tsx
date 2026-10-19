import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Filter,
  MapPin,
  Mail,
  Edit,
  Archive,
  RefreshCw,
  Eye,
  AlertCircle,
  FolderOpen,
  ExternalLink,
  UserPlus,
  Sparkles,
  Calendar,
  MessageSquare,
  ThumbsUp,
  Clock,
  Copy,
  ArrowUpRight,
  Info,
  FileText,
} from "lucide-react";
import { NotificationsDropdown } from "../notifications/NotificationsDropdown";
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

  // Active selected candidate for Sence.Point split view
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);

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
      if (response.data.length > 0) {
        setActiveCandidateId((prev) =>
          response.data.some((c) => c.id === prev) ? prev : response.data[0].id
        );
      }
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

  const activeCandidate =
    candidates.find((c) => c.id === activeCandidateId) || candidates[0] || null;

  return (
    <div className="space-y-6">
      {/* Top Header Bar (Sence.Point Style) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-1">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, or skills..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
          />
        </div>

        {/* Right Controls: Bell, User Icon, Date, Add Candidate */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <NotificationsDropdown />

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="p-2.5 bg-white border border-slate-200/90 rounded-xl text-slate-600 hover:text-slate-900 shadow-2xs hover:bg-slate-50 transition-colors"
            aria-label="Quick add"
          >
            <UserPlus className="w-4 h-4" />
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>October 23, 2024</span>
          </div>

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
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
          >
            <FolderOpen className="w-4 h-4 text-purple-600" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Candidate</span>
          </button>
        </div>
      </div>

      {/* Page Title & Total Count Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Candidate Profiles</h2>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              {totalCount} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage and review analyzed candidates ({candidates.length} of {totalCount})
          </p>
        </div>
      </div>

      {/* AI Intelligence Report Banner (Image 2 Sence.Point Style) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#6941C6] via-[#7F56D9] to-[#D946EF] p-6 sm:p-8 text-white shadow-md">
        <div className="relative z-10 max-w-xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>October Report</span>
          </div>
          <p className="text-xs sm:text-sm text-purple-100 leading-relaxed font-medium">
            With the aid of our AI analysis, you can receive a thoroughly informed and comprehensive evaluation of your data.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-white hover:bg-purple-50 text-purple-900 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Try AI</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const searchEl = document.querySelector<HTMLInputElement>('input[placeholder*="Search by name"]');
                searchEl?.focus();
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
            >
              <span>Learn More</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Decorative Translucent Layered 3D Ribbons (Image 2 Right) */}
        <div className="absolute right-0 top-0 bottom-0 w-80 pointer-events-none hidden md:block overflow-hidden opacity-90">
          <div className="absolute -right-8 -top-12 w-64 h-64 rounded-3xl bg-white/10 rotate-45 transform backdrop-blur-xs" />
          <div className="absolute right-12 top-2 w-48 h-48 rounded-3xl bg-pink-400/20 rotate-12 transform backdrop-blur-xs" />
          <div className="absolute right-28 top-8 w-40 h-40 rounded-3xl bg-purple-400/20 -rotate-12 transform backdrop-blur-xs" />
        </div>
      </div>

      {/* Filter Toolbar (Source & Experience) */}
      <div className="bg-white/70 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 capitalize cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-purple-50 hover:text-purple-700 border border-slate-200/60"
                }`}
              >
                {source === "all" ? "All Sources" : source}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Filter candidates by tenure"
            value={experienceMin}
            onChange={(e) => {
              setExperienceMin(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200/80 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
          >
            <option value="">Any Experience</option>
            <option value="1">1+ Years</option>
            <option value="3">3+ Years</option>
            <option value="5">5+ Years</option>
            <option value="8">8+ Years</option>
          </select>

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                  <div className="space-y-1 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-28" />
                    <div className="h-3 bg-slate-100 rounded w-36" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 animate-pulse h-96" />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && candidates.length === 0 && (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 shadow-card">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Clear All Filters</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Candidate</span>
            </button>
          )}
        </div>
      )}

      {/* Populated Sence.Point Split-Screen Layout (Image 2) */}
      {!loading && !error && candidates.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Candidate List (Image 2 Left) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium pb-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="selectAllCandidates"
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="selectAllCandidates" className="cursor-pointer">
                  Select All ({candidates.length} candidates)
                </label>
              </div>
            </div>

            <div className="space-y-3">
              {candidates.map((cand, idx) => {
                const displayName = cand.fullName || cand.name;
                const initials = displayName
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                const isSelected = cand.id === (activeCandidate?.id || candidates[0]?.id);

                // Illustrative pipeline stages matching Sence.Point reference
                const stages = ["Screening", "Pair-Programming", "Technical", "Offer", "Screening"];
                const candidateStage = stages[idx % stages.length];
                const stageSubtext = [
                  "• Needs Follow-up",
                  "• Awaiting",
                  "• Scheduled",
                  "• Passed",
                  "• In Progress",
                ][idx % 5];

                return (
                  <div
                    key={cand.id}
                    onClick={() => setActiveCandidateId(cand.id)}
                    className={`p-4 rounded-2xl transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-white shadow-lg border-2 border-purple-500 scale-[1.01]"
                        : "bg-white/80 hover:bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs"
                    }`}
                  >
                    {/* Top Row: Avatar, Name & Stage Badge */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-teal-400 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h3
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCandidateId(cand.id);
                              handleOpenDetailModal(cand);
                            }}
                            className="text-sm font-bold text-slate-900 hover:text-purple-600 transition-colors cursor-pointer truncate"
                          >
                            {displayName}
                          </h3>
                          <p className="text-[11px] text-slate-500 truncate">{stageSubtext}</p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 ${
                          candidateStage === "Offer"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : candidateStage === "Technical"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : candidateStage === "Pair-Programming"
                            ? "bg-teal-50 text-teal-700 border border-teal-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {candidateStage}
                      </span>
                    </div>

                    {/* Candidate Details (Matches Test Assertions) */}
                    <div className="flex items-center justify-between gap-2 pt-1 px-0.5">
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        {cand.currentTitle || "Lead Full Stack Engineer"}
                      </span>
                      <CandidateSourceBadge source={cand.source} size="sm" />
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-500 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 mt-2">
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{cand.email}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{cand.location || "Bengaluru"}</span>
                        </span>
                        <span className="font-semibold text-slate-700 shrink-0">
                          {cand.experienceYears} Years Experience
                        </span>
                      </div>
                    </div>

                    {/* Skills Tags */}
                    {cand.skills && cand.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {cand.skills.map((skill, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-[10px] bg-white text-slate-600 border border-slate-200/80 rounded-md font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Card Actions Footer */}
                    <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetailModal(cand);
                        }}
                        className="flex items-center gap-1 text-purple-600 hover:text-purple-700 font-bold transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(cand)}
                          className="flex items-center gap-1 text-slate-500 hover:text-teal-600 font-medium transition-colors p-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Download</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchiveCandidate(cand)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                          title="Archive Candidate"
                          aria-label="Archive Candidate"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Candidate Detail & Activity Timeline (Image 2 Right) */}
          {activeCandidate && (
            <div className="lg:col-span-7 xl:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
              {/* Header: Candidate Info & Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                    {(activeCandidate.fullName || activeCandidate.name)
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        Candidate: {activeCandidate.fullName || activeCandidate.name}{" "}
                        <span className="text-purple-600 font-semibold text-sm">
                          + {activeCandidate.currentTitle || "FrontEnd Developer"}
                        </span>
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeCandidate.email} • {activeCandidate.location || "Remote"} • {activeCandidate.experienceYears} Years Exp
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenDetailModal(activeCandidate)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200/80"
                    title="Candidate Information"
                    aria-label="Candidate Information"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 3 Round Evaluation Cards (Image 2 Sence.Point Style) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Round 1 */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-white to-emerald-50/40 border border-emerald-100 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>4.2 • Hire</span>
                  </div>
                  <div className="text-xs text-slate-600 font-semibold pt-1">
                    1 Screening Round
                  </div>
                </div>

                {/* Round 2 */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-white to-amber-50/40 border border-amber-100 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>3.89 • Hire</span>
                  </div>
                  <div className="text-xs text-slate-600 font-semibold pt-1">
                    2 Technical Round
                  </div>
                </div>

                {/* Round 3 */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-white to-cyan-50/40 border border-cyan-100 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>0.00 • Waiting</span>
                  </div>
                  <div className="text-xs text-slate-600 font-semibold pt-1">
                    3 Pair-Programming
                  </div>
                </div>
              </div>

              {/* Activity & Timeline Feed (Image 2 Sence.Point Style) */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Candidate Activity & Hiring Journey
                </h4>

                <div className="space-y-3">
                  {/* Event 1: Executive Interview Confirmed */}
                  <div className="flex items-start justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-100 gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Executive interview date (31.12.22) confirmed by Darrell Steward
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Added at 12.01.23 • 14:28</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <button type="button" className="p-1 hover:text-slate-600" aria-label="Edit event">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" className="p-1 hover:text-slate-600" aria-label="Copy event">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Event 2: Resume Document Uploaded */}
                  <div className="flex items-start justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-100 gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {activeCandidate.fullName || activeCandidate.name} upload cv.murrey.pdf
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Added at 12.01.23 • 14:28</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenDetailModal(activeCandidate)}
                      className="text-xs font-bold text-purple-600 hover:text-purple-800 px-2 py-1"
                    >
                      View Resume
                    </button>
                  </div>

                  {/* Event 3: Joy Division Team Comment */}
                  <div className="flex items-start justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-100 gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Joy Division wrote comment:</p>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-white p-3 rounded-xl border border-slate-200/60">
                          Let's provide the team with the highest quality participants tailored for their research needs.
                          Recruit, book & pay quality research participants in a fraction of the time of agencies.
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">Added at 12.01.23 • 14:28</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDetailModal(activeCandidate)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      + Add Team Note
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDetailModal(activeCandidate)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      View ATS Scorecard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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

import React, { useEffect, useState, useMemo } from "react";
import {
  Layers,
  Plus,
  RefreshCw,
  Filter,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  Sparkles,
  ArrowLeft,
  LayoutGrid,
  List,
  MapPin,
  Briefcase,
  Award,
  FileCheck,
  Video,
  Clock,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { Application, HiringStage } from "../../types/application";
import { Job } from "../../types/job";
import { fetchApplications, transitionApplicationStage } from "../../api/applicationApi";
import { fetchJobs } from "../../api/jobApi";
import { ApplicationCard } from "./ApplicationCard";
import { ApplicationCreateModal } from "./ApplicationCreateModal";
import { RejectModal } from "./RejectModal";
import { ApplicationHistoryModal } from "./ApplicationHistoryModal";
import { StageReviewDrawer } from "./StageReviewDrawer";
import { ScheduleInterviewModal } from "./ScheduleInterviewModal";
import { InterviewFeedbackModal } from "./InterviewFeedbackModal";
import { AtsReportDrawer } from "./AtsReportDrawer";
import { CandidateComparisonModal } from "./CandidateComparisonModal";
import { OfferModal } from "./OfferModal";
import { StageBadge } from "./StageBadge";

export type PipelineTab = "active" | "completed" | "all";

const ACTIVE_STAGES: HiringStage[] = ["Applied", "Screening", "Interview", "Offer"];
const COMPLETED_STAGES: HiringStage[] = ["Hired", "Rejected"];

export interface PipelineViewProps {
  initialTab?: PipelineTab;
  initialJobId?: string;
  onClearJob?: () => void;
}

const STAGE_COLUMNS: { stage: HiringStage; label: string; dot: string; bg: string }[] = [
  { stage: "Applied", label: "Applied", dot: "bg-slate-400", bg: "border-t-slate-400" },
  { stage: "Screening", label: "Screening", dot: "bg-sky-500", bg: "border-t-sky-500" },
  { stage: "Interview", label: "Interview", dot: "bg-purple-500", bg: "border-t-purple-500" },
  { stage: "Offer", label: "Offer", dot: "bg-amber-500", bg: "border-t-amber-500" },
  { stage: "Hired", label: "Hired", dot: "bg-emerald-500", bg: "border-t-emerald-500" },
  { stage: "Rejected", label: "Rejected", dot: "bg-rose-500", bg: "border-t-rose-500" },
];

export const PipelineView: React.FC<PipelineViewProps> = ({
  initialTab = "active",
  initialJobId,
  onClearJob,
}) => {
  const urlJobId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("jobId") || ""
      : "";
  const [pipelineTab, setPipelineTab] = useState<PipelineTab>(initialTab);
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId || urlJobId || "all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [rejectTarget, setRejectTarget] = useState<Application | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Application | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Application | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<Application | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<Application | null>(null);
  const [atsReportTarget, setAtsReportTarget] = useState<Application | null>(null);
  const [comparisonTarget, setComparisonTarget] = useState<Application | null>(null);
  const [offerTarget, setOfferTarget] = useState<Application | null>(null);

  useEffect(() => {
    if (initialJobId) {
      setSelectedJobId(initialJobId);
    }
  }, [initialJobId]);

  const selectedJob = useMemo(() => {
    if (selectedJobId === "all") return null;
    return jobs.find((j) => j.id === selectedJobId) || null;
  }, [jobs, selectedJobId]);

  const loadData = React.useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [appsRes, jobsRes] = await Promise.all([
        fetchApplications({
          limit: 100,
          jobId: selectedJobId !== "all" ? selectedJobId : undefined,
        }),
        fetchJobs({ limit: 100 }),
      ]);

      const appsList = Array.isArray(appsRes.data?.applications) ? appsRes.data.applications : [];
      const jobsList = Array.isArray(jobsRes.data) ? jobsRes.data : [];

      setApplications(appsList);
      setJobs(jobsList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load pipeline applications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedJobId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter applications by search query
  const filteredApplications = useMemo(() => {
    if (!searchQuery.trim()) return applications;
    const q = searchQuery.toLowerCase().trim();
    return applications.filter((app) => {
      const candName = (app.candidateId?.fullName || app.candidateId?.name || "").toLowerCase();
      const candEmail = (app.candidateId?.email || "").toLowerCase();
      const jobTitle = (app.jobId?.title || "").toLowerCase();
      return candName.includes(q) || candEmail.includes(q) || jobTitle.includes(q);
    });
  }, [applications, searchQuery]);

  // Group applications by stage
  const stageMap = useMemo(() => {
    const map: Record<HiringStage, Application[]> = {
      Applied: [],
      Screening: [],
      Interview: [],
      Offer: [],
      Hired: [],
      Rejected: [],
    };

    filteredApplications.forEach((app) => {
      const stage = (app.currentStage || app.stage || "Applied") as HiringStage;
      if (map[stage]) {
        map[stage].push(app);
      }
    });

    return map;
  }, [filteredApplications]);

  // Stage tab metrics & column subsets
  const activeCount = useMemo(() => {
    return (
      (stageMap.Applied?.length || 0) +
      (stageMap.Screening?.length || 0) +
      (stageMap.Interview?.length || 0) +
      (stageMap.Offer?.length || 0)
    );
  }, [stageMap]);

  const completedCount = useMemo(() => {
    return (stageMap.Hired?.length || 0) + (stageMap.Rejected?.length || 0);
  }, [stageMap]);

  const displayedColumns = useMemo(() => {
    if (pipelineTab === "active") {
      return STAGE_COLUMNS.filter((col) => ACTIVE_STAGES.includes(col.stage));
    }
    if (pipelineTab === "completed") {
      return STAGE_COLUMNS.filter((col) => COMPLETED_STAGES.includes(col.stage));
    }
    return STAGE_COLUMNS;
  }, [pipelineTab]);

  const containerMinWidth = useMemo(() => {
    if (pipelineTab === "completed") return "min-w-full sm:min-w-[620px]";
    if (pipelineTab === "active") return "min-w-[1020px]";
    return "min-w-[1520px]";
  }, [pipelineTab]);

  // Handlers
  const handleAdvance = async (app: Application, nextStage: HiringStage) => {
    try {
      setFeedback(null);
      await transitionApplicationStage(app.id, {
        toStage: nextStage,
        expectedStage: app.currentStage || app.stage,
        expectedVersion: app.version,
      });

      setFeedback({
        type: "success",
        message: `Advanced ${app.candidateId?.fullName || app.candidateId?.name || "Candidate"} to ${nextStage}`,
      });
      await loadData(true);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : `Failed to transition application to ${nextStage}`,
      });
    }
  };

  const handleRejectConfirm = async (reason?: string) => {
    if (!rejectTarget) return;
    await transitionApplicationStage(rejectTarget.id, {
      toStage: "Rejected",
      expectedStage: rejectTarget.currentStage || rejectTarget.stage,
      expectedVersion: rejectTarget.version,
      reason,
    });

    setFeedback({
      type: "success",
      message: `Marked application as Rejected`,
    });
    setRejectTarget(null);
    await loadData(true);
  };

  return (
    <div className="space-y-6">
      {/* Dedicated Job Pipeline Banner */}
      {selectedJob && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-950 text-white rounded-2xl p-5 shadow-sm border border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedJobId("all");
                    if (onClearJob) onClearJob();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>All Pipelines</span>
                </button>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  Dedicated Job Pipeline
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    selectedJob.status === "Open"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-slate-700 text-slate-300 border-slate-600"
                  }`}
                >
                  {selectedJob.status}
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                {selectedJob.title}
              </h2>
              <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap pt-0.5">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  {selectedJob.department}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {selectedJob.location} ({selectedJob.employmentType})
                </span>
                <span>
                  Experience:{" "}
                  <strong className="text-white">
                    {selectedJob.experienceMin || 0}-
                    {selectedJob.experienceMax ? `${selectedJob.experienceMax} yrs` : "+ yrs"}
                  </strong>
                </span>
                <span>
                  Assigned Recruiter:{" "}
                  <strong className="text-white">
                    {typeof selectedJob.ownerId === "object" && selectedJob.ownerId
                      ? selectedJob.ownerId.name || selectedJob.ownerId.email
                      : "Assigned"}
                  </strong>
                </span>
              </div>
            </div>

            {/* Pipeline Stage Counts Strip */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-white/10 backdrop-blur-xs border border-white/10 rounded-xl px-3 py-2 text-center min-w-[70px]">
                <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Total</div>
                <div className="text-lg font-bold text-white">{filteredApplications.length}</div>
              </div>
              <div className="bg-sky-500/15 border border-sky-400/20 rounded-xl px-3 py-2 text-center min-w-[70px]">
                <div className="text-[10px] text-sky-200 uppercase tracking-wider font-semibold">Screening</div>
                <div className="text-lg font-bold text-sky-300">{stageMap.Screening?.length || 0}</div>
              </div>
              <div className="bg-purple-500/15 border border-purple-400/20 rounded-xl px-3 py-2 text-center min-w-[70px]">
                <div className="text-[10px] text-purple-200 uppercase tracking-wider font-semibold">Interview</div>
                <div className="text-lg font-bold text-purple-300">{stageMap.Interview?.length || 0}</div>
              </div>
              <div className="bg-amber-500/15 border border-amber-400/20 rounded-xl px-3 py-2 text-center min-w-[70px]">
                <div className="text-[10px] text-amber-200 uppercase tracking-wider font-semibold">Offer</div>
                <div className="text-lg font-bold text-amber-300">{stageMap.Offer?.length || 0}</div>
              </div>
              <div className="bg-emerald-500/15 border border-emerald-400/20 rounded-xl px-3 py-2 text-center min-w-[70px]">
                <div className="text-[10px] text-emerald-200 uppercase tracking-wider font-semibold">Hired</div>
                <div className="text-lg font-bold text-emerald-300">{stageMap.Hired?.length || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Hiring Pipeline</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track candidates across all 6 hiring stages with validated transitions and audit history.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Job Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              aria-label="Filter pipeline by job opening"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Job Openings ({jobs.length})</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>

          {/* Search Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200/80 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 text-slate-800 transition-all w-40 md:w-52"
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200/80 transition-colors"
            title="Refresh pipeline"
            aria-label="Refresh pipeline"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-brand-600" : ""}`} />
          </button>

          {/* Create Application Button */}
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Application</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-150 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 font-medium ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error State Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-sm text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadData()}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Pipeline Stage Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div
          className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl"
          role="tablist"
          aria-label="Pipeline stage views"
        >
          <button
            type="button"
            role="tab"
            aria-selected={pipelineTab === "active"}
            onClick={() => setPipelineTab("active")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              pipelineTab === "active"
                ? "bg-white text-brand-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Active Pipeline</span>
            <span
              className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                pipelineTab === "active"
                  ? "bg-brand-50 text-brand-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={pipelineTab === "completed"}
            onClick={() => setPipelineTab("completed")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              pipelineTab === "completed"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Hired & Rejected</span>
            <span
              className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                pipelineTab === "completed"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {completedCount}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={pipelineTab === "all"}
            onClick={() => setPipelineTab("all")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              pipelineTab === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>All Stages (6)</span>
            <span
              className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                pipelineTab === "all"
                  ? "bg-slate-100 text-slate-800"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {filteredApplications.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-1 text-xs text-slate-500">
            {pipelineTab === "active" && (
              <span>
                In-progress: <strong>Applied</strong>, <strong>Screening</strong>,{" "}
                <strong>Interview</strong>, <strong>Offer</strong>
              </span>
            )}
            {pipelineTab === "completed" && (
              <span>
                Outcomes: <strong>Hired ({stageMap.Hired?.length || 0})</strong>,{" "}
                <strong>Rejected ({stageMap.Rejected?.length || 0})</strong>
              </span>
            )}
            {pipelineTab === "all" && (
              <span>Complete end-to-end recruitment board (all 6 stages)</span>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Table List View"
            >
              <List className="w-3.5 h-3.5" />
              <span>Table List</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Candidate</th>
                  <th className="py-3.5 px-4">Job Opening</th>
                  <th className="py-3.5 px-4">Applied Date</th>
                  <th className="py-3.5 px-4">Stage</th>
                  <th className="py-3.5 px-4">ATS Screening</th>
                  <th className="py-3.5 px-4 text-center">Lifecycle Actions</th>
                  <th className="py-3.5 px-4 text-right">Stage Advance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="font-medium text-sm">No applications found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try adjusting your search query or pipeline filter
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => {
                    const candidateName =
                      app.candidateId?.fullName || app.candidateId?.name || "Candidate";
                    const candidateEmail = app.candidateId?.email || "";
                    const currentStage = (app.currentStage || app.stage || "Applied") as HiringStage;
                    const nextConfig = (
                      {
                        Applied: { next: "Screening" as HiringStage, label: "Screening" },
                        Screening: { next: "Interview" as HiringStage, label: "Interview" },
                        Interview: { next: "Offer" as HiringStage, label: "Offer" },
                        Offer: { next: "Hired" as HiringStage, label: "Hire" },
                      } as Record<string, { next: HiringStage; label: string } | undefined>
                    )[currentStage];
                    const isTerminal = currentStage === "Hired" || currentStage === "Rejected";

                    return (
                      <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 text-sm">{candidateName}</div>
                          <div className="text-slate-500 text-[11px]">{candidateEmail}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">
                            {app.jobId?.title || "Unknown Job"}
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            {app.jobId?.department || "General"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {app.appliedAt
                            ? new Date(app.appliedAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Recently"}
                        </td>
                        <td className="py-3 px-4">
                          <StageBadge stage={currentStage} size="sm" />
                        </td>
                        <td className="py-3 px-4">
                          {app.atsSnapshot ? (
                            <button
                              type="button"
                              onClick={() => setAtsReportTarget(app)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                              title="View full ATS scorecard & skills match"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                              <span>{app.atsSnapshot.overallScore}/100</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Pending</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setComparisonTarget(app)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Candidate Decision Comparison"
                            >
                              <Award className="w-4 h-4" />
                            </button>

                            {(currentStage === "Interview" || currentStage === "Screening") && (
                              <button
                                type="button"
                                onClick={() => setScheduleTarget(app)}
                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                title="Schedule Google Meet"
                              >
                                <Video className="w-4 h-4" />
                              </button>
                            )}

                            {(currentStage === "Interview" || currentStage === "Screening") && (
                              <button
                                type="button"
                                onClick={() => setFeedbackTarget(app)}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                title="Submit Interviewer Scorecard"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            )}

                            {(currentStage === "Interview" || currentStage === "Offer") && (
                              <button
                                type="button"
                                onClick={() => setOfferTarget(app)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Offer Management"
                              >
                                <FileCheck className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setHistoryTarget(app)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="View Stage Audit History"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isTerminal && (
                              <button
                                type="button"
                                onClick={() => setRejectTarget(app)}
                                className="text-xs text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            )}

                            {nextConfig ? (
                              <button
                                type="button"
                                onClick={() => handleAdvance(app, nextConfig.next)}
                                className="inline-flex items-center gap-1 text-xs text-white bg-brand-600 hover:bg-brand-700 px-3 py-1 rounded-lg font-medium transition-colors shadow-2xs cursor-pointer"
                              >
                                <span>To {nextConfig.label}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400">
                                {currentStage === "Hired" ? "Hired" : "Closed"}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban Pipeline Columns */
        <div className="overflow-x-auto pb-6 scrollbar-thin">
          <div className={`flex gap-4 ${containerMinWidth} items-start`}>
            {displayedColumns.map((col) => {
              const stageApps = stageMap[col.stage] || [];
              return (
                <div
                  key={col.stage}
                  data-testid={`stage-column-${col.stage.toLowerCase()}`}
                  className={`w-[245px] shrink-0 bg-slate-100/70 rounded-2xl p-3 border border-slate-200/60 border-t-4 ${col.bg} flex flex-col min-h-[560px]`}
                >
                  {/* Stage Header */}
                  <div className="flex items-center justify-between pb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        {col.label}
                      </h2>
                    </div>
                    <span className="bg-white text-slate-700 font-bold text-xs px-2 py-0.5 rounded-full border border-slate-200/80 shadow-2xs">
                      {stageApps.length}
                    </span>
                  </div>

                  {/* Cards Container */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {loading ? (
                      <div className="space-y-3 pt-2">
                        <div className="bg-white/80 rounded-xl p-4 border border-slate-200/60 h-28 animate-pulse" />
                        <div className="bg-white/80 rounded-xl p-4 border border-slate-200/60 h-28 animate-pulse" />
                      </div>
                    ) : stageApps.length === 0 ? (
                      <div className="h-40 rounded-xl border border-dashed border-slate-300/80 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                        <Users className="w-5 h-5 mb-1.5 opacity-40" />
                        <p className="text-xs font-medium">No applications</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {col.stage === "Applied"
                            ? "Add new candidates here"
                            : `Move here from previous`}
                        </p>
                      </div>
                    ) : (
                      stageApps.map((app) => (
                        <ApplicationCard
                          key={app.id}
                          application={app}
                          onAdvance={handleAdvance}
                          onReject={(target) => setRejectTarget(target)}
                          onViewHistory={(target) => setHistoryTarget(target)}
                          onOpenReview={(target) => setReviewTarget(target)}
                          onSchedule={(target) => setScheduleTarget(target)}
                          onFeedback={(target) => setFeedbackTarget(target)}
                          onOpenAtsReport={(target) => setAtsReportTarget(target)}
                          onCompare={(target) => setComparisonTarget(target)}
                          onOffer={(target) => setOfferTarget(target)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <ApplicationCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          setFeedback({
            type: "success",
            message: "Application created successfully and added to Applied stage",
          });
          loadData(true);
        }}
        initialJobId={selectedJobId !== "all" ? selectedJobId : undefined}
      />

      <RejectModal
        isOpen={Boolean(rejectTarget)}
        application={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
      />

      <ApplicationHistoryModal
        isOpen={Boolean(historyTarget)}
        application={historyTarget}
        onClose={() => setHistoryTarget(null)}
      />

      <StageReviewDrawer
        isOpen={Boolean(reviewTarget)}
        application={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onScheduleInterview={(app) => {
          setReviewTarget(null);
          setScheduleTarget(app);
        }}
        onSubmitFeedback={(app) => {
          setReviewTarget(null);
          setFeedbackTarget(app);
        }}
        onRefreshApplication={() => loadData(true)}
      />

      <ScheduleInterviewModal
        isOpen={Boolean(scheduleTarget)}
        application={scheduleTarget}
        onClose={() => setScheduleTarget(null)}
        onSuccess={() => {
          setFeedback({
            type: "success",
            message: "Interview scheduled successfully with Google Meet link",
          });
          loadData(true);
        }}
      />

      <InterviewFeedbackModal
        isOpen={Boolean(feedbackTarget)}
        application={feedbackTarget}
        onClose={() => setFeedbackTarget(null)}
        onSuccess={() => {
          setFeedback({
            type: "success",
            message: "Interview feedback updated successfully",
          });
          loadData(true);
        }}
      />

      <AtsReportDrawer
        isOpen={Boolean(atsReportTarget)}
        application={atsReportTarget}
        onClose={() => setAtsReportTarget(null)}
      />

      <CandidateComparisonModal
        isOpen={Boolean(comparisonTarget)}
        applicationId={comparisonTarget?.id || null}
        onClose={() => setComparisonTarget(null)}
        onOpenOffer={(appId) => {
          setComparisonTarget(null);
          const app = applications.find((a) => a.id === appId);
          if (app) setOfferTarget(app);
        }}
      />

      <OfferModal
        isOpen={Boolean(offerTarget)}
        applicationId={offerTarget?.id || null}
        candidateName={
          offerTarget?.candidateId?.fullName ||
          offerTarget?.candidateId?.name ||
          "Candidate"
        }
        jobTitle={offerTarget?.jobId?.title || "Job Opening"}
        onClose={() => setOfferTarget(null)}
        onOfferUpdated={() => {
          setFeedback({
            type: "success",
            message: "Offer updated successfully",
          });
          loadData(true);
        }}
      />
    </div>
  );
};

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
} from "lucide-react";
import { Application, HiringStage } from "../../types/application";
import { Job } from "../../types/job";
import { fetchApplications, transitionApplicationStage } from "../../api/applicationApi";
import { fetchJobs } from "../../api/jobApi";
import { ApplicationCard } from "./ApplicationCard";
import { ApplicationCreateModal } from "./ApplicationCreateModal";
import { RejectModal } from "./RejectModal";
import { ApplicationHistoryModal } from "./ApplicationHistoryModal";

const STAGE_COLUMNS: { stage: HiringStage; label: string; dot: string; bg: string }[] = [
  { stage: "Applied", label: "Applied", dot: "bg-slate-400", bg: "border-t-slate-400" },
  { stage: "Screening", label: "Screening", dot: "bg-sky-500", bg: "border-t-sky-500" },
  { stage: "Interview", label: "Interview", dot: "bg-purple-500", bg: "border-t-purple-500" },
  { stage: "Offer", label: "Offer", dot: "bg-amber-500", bg: "border-t-amber-500" },
  { stage: "Hired", label: "Hired", dot: "bg-emerald-500", bg: "border-t-emerald-500" },
  { stage: "Rejected", label: "Rejected", dot: "bg-rose-500", bg: "border-t-rose-500" },
];

export const PipelineView: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

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

      {/* Kanban Pipeline Columns */}
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 min-w-[1200px]">
          {STAGE_COLUMNS.map((col) => {
            const stageApps = stageMap[col.stage] || [];
            return (
              <div
                key={col.stage}
                data-testid={`stage-column-${col.stage.toLowerCase()}`}
                className={`bg-slate-100/70 rounded-2xl p-3 border border-slate-200/60 border-t-4 ${col.bg} flex flex-col min-h-[540px]`}
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
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
    </div>
  );
};

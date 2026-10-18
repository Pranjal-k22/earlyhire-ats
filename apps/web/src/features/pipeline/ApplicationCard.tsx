import React, { useState } from "react";
import {
  Briefcase,
  Calendar,
  Clock,
  ArrowRight,
  XCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  Video,
  MessageSquare,
} from "lucide-react";
import { Application, HiringStage } from "../../types/application";
import { StageBadge } from "./StageBadge";

interface ApplicationCardProps {
  application: Application;
  onAdvance: (app: Application, nextStage: HiringStage) => Promise<void>;
  onReject: (app: Application) => void;
  onViewHistory: (app: Application) => void;
  onOpenReview?: (app: Application) => void;
  onOpenAtsReport?: (app: Application) => void;
  onSchedule?: (app: Application) => void;
  onFeedback?: (app: Application) => void;
}

const NEXT_STAGE_MAP: Partial<Record<HiringStage, { next: HiringStage; label: string }>> = {
  Applied: { next: "Screening", label: "Screening" },
  Screening: { next: "Interview", label: "Interview" },
  Interview: { next: "Offer", label: "Offer" },
  Offer: { next: "Hired", label: "Hire" },
};

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onAdvance,
  onReject,
  onViewHistory,
  onOpenReview,
  onOpenAtsReport,
  onSchedule,
  onFeedback,
}) => {
  const [isAdvancing, setIsAdvancing] = useState(false);

  const candidate = application.candidateId;
  const job = application.jobId;
  const currentStage = application.currentStage || application.stage;

  const nextConfig = NEXT_STAGE_MAP[currentStage];
  const isTerminal = currentStage === "Hired" || currentStage === "Rejected";

  const handleAdvance = async () => {
    if (!nextConfig || isAdvancing) return;
    setIsAdvancing(true);
    try {
      await onAdvance(application, nextConfig.next);
    } finally {
      setIsAdvancing(false);
    }
  };

  const candidateName = candidate?.fullName || candidate?.name || "Unknown Candidate";
  const appliedDate = application.appliedAt
    ? new Date(application.appliedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "Recently";

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all p-4 space-y-3 flex flex-col justify-between group">
      {/* Top Header: Candidate Name and Stage Badge */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900 text-sm leading-tight hover:text-brand-600 transition-colors">
            {candidateName}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {application.atsSnapshot && (
              <button
                type="button"
                onClick={() => onOpenAtsReport && onOpenAtsReport(application)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  application.atsSnapshot.overallScore >= 70
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                    : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                }`}
                title="Inspect immutable ATS compatibility snapshot"
              >
                <Sparkles className="w-3 h-3" />
                <span>ATS {application.atsSnapshot.overallScore}%</span>
              </button>
            )}
            <StageBadge stage={currentStage} size="sm" />
          </div>
        </div>

        {candidate?.currentTitle && (
          <p className="text-xs text-slate-500 font-medium">
            {candidate.currentTitle}
            {candidate.experienceYears !== undefined && ` • ${candidate.experienceYears}y exp`}
          </p>
        )}
      </div>

      {/* Job & Metadata */}
      <div className="space-y-1.5 pt-1 border-t border-slate-100 text-xs text-slate-600">
        <div className="flex items-center gap-1.5 truncate">
          <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate font-medium text-slate-700">{job?.title || "Job Opening"}</span>
        </div>

        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Applied {appliedDate}
          </span>
          {application.source && (
            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
              {application.source}
            </span>
          )}
        </div>
      </div>

      {/* AI & Interview Actions */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
        <div className="flex items-center gap-1">
          {onOpenReview && (
            <button
              type="button"
              onClick={() => onOpenReview(application)}
              className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md font-medium transition-colors"
              title="Inspect AI Stage Review & Screening Probes"
            >
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>Review</span>
            </button>
          )}

          {application.atsSnapshot && onOpenAtsReport && (
            <button
              type="button"
              onClick={() => onOpenAtsReport(application)}
              className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md font-medium transition-colors"
              title="Inspect ATS Submission Report"
            >
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>ATS</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {currentStage === "Interview" && onSchedule && (
            <button
              type="button"
              onClick={() => onSchedule(application)}
              className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-md font-medium transition-colors"
              title="Schedule Google Meet"
            >
              <Video className="w-3 h-3 text-purple-600" />
              <span>Meet</span>
            </button>
          )}

          {currentStage === "Interview" && onFeedback && (
            <button
              type="button"
              onClick={() => onFeedback(application)}
              className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md font-medium transition-colors"
              title="Submit Interview Feedback"
            >
              <MessageSquare className="w-3 h-3 text-amber-600" />
              <span>Feedback</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-1.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onViewHistory(application)}
          className="text-xs text-slate-500 hover:text-slate-800 p-1 rounded hover:bg-slate-100 transition-colors flex items-center gap-1"
          title="View stage history"
          aria-label={`View stage history for ${candidateName}`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span className="text-[11px]">Audit</span>
        </button>

        <div className="flex items-center gap-1.5">
          {!isTerminal && (
            <button
              type="button"
              onClick={() => onReject(application)}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-md font-medium transition-colors flex items-center gap-1"
              aria-label={`Reject application for ${candidateName}`}
            >
              <XCircle className="w-3 h-3" />
              <span>Reject</span>
            </button>
          )}

          {nextConfig ? (
            <button
              type="button"
              onClick={handleAdvance}
              disabled={isAdvancing}
              className="text-xs text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 px-2.5 py-1 rounded-md font-medium transition-colors shadow-2xs flex items-center gap-1 disabled:opacity-50"
              aria-label={`Advance ${candidateName} to ${nextConfig.label}`}
            >
              {isAdvancing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <span>To {nextConfig.label}</span>
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </button>
          ) : (
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 px-1">
              {currentStage === "Hired" ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-700 font-semibold">Hired</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 text-rose-500" />
                  <span className="text-rose-700 font-semibold">Rejected</span>
                </>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

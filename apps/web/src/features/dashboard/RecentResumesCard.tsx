import React from "react";
import { Star, Download, FileText, ArrowRight } from "lucide-react";
import { RecentResumeItem } from "../../types/analytics";
import { ChartEmptyState } from "./components/ChartEmptyState";
import { ChartSkeleton } from "./components/ChartSkeleton";

export type { RecentResumeItem };

interface RecentResumesCardProps {
  resumes?: RecentResumeItem[];
  loading?: boolean;
  onViewResume?: (item: RecentResumeItem) => void;
  onViewAll?: () => void;
}

export const RecentResumesCard: React.FC<RecentResumesCardProps> = ({
  resumes = [],
  loading = false,
  onViewResume,
  onViewAll,
}) => {
  const hasData = Array.isArray(resumes) && resumes.length > 0;

  return (
    <div
      data-testid="recent-resumes-card"
      className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between border border-slate-200/80 shadow-xs"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-purple-600" />
            <span>Recent Candidate Submissions</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Latest incoming applications with verified ATS score assessments
          </p>
        </div>

        {onViewAll && hasData && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1">
        {loading ? (
          <ChartSkeleton heightClass="h-56" />
        ) : !hasData ? (
          <ChartEmptyState
            title="No recent submissions"
            description="No candidate applications with uploaded resumes in this period."
            heightClass="h-56"
          />
        ) : (
          <div className="space-y-2.5">
            {resumes.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 bg-white/60 hover:bg-white transition-all text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {item.candidateName ? item.candidateName[0].toUpperCase() : "C"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{item.candidateName}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {item.jobTitle ? `${item.jobTitle} • ` : ""}
                      {item.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {item.score !== null && item.score !== undefined ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] font-bold">
                      <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                      <span>{item.score}%</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                      Scoring pending
                    </span>
                  )}

                  {item.downloadUrl && (
                    <a
                      href={item.downloadUrl}
                      download={item.filename}
                      className="p-1 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Download candidate resume PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {onViewResume && (
                    <button
                      type="button"
                      onClick={() => onViewResume(item)}
                      className="text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors cursor-pointer"
                    >
                      Inspect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

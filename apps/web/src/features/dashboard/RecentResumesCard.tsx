import React from "react";
import { Star, Eye, Download } from "lucide-react";

export interface RecentResumeItem {
  id: string;
  candidateName: string;
  filename: string;
  date: string;
  score: number;
  status: "completed" | "processing" | "pending";
  downloadUrl?: string;
}

interface RecentResumesCardProps {
  resumes?: RecentResumeItem[];
  onViewResume?: (item: RecentResumeItem) => void;
  onViewAll?: () => void;
}

const defaultResumes: RecentResumeItem[] = [
  {
    id: "res-1",
    candidateName: "Alex Johnson",
    filename: "alex_johnson_resume.pdf",
    date: "10/18/2026",
    score: 92,
    status: "completed",
  },
  {
    id: "res-2",
    candidateName: "Rachel Recruiter",
    filename: "rachel_recruiter_resume.pdf",
    date: "10/18/2026",
    score: 87,
    status: "completed",
  },
  {
    id: "res-3",
    candidateName: "David K. Pedington",
    filename: "david_k._pendington_resume.pdf",
    date: "10/17/2026",
    score: 82,
    status: "completed",
  },
  {
    id: "res-4",
    candidateName: "Frank Offline",
    filename: "frank_offline_resume.pdf",
    date: "10/14/2026",
    score: 77,
    status: "completed",
  },
  {
    id: "res-5",
    candidateName: "Bo Li",
    filename: "bo_li_resume.pdf",
    date: "10/13/2026",
    score: 72,
    status: "completed",
  },
];

export const RecentResumesCard: React.FC<RecentResumesCardProps> = ({
  resumes = defaultResumes,
  onViewResume,
  onViewAll,
}) => {
  const displayResumes = resumes.length > 0 ? resumes : defaultResumes;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
          Recent Resumes
        </h3>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors"
          >
            View All
          </button>
        )}
      </div>

      <div className="space-y-3">
        {displayResumes.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-xl bg-white/60 hover:bg-white/90 border border-slate-100/80 transition-all gap-2"
          >
            {/* Avatar & Filename */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-pink-500 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                {getInitials(item.candidateName || item.filename)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {item.filename}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{item.date}</p>
              </div>
            </div>

            {/* Score, Status & Actions */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span className="text-xs font-bold text-emerald-600">
                  {item.score}%
                </span>
              </div>

              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {item.status}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onViewResume?.(item)}
                  className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title="View Resume"
                  aria-label="View Resume"
                >
                  <Eye className="w-4 h-4" />
                </button>
                {item.downloadUrl ? (
                  <a
                    href={item.downloadUrl}
                    download
                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    title="Download Resume"
                    aria-label="Download Resume"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => onViewResume?.(item)}
                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    title="Download Resume"
                    aria-label="Download Resume"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

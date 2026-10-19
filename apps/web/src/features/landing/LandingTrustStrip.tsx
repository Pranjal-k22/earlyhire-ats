import React from "react";
import {
  FileSearch,
  GitFork,
  Video,
  Award,
  ShieldCheck,
} from "lucide-react";

export const LandingTrustStrip: React.FC = () => {
  const capabilities = [
    {
      icon: FileSearch,
      label: "AI Resume Analysis",
      color: "bg-purple-100 text-purple-700 border-purple-200",
    },
    {
      icon: GitFork,
      label: "Job-Specific Pipelines",
      color: "bg-blue-100 text-blue-700 border-blue-200",
    },
    {
      icon: Video,
      label: "Google Calendar & Meet",
      color: "bg-amber-100 text-amber-700 border-amber-200",
    },
    {
      icon: Award,
      label: "Structured Scorecards",
      color: "bg-pink-100 text-pink-700 border-pink-200",
    },
    {
      icon: ShieldCheck,
      label: "Secure Candidate Portals",
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
  ];

  return (
    <div className="w-full bg-white/70 border-y border-[#EAE5F0] backdrop-blur-md py-6 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs font-bold text-[#696977] uppercase tracking-wider text-center md:text-left shrink-0">
            Platform Capabilities:
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 sm:gap-4">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50/80 border border-[#EAE5F0] hover:border-violet-300 text-xs font-semibold text-[#20202A] shadow-xs hover:shadow-sm transition-all"
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.color}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

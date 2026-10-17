import React from "react";
import { JobStatus } from "../../types/job";

interface Props {
  status: JobStatus;
  size?: "sm" | "md";
}

export const JobStatusBadge: React.FC<Props> = ({ status, size = "md" }) => {
  const getBadgeStyles = (status: JobStatus): { bg: string; dot: string; label: string } => {
    switch (status) {
      case "Open":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
          label: "Open",
        };
      case "Paused":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
          label: "Paused",
        };
      case "Closed":
        return {
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          dot: "bg-slate-400",
          label: "Closed",
        };
      case "Archived":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          dot: "bg-rose-500",
          label: "Archived",
        };
      default:
        return {
          bg: "bg-slate-50 text-slate-600 border-slate-200",
          dot: "bg-slate-400",
          label: status,
        };
    }
  };

  const { bg, dot, label } = getBadgeStyles(status);
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${bg} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};

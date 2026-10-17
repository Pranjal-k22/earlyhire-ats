import React from "react";
import { HiringStage } from "../../types/application";

interface StageBadgeProps {
  stage: HiringStage;
  size?: "sm" | "md";
}

const STAGE_CONFIG: Record<
  HiringStage,
  { label: string; bg: string; text: string; dot: string }
> = {
  Applied: {
    label: "Applied",
    bg: "bg-slate-100 border-slate-200",
    text: "text-slate-700",
    dot: "bg-slate-400",
  },
  Screening: {
    label: "Screening",
    bg: "bg-sky-50 border-sky-200",
    text: "text-sky-700",
    dot: "bg-sky-500",
  },
  Interview: {
    label: "Interview",
    bg: "bg-purple-50 border-purple-200",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
  Offer: {
    label: "Offer",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  Hired: {
    label: "Hired",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  Rejected: {
    label: "Rejected",
    bg: "bg-rose-50 border-rose-200",
    text: "text-rose-700",
    dot: "bg-rose-500",
  },
};

export const StageBadge: React.FC<StageBadgeProps> = ({ stage, size = "md" }) => {
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.Applied;
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs font-medium";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${config.text} ${sizeClasses} shadow-xs`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
};

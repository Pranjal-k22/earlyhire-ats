import React from "react";
import { CandidateSource } from "../../types/candidate";

interface Props {
  source: CandidateSource;
  size?: "sm" | "md";
}

const SOURCE_STYLES: Record<CandidateSource, { bg: string; text: string; border: string }> = {
  Referral: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  LinkedIn: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
  },
  CompanyWebsite: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
  },
  JobBoard: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  Agency: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  Other: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
  },
};

export const CandidateSourceBadge: React.FC<Props> = ({ source, size = "md" }) => {
  const style = SOURCE_STYLES[source] || SOURCE_STYLES.Other;
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${style.bg} ${style.text} ${style.border} ${sizeClasses}`}
    >
      {source}
    </span>
  );
};

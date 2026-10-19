import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  percentageChange: number | null | undefined;
  direction?: "up" | "down" | "neutral";
  periodLabel?: string;
  positiveIsGood?: boolean;
  className?: string;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  percentageChange,
  direction = "neutral",
  periodLabel = "vs previous period",
  positiveIsGood = true,
  className = "",
}) => {
  if (percentageChange === null || percentageChange === undefined) {
    return (
      <div
        data-testid="trend-indicator-neutral"
        className={`inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 ${className}`}
        title="Insufficient historical data to compare prior equivalent period"
      >
        <Minus className="w-3 h-3 text-slate-400" />
        <span>No prior data to compare</span>
      </div>
    );
  }

  const isPositive = direction === "up" || percentageChange > 0;
  const isZero = direction === "neutral" && percentageChange === 0;

  // Good or bad based on direction and positiveIsGood flag
  const isGood = isZero ? true : positiveIsGood ? isPositive : !isPositive;

  const colorClass = isZero
    ? "text-slate-600 bg-slate-50 border-slate-200"
    : isGood
    ? "text-emerald-700 bg-emerald-50/90 border-emerald-200/80"
    : "text-rose-700 bg-rose-50/90 border-rose-200/80";

  const Icon = isZero ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <div
      data-testid="trend-indicator"
      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${colorClass} ${className}`}
    >
      <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>
        {isPositive ? "+" : ""}
        {percentageChange}%
      </span>
      <span className="font-normal text-slate-500 ml-0.5 hidden sm:inline">
        {periodLabel}
      </span>
    </div>
  );
};

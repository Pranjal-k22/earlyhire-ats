import React from "react";

interface ChartSkeletonProps {
  heightClass?: string;
  className?: string;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  heightClass = "h-56",
  className = "",
}) => {
  return (
    <div
      data-testid="chart-skeleton"
      className={`w-full ${heightClass} flex flex-col justify-end gap-2 p-4 animate-pulse ${className}`}
      aria-label="Loading chart data"
    >
      <div className="flex items-end justify-between gap-3 h-full pb-4 border-b border-slate-100">
        <div className="w-1/6 bg-slate-200/80 rounded-t-lg h-2/5" />
        <div className="w-1/6 bg-slate-200/80 rounded-t-lg h-3/5" />
        <div className="w-1/6 bg-slate-200/80 rounded-t-lg h-4/5" />
        <div className="w-1/6 bg-slate-200/80 rounded-t-lg h-1/2" />
        <div className="w-1/6 bg-slate-200/80 rounded-t-lg h-3/4" />
        <div className="w-1/6 bg-slate-200/80 rounded-t-lg h-2/3" />
      </div>
      <div className="flex justify-between pt-1">
        <div className="h-2 w-8 bg-slate-200 rounded" />
        <div className="h-2 w-8 bg-slate-200 rounded" />
        <div className="h-2 w-8 bg-slate-200 rounded" />
        <div className="h-2 w-8 bg-slate-200 rounded" />
      </div>
    </div>
  );
};

import React from "react";
import { Download, Info } from "lucide-react";
import { ChartSkeleton } from "./ChartSkeleton";
import { ChartErrorState } from "./ChartErrorState";
import { ChartEmptyState } from "./ChartEmptyState";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode | string;
  action?: React.ReactNode;
  infoTooltip?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  heightClass?: string;
  children: React.ReactNode;
  className?: string;
  testId?: string;
  onExportCsv?: () => void;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  badge,
  action,
  infoTooltip,
  loading = false,
  error = null,
  onRetry,
  empty = false,
  emptyTitle,
  emptyDescription,
  heightClass = "h-64",
  children,
  className = "",
  testId,
  onExportCsv,
}) => {
  return (
    <div
      data-testid={testId || `chart-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
      className={`glass-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between relative border border-slate-200/80 shadow-xs transition-shadow duration-200 hover:shadow-md ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight truncate">
              {title}
            </h3>
            {infoTooltip && (
              <span title={infoTooltip} className="cursor-help text-slate-400 hover:text-slate-600">
                <Info className="w-3.5 h-3.5" />
              </span>
            )}
            {typeof badge === "string" ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60 shrink-0">
                {badge}
              </span>
            ) : (
              badge
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed truncate">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onExportCsv && !loading && !error && !empty && (
            <button
              type="button"
              onClick={onExportCsv}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-purple-600 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Export visualization dataset as CSV"
              aria-label={`Export ${title} data as CSV`}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          {action}
        </div>
      </div>

      {/* Content Body: Loading, Error, Empty, or Children */}
      <div className="w-full flex-1 flex flex-col justify-center">
        {loading ? (
          <ChartSkeleton heightClass={heightClass} />
        ) : error ? (
          <ChartErrorState message={error} onRetry={onRetry} heightClass={heightClass} />
        ) : empty ? (
          <ChartEmptyState
            title={emptyTitle}
            description={emptyDescription}
            heightClass={heightClass}
          />
        ) : (
          children
        )}
      </div>
    </div>
  );
};

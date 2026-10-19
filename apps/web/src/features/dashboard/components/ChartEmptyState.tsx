import React from "react";
import { LucideIcon, BarChart2 } from "lucide-react";

interface ChartEmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  heightClass?: string;
  actionText?: string;
  onAction?: () => void;
}

export const ChartEmptyState: React.FC<ChartEmptyStateProps> = ({
  title = "No data available",
  description = "No records recorded matching the selected filters.",
  icon: Icon = BarChart2,
  heightClass = "h-56",
  actionText,
  onAction,
}) => {
  return (
    <div
      data-testid="chart-empty-state"
      className={`w-full ${heightClass} flex flex-col items-center justify-center p-6 text-center`}
    >
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="text-xs sm:text-sm font-bold text-slate-700">{title}</h4>
      <p className="text-[11px] text-slate-400 mt-1 max-w-xs">{description}</p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

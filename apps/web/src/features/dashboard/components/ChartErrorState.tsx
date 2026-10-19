import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ChartErrorStateProps {
  message?: string;
  onRetry?: () => void;
  heightClass?: string;
}

export const ChartErrorState: React.FC<ChartErrorStateProps> = ({
  message = "Failed to load visualization data",
  onRetry,
  heightClass = "h-56",
}) => {
  return (
    <div
      data-testid="chart-error-state"
      className={`w-full ${heightClass} flex flex-col items-center justify-center p-6 text-center`}
    >
      <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-2">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-xs sm:text-sm font-bold text-slate-800">Chart Unavailable</h4>
      <p className="text-[11px] text-rose-600 mt-0.5 max-w-xs">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};

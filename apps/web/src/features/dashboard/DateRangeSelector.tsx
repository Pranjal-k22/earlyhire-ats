import React, { useState } from "react";
import { Calendar, RotateCcw, AlertCircle } from "lucide-react";

interface DateRangeSelectorProps {
  period: "7d" | "30d" | "90d" | "all";
  from: string;
  to: string;
  onPeriodChange: (period: "7d" | "30d" | "90d" | "all") => void;
  onCustomDateChange: (from: string, to: string) => void;
  onReset: () => void;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  period,
  from,
  to,
  onPeriodChange,
  onCustomDateChange,
  onReset,
}) => {
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);
  const [validationError, setValidationError] = useState<string | null>(null);

  const presets: Array<{ id: "7d" | "30d" | "90d" | "all"; label: string }> = [
    { id: "7d", label: "Last 7 Days" },
    { id: "30d", label: "Last 30 Days" },
    { id: "90d", label: "Last 90 Days" },
    { id: "all", label: "All Time" },
  ];

  const handleApplyCustomDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localFrom && !localTo) {
      setValidationError("Please select at least a start or end date.");
      return;
    }

    if (localFrom && localTo && localFrom > localTo) {
      setValidationError("Start date cannot be after end date.");
      return;
    }

    setValidationError(null);
    onCustomDateChange(localFrom, localTo);
  };

  const handlePresetClick = (pId: "7d" | "30d" | "90d" | "all") => {
    setLocalFrom("");
    setLocalTo("");
    setValidationError(null);
    onPeriodChange(pId);
  };

  const handleResetClick = () => {
    setLocalFrom("");
    setLocalTo("");
    setValidationError(null);
    onReset();
  };

  const isCustomActive = Boolean(from || to);

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Preset Pills */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Date Range Presets">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-brand-600" />
            <span>Range:</span>
          </span>
          {presets.map((preset) => {
            const isActive = !isCustomActive && period === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetClick(preset.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? "bg-brand-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Custom Range Form */}
        <form onSubmit={handleApplyCustomDates} className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <span className="text-slate-500">From:</span>
            <input
              type="date"
              aria-label="Filter from date"
              value={localFrom}
              onChange={(e) => {
                setLocalFrom(e.target.value);
                setValidationError(null);
              }}
              className="bg-transparent border-none text-slate-800 text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <span className="text-slate-500">To:</span>
            <input
              type="date"
              aria-label="Filter to date"
              value={localTo}
              onChange={(e) => {
                setLocalTo(e.target.value);
                setValidationError(null);
              }}
              className="bg-transparent border-none text-slate-800 text-xs focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors"
          >
            Apply
          </button>

          {(isCustomActive || period !== "all") && (
            <button
              type="button"
              onClick={handleResetClick}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Reset to All Time"
              aria-label="Reset date filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="flex items-center gap-2 text-rose-600 text-xs bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
};

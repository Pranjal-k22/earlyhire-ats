import React from "react";
import { Clock, History } from "lucide-react";

interface StageDurationCardProps {
  durations: Record<string, number | null>;
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined || ms < 0) return "—";

  const totalMinutes = Math.round(ms / (1000 * 60));
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const totalHours = Math.round(totalMinutes / 60);
  if (totalHours < 24) {
    return `${totalHours}h`;
  }

  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;

  if (remainingHours === 0) {
    return `${days}d`;
  }

  return `${days}d ${remainingHours}h`;
}

export const StageDurationCard: React.FC<StageDurationCardProps> = ({
  durations,
}) => {
  const stageEntries = [
    { stage: "Applied", label: "Applied to Screening" },
    { stage: "Screening", label: "Screening to Interview" },
    { stage: "Interview", label: "Interview to Offer" },
    { stage: "Offer", label: "Offer to Final Outcome" },
  ];

  const hasData = Object.values(durations).some((v) => v !== null);

  return (
    <div
      data-testid="stage-duration-card"
      className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" />
            <span>Average Time in Stage</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Historical completed stage durations from transition logs
          </p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md flex items-center gap-1">
          <History className="w-3 h-3" />
          <span>Completed</span>
        </span>
      </div>

      {!hasData ? (
        <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-sm">
          <span>No completed stage movements recorded yet.</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {stageEntries.map((item) => {
            const ms = durations[item.stage] ?? null;
            const formatted = formatDuration(ms);

            return (
              <div
                key={item.stage}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between"
              >
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {item.stage}
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-bold font-mono text-slate-900">
                    {formatted}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {ms !== null ? "avg duration" : "no data"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 truncate">
                  {item.label}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

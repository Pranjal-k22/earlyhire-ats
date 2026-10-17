import React from "react";
import { SourcingItem } from "../../types/analytics";
import { Compass } from "lucide-react";

interface SourcingChartProps {
  sourcing: SourcingItem[];
  totalApplications: number;
}

const SOURCE_COLORS = [
  "#2563eb", // blue
  "#7c3aed", // violet
  "#059669", // emerald
  "#d97706", // amber
  "#e11d48", // rose
  "#0891b2", // cyan
  "#64748b", // slate
];

export const SourcingChart: React.FC<SourcingChartProps> = ({
  sourcing,
  totalApplications,
}) => {
  return (
    <div
      data-testid="sourcing-distribution-card"
      className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-4 h-4 text-brand-600" />
            <span>Candidate Sourcing Channels</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Origin channels for cohort applications
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
          {sourcing.length} Channels
        </span>
      </div>

      {sourcing.length === 0 || totalApplications === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-sm">
          <span>No sourcing data available for this date range.</span>
        </div>
      ) : (
        <div className="space-y-3.5">
          {sourcing.map((item, idx) => {
            const color = SOURCE_COLORS[idx % SOURCE_COLORS.length];
            return (
              <div key={item.source} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-semibold text-slate-800">
                      {item.source}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="font-bold text-slate-900">
                      {item.count}
                    </span>
                    <span className="text-slate-400">({item.percentage}%)</span>
                  </div>
                </div>

                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

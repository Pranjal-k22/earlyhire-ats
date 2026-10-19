import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { PipelineStage } from "../../types/analytics";
import { Layers } from "lucide-react";

interface StageDistributionChartProps {
  stageCounts: Record<PipelineStage, number>;
  onSelectStage?: (stage: PipelineStage) => void;
}

const STAGE_CONFIG: Record<
  PipelineStage,
  { label: string; color: string; bg: string }
> = {
  Applied: { label: "Applied", color: "#64748b", bg: "bg-slate-100" },
  Screening: { label: "Screening", color: "#0284c7", bg: "bg-sky-50" },
  Interview: { label: "Interview", color: "#7c3aed", bg: "bg-purple-50" },
  Offer: { label: "Offer", color: "#d97706", bg: "bg-amber-50" },
  Hired: { label: "Hired", color: "#059669", bg: "bg-emerald-50" },
  Rejected: { label: "Rejected", color: "#e11d48", bg: "bg-rose-50" },
};

const STAGE_KEYS: PipelineStage[] = [
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
];

export const StageDistributionChart: React.FC<StageDistributionChartProps> = ({
  stageCounts,
  onSelectStage,
}) => {
  const counts = stageCounts || {
    Applied: 0,
    Screening: 0,
    Interview: 0,
    Offer: 0,
    Hired: 0,
    Rejected: 0,
  };
  const total = Object.values(counts).reduce((acc, c) => acc + c, 0);

  const chartData = STAGE_KEYS.map((stage) => {
    const count = counts[stage] || 0;
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
    return {
      stage,
      label: STAGE_CONFIG[stage].label,
      count,
      percentage: Number(percentage),
      color: STAGE_CONFIG[stage].color,
    };
  });

  return (
    <div
      data-testid="stage-distribution-chart"
      className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600" />
            <span>Applications by Stage</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Current stage distribution of active applications
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
          {total} Active Total
        </span>
      </div>

      {total === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm">
          <Layers className="w-8 h-8 mb-2 opacity-40 text-slate-300" />
          <span>No active applications in this date range.</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="h-56 w-full" data-testid="barchart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(state: unknown) => {
                  const e = state as { activePayload?: Array<{ payload: { stage: PipelineStage } }> };
                  if (e && e.activePayload && e.activePayload.length && onSelectStage) {
                    onSelectStage(e.activePayload[0].payload.stage);
                  }
                }}
              >
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(241, 245, 249, 0.6)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-2.5 rounded-lg shadow-lg border border-slate-800">
                          <p className="font-bold">{data.label}</p>
                          <p className="mt-1">
                            Applications:{" "}
                            <span className="font-mono font-semibold">
                              {data.count}
                            </span>
                          </p>
                          <p className="text-slate-400">
                            Share of active: {data.percentage}%
                          </p>
                          <p className="text-purple-300 text-[10px] mt-1 font-medium">Click to inspect stage</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48} cursor="pointer">
                  {chartData.map((entry) => (
                    <Cell key={entry.stage} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Breakdown table / tags for accessible screen reading & color-independent view */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
            {chartData.map((item) => (
              <button
                key={item.stage}
                type="button"
                onClick={() => onSelectStage?.(item.stage)}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 hover:bg-purple-50/60 border border-slate-100 hover:border-purple-200 text-xs transition-colors cursor-pointer text-left"
                title={`Filter applications by stage: ${item.label}`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-slate-700 truncate">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                  <span className="font-bold text-slate-900">{item.count}</span>
                  <span>({item.percentage}%)</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

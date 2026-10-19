import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ScoreBucket } from "../../types/analytics";
import { ChartEmptyState } from "./components/ChartEmptyState";
import { ChartSkeleton } from "./components/ChartSkeleton";
import { Award } from "lucide-react";

interface ScoreDistributionProps {
  data?: ScoreBucket[];
  loading?: boolean;
  onSelectRange?: (range: string) => void;
}

const BUCKET_COLORS: Record<string, string> = {
  "0-40": "#f43f5e", // Rose
  "41-60": "#f59e0b", // Amber
  "61-80": "#0ea5e9", // Sky
  "81-100": "#10b981", // Emerald
};

export const ScoreDistributionChart: React.FC<ScoreDistributionProps> = ({
  data = [],
  loading = false,
  onSelectRange,
}) => {
  const hasData = Array.isArray(data) && data.length > 0 && data.some((b) => b.count > 0);

  return (
    <div
      data-testid="score-distribution-chart"
      className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between border border-slate-200/80 shadow-xs"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            <Award className="w-4 h-4 text-purple-600" />
            <span>ATS Score Distribution</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Candidate resume compatibility scores across standard brackets
          </p>
        </div>
      </div>

      <div className="h-56 sm:h-64 w-full">
        {loading ? (
          <ChartSkeleton heightClass="h-56" />
        ) : !hasData ? (
          <ChartEmptyState
            title="No ATS scores evaluated"
            description="No applications in this cohort have completed AI ATS scoring."
            heightClass="h-56"
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onClick={(state: unknown) => {
                const e = state as { activePayload?: Array<{ payload: ScoreBucket }> };
                if (e && e.activePayload && e.activePayload.length && onSelectRange) {
                  const bucket = e.activePayload[0].payload;
                  if (bucket?.range) onSelectRange(bucket.range);
                }
              }}
            >
              <XAxis
                dataKey="range"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(139, 92, 246, 0.04)" }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const bucket = payload[0].payload as ScoreBucket;
                    return (
                      <div className="bg-slate-900/95 text-white text-xs px-3.5 py-2 rounded-xl shadow-xl border border-slate-800 backdrop-blur-md">
                        <p className="font-bold text-slate-100">Score Range: {label}</p>
                        <p className="text-purple-300 font-semibold mt-1">
                          {bucket.count} candidate applications ({bucket.percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48} cursor="pointer">
                {data.map((entry) => (
                  <Cell
                    key={entry.range}
                    fill={BUCKET_COLORS[entry.range] || "#8b5cf6"}
                    className="transition-all hover:opacity-80"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {hasData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-xs">
          {data.map((item) => (
            <div
              key={item.range}
              className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between"
            >
              <span className="font-bold text-slate-700">{item.range}:</span>
              <span className="font-mono text-purple-700 font-bold">
                {item.count} <span className="text-[10px] text-slate-400 font-normal">({item.percentage}%)</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

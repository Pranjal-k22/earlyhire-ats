import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Download } from "lucide-react";
import { ApplicationTrendPoint } from "../../types/analytics";
import { ChartEmptyState } from "./components/ChartEmptyState";
import { ChartSkeleton } from "./components/ChartSkeleton";

interface MonthlyApplicationsProps {
  data?: ApplicationTrendPoint[];
  loading?: boolean;
  onSelectPoint?: (point: ApplicationTrendPoint) => void;
}

export const MonthlyApplicationsChart: React.FC<MonthlyApplicationsProps> = ({
  data = [],
  loading = false,
  onSelectPoint,
}) => {
  const hasData = Array.isArray(data) && data.length > 0 && data.some((d) => d.applications > 0);

  const handleExportCsv = () => {
    if (!data.length) return;
    const headers = "Date,Label,Applications,Screenings,Interviews,Hires\n";
    const rows = data
      .map((d) => `"${d.date}","${d.label}",${d.applications},${d.screenings || 0},${d.interviews || 0},${d.hires || 0}`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `application_trends_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      data-testid="monthly-applications-chart"
      className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between border border-slate-200/80 shadow-xs"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
            Application Volume Trends
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cohort applications and pipeline progression over time
          </p>
        </div>
        {hasData && (
          <button
            type="button"
            onClick={handleExportCsv}
            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200/60"
            title="Export trend series as CSV"
            aria-label="Export trend series as CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="h-56 sm:h-64 w-full">
        {loading ? (
          <ChartSkeleton heightClass="h-56" />
        ) : !hasData ? (
          <ChartEmptyState
            title="No trend data recorded"
            description="No applications were submitted during this time window."
            heightClass="h-56"
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onClick={(state: unknown) => {
                const e = state as { activePayload?: Array<{ payload: ApplicationTrendPoint }> };
                if (e && e.activePayload && e.activePayload.length && onSelectPoint) {
                  onSelectPoint(e.activePayload[0].payload);
                }
              }}
            >
              <defs>
                <linearGradient id="purpleTealArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.45} />
                  <stop offset="60%" stopColor="#06b6d4" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
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
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const point = payload[0].payload as ApplicationTrendPoint;
                    return (
                      <div className="bg-slate-900/95 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-800 backdrop-blur-md">
                        <p className="font-bold text-slate-100">{label}</p>
                        <div className="mt-1.5 space-y-1 text-[11px] pt-1 border-t border-slate-800">
                          <p className="flex justify-between gap-3 text-purple-300">
                            <span>Applications:</span>
                            <span className="font-bold font-mono text-white">{point.applications}</span>
                          </p>
                          <p className="flex justify-between gap-3 text-sky-300">
                            <span>Screenings:</span>
                            <span className="font-bold font-mono text-white">{point.screenings || 0}</span>
                          </p>
                          <p className="flex justify-between gap-3 text-emerald-300">
                            <span>Hires:</span>
                            <span className="font-bold font-mono text-white">{point.hires || 0}</span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="applications"
                stroke="#8b5cf6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#purpleTealArea)"
                activeDot={{ r: 6, fill: "#8b5cf6", stroke: "#ffffff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { Briefcase, ArrowRight } from "lucide-react";
import { JobPerformanceItem } from "../../types/analytics";
import { ChartEmptyState } from "./components/ChartEmptyState";
import { ChartSkeleton } from "./components/ChartSkeleton";

interface JobPerformanceChartProps {
  data?: JobPerformanceItem[];
  loading?: boolean;
  onSelectJob?: (jobId: string) => void;
}

export const JobPerformanceChart: React.FC<JobPerformanceChartProps> = ({
  data = [],
  loading = false,
  onSelectJob,
}) => {
  const [metricKey, setMetricKey] = useState<"applicationsCount" | "interviewCount" | "hiredCount">(
    "applicationsCount"
  );

  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div
      data-testid="job-performance-chart"
      className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between border border-slate-200/80 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-purple-600" />
            <span>Job Role Pipeline Performance</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare candidate volume and conversion across active job requisitions
          </p>
        </div>

        {hasData && (
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMetricKey("applicationsCount")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                metricKey === "applicationsCount"
                  ? "bg-white text-purple-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Applications
            </button>
            <button
              type="button"
              onClick={() => setMetricKey("interviewCount")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                metricKey === "interviewCount"
                  ? "bg-white text-purple-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Interviews
            </button>
            <button
              type="button"
              onClick={() => setMetricKey("hiredCount")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                metricKey === "hiredCount"
                  ? "bg-white text-purple-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Hires
            </button>
          </div>
        )}
      </div>

      <div className="h-64 sm:h-72 w-full">
        {loading ? (
          <ChartSkeleton heightClass="h-64" />
        ) : !hasData ? (
          <ChartEmptyState
            title="No job performance recorded"
            description="No applications associated with jobs in the selected time range."
            heightClass="h-64"
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
              onClick={(state: unknown) => {
                const e = state as { activePayload?: Array<{ payload: JobPerformanceItem }> };
                if (e && e.activePayload && e.activePayload.length && onSelectJob) {
                  const item = e.activePayload[0].payload;
                  if (item?.jobId) onSelectJob(item.jobId);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="title"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
                interval={0}
                tick={(props) => {
                  const { x, y, payload } = props;
                  const label = payload.value.length > 14 ? `${payload.value.slice(0, 12)}...` : payload.value;
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text
                        x={0}
                        y={0}
                        dy={14}
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize={10}
                        fontWeight={500}
                      >
                        {label}
                      </text>
                    </g>
                  );
                }}
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
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as JobPerformanceItem;
                    return (
                      <div className="bg-slate-900/95 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-800 backdrop-blur-md">
                        <p className="font-bold text-slate-100">{item.title}</p>
                        <p className="text-[10px] text-slate-400">{item.department} • {item.status}</p>
                        <div className="mt-2 space-y-1 text-[11px] pt-1 border-t border-slate-800">
                          <p className="flex justify-between gap-4 text-purple-300">
                            <span>Total Applications:</span>
                            <span className="font-mono font-bold text-white">{item.applicationsCount}</span>
                          </p>
                          <p className="flex justify-between gap-4 text-sky-300">
                            <span>Screenings:</span>
                            <span className="font-mono font-bold text-white">{item.screeningCount}</span>
                          </p>
                          <p className="flex justify-between gap-4 text-amber-300">
                            <span>Interviews:</span>
                            <span className="font-mono font-bold text-white">{item.interviewCount}</span>
                          </p>
                          <p className="flex justify-between gap-4 text-emerald-300">
                            <span>Hires:</span>
                            <span className="font-mono font-bold text-white">{item.hiredCount}</span>
                          </p>
                          {item.avgScore !== null && (
                            <p className="flex justify-between gap-4 text-indigo-300 pt-0.5">
                              <span>Avg ATS Score:</span>
                              <span className="font-mono font-bold text-white">{item.avgScore}/100</span>
                            </p>
                          )}
                        </div>
                        <p className="text-[10px] text-purple-400 mt-2 font-medium">Click bar to filter by this job</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
              />
              <Bar
                name="Applications"
                dataKey="applicationsCount"
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
                cursor="pointer"
              />
              <Bar
                name="Interviews"
                dataKey="interviewCount"
                fill="#06b6d4"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
                cursor="pointer"
              />
              <Bar
                name="Hired"
                dataKey="hiredCount"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
                cursor="pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {hasData && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 text-xs">
          <span className="text-[11px] text-slate-400 font-medium">Quick job filter:</span>
          {data.slice(0, 5).map((job) => (
            <button
              key={job.jobId}
              type="button"
              onClick={() => onSelectJob?.(job.jobId)}
              className="px-2 py-0.5 rounded-lg bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200/80 transition-colors cursor-pointer text-[11px] font-semibold flex items-center gap-1"
            >
              <span>{job.title}</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

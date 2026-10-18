import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { MoreVertical } from "lucide-react";

interface MonthlyApplicationsProps {
  data?: Array<{ month: string; applications: number }>;
}

const defaultMonthlyData = [
  { month: "Jan", applications: 2 },
  { month: "Feb", applications: 12 },
  { month: "Mar", applications: 38 },
  { month: "Apr", applications: 32 },
  { month: "May", applications: 18 },
  { month: "Jun", applications: 30 },
];

export const MonthlyApplicationsChart: React.FC<MonthlyApplicationsProps> = ({
  data = defaultMonthlyData,
}) => {
  return (
    <div className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
          Monthly Applications
        </h3>
        <button
          type="button"
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          aria-label="Options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      <div className="h-56 sm:h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="purpleTealArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.45} />
                <stop offset="60%" stopColor="#06b6d4" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
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
              tickCount={5}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="glass-card px-3 py-2 rounded-xl text-xs shadow-md border border-white/90">
                      <p className="font-bold text-slate-800">{label}</p>
                      <p className="text-purple-600 font-semibold">
                        {payload[0].value} applications
                      </p>
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
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

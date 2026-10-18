import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface ScoreBucket {
  range: string;
  count: number;
}

interface ScoreDistributionProps {
  data?: ScoreBucket[];
}

const defaultScoreData: ScoreBucket[] = [
  { range: "0-40", count: 0 },
  { range: "41-60", count: 0 },
  { range: "61-80", count: 0 },
  { range: "81-100", count: 2 },
];

export const ScoreDistributionChart: React.FC<ScoreDistributionProps> = ({
  data = defaultScoreData,
}) => {
  return (
    <div className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
          Score Distribution
        </h3>
      </div>

      <div className="h-56 sm:h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
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
              cursor={{ fill: "rgba(139, 92, 246, 0.05)" }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="glass-card px-3 py-1.5 rounded-xl text-xs shadow-md border border-white/90">
                      <p className="font-bold text-slate-800">Score Range: {label}</p>
                      <p className="text-purple-600 font-semibold">
                        {payload[0].value} candidates
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="count"
              fill="url(#scoreBarGradient)"
              radius={[8, 8, 0, 0]}
              barSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

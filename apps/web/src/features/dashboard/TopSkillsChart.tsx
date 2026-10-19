import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { SkillItem } from "../../types/analytics";
import { ChartEmptyState } from "./components/ChartEmptyState";
import { ChartSkeleton } from "./components/ChartSkeleton";
import { Sparkles } from "lucide-react";

interface TopSkillsChartProps {
  skills?: SkillItem[];
  loading?: boolean;
  onSelectSkill?: (skill: string) => void;
}

const COLORS = [
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#ec4899", // Pink
  "#6366f1", // Indigo
  "#14b8a6", // Teal
];

export const TopSkillsChart: React.FC<TopSkillsChartProps> = ({
  skills = [],
  loading = false,
  onSelectSkill,
}) => {
  const hasData = Array.isArray(skills) && skills.length > 0;

  return (
    <div
      data-testid="top-skills-chart"
      className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between border border-slate-200/80 shadow-xs"
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Top Skills Detected</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Most frequent candidate skills in active talent cohort
          </p>
        </div>
      </div>

      <div className="h-44 sm:h-48 w-full flex items-center justify-center">
        {loading ? (
          <ChartSkeleton heightClass="h-44" />
        ) : !hasData ? (
          <ChartEmptyState
            title="No skills recorded"
            description="Candidate profiles in this period have no extracted skills yet."
            heightClass="h-44"
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as SkillItem;
                    return (
                      <div className="bg-slate-900/95 text-white text-xs px-3 py-2 rounded-xl shadow-xl border border-slate-800 backdrop-blur-md">
                        <p className="font-bold text-slate-100">{data.skill}</p>
                        <p className="text-purple-300 font-semibold mt-0.5">
                          {data.count} candidates ({data.percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie
                data={skills}
                cx="50%"
                cy="50%"
                innerRadius={46}
                outerRadius={74}
                paddingAngle={3}
                dataKey="count"
                nameKey="skill"
                cursor="pointer"
                onClick={(entry: { skill?: string; name?: string; payload?: { skill?: string } }) => {
                  const skillName = entry?.skill || entry?.name || entry?.payload?.skill;
                  if (onSelectSkill && skillName) {
                    onSelectSkill(skillName);
                  }
                }}
              >
                {skills.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    className="transition-all hover:opacity-80"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Interactive Legend */}
      {hasData && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 pt-3 border-t border-slate-100 text-xs">
          {skills.slice(0, 6).map((item, idx) => (
            <button
              key={item.skill}
              type="button"
              onClick={() => onSelectSkill?.(item.skill)}
              className="flex items-center gap-1.5 p-1 rounded-md hover:bg-slate-50 transition-colors cursor-pointer text-left"
              title={`Filter candidates by skill: ${item.skill}`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span className="text-slate-700 font-medium">{item.skill}</span>
              <span className="text-slate-400 font-mono text-[10px]">({item.count})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

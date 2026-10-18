import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { MoreVertical } from "lucide-react";

interface SkillItem {
  skill: string;
  count: number;
}

interface TopSkillsChartProps {
  skills?: SkillItem[];
}

const defaultSkills: SkillItem[] = [
  { skill: "Python", count: 2 },
  { skill: "Django", count: 1 },
  { skill: "PostgreSQL", count: 1 },
  { skill: "Docker", count: 1 },
  { skill: "JavaScript", count: 1 },
];

const COLORS = ["#8b5cf6", "#14b8a6", "#3b82f6", "#f97316", "#ef4444", "#a855f7"];

export const TopSkillsChart: React.FC<TopSkillsChartProps> = ({ skills = defaultSkills }) => {
  const displaySkills = skills.length > 0 ? skills : defaultSkills;

  return (
    <div className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
          Top Skills Detected
        </h3>
        <button
          type="button"
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          aria-label="Options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      <div className="h-44 sm:h-48 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as SkillItem;
                  return (
                    <div className="glass-card px-3 py-1.5 rounded-xl text-xs shadow-md border border-white/90">
                      <p className="font-bold text-slate-800">{data.skill}</p>
                      <p className="text-slate-500">{data.count} candidates</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={displaySkills}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={75}
              paddingAngle={3}
              dataKey="count"
              nameKey="skill"
            >
              {displaySkills.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 border-t border-slate-100 text-xs">
        {displaySkills.map((item, idx) => (
          <div key={item.skill} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
            />
            <span className="text-slate-600 font-medium">{item.skill}</span>
            <span className="text-slate-400">({item.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

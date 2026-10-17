import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  badge?: string;
  badgeBg?: string;
  badgeText?: string;
  testId?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-brand-600",
  iconBg = "bg-brand-50",
  badge,
  badgeBg = "bg-slate-100",
  badgeText = "text-slate-600",
  testId,
}) => {
  return (
    <div
      data-testid={testId || `metric-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
      className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-subtle transition-all flex flex-col justify-between"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className={`p-2.5 rounded-xl ${iconBg} ${iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        {badge && (
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${badgeBg} ${badgeText}`}
          >
            {badge}
          </span>
        )}
      </div>

      <div>
        <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mt-1">
          {title}
        </h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};

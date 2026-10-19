import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  gradientBg?: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  trendNode?: React.ReactNode;
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
  gradientBg,
  trend,
  trendDirection = "up",
  trendNode,
  badge,
  badgeBg = "bg-slate-100",
  badgeText = "text-slate-600",
  testId,
}) => {
  return (
    <div
      data-testid={testId || `metric-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
      className="glass-card glass-card-hover p-5 sm:p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105 ${
            gradientBg ? `${gradientBg} text-white` : `${iconBg} ${iconColor}`
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>

        {trendNode ? (
          <div>{trendNode}</div>
        ) : trend ? (
          <div
            className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
              trendDirection === "up"
                ? "text-emerald-700 bg-emerald-50/80 border border-emerald-200/60"
                : trendDirection === "neutral"
                ? "text-slate-600 bg-slate-50/80 border border-slate-200/60"
                : "text-rose-700 bg-rose-50/80 border border-rose-200/60"
            }`}
          >
            <span>{trend}</span>
          </div>
        ) : badge ? (
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${badgeBg} ${badgeText}`}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <div>
        <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight font-sans">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1.5">
          {title}
        </h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};

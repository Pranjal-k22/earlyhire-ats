import React from "react";

export interface TooltipItem {
  label: string;
  value: string | number;
  color?: string;
  unit?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  title?: string;
  items?: TooltipItem[];
  subtitle?: string;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  active,
  title,
  items = [],
  subtitle,
}) => {
  if (!active || (!title && items.length === 0)) return null;

  return (
    <div
      data-testid="chart-custom-tooltip"
      className="bg-slate-900/95 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-800 backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-100 min-w-[140px]"
    >
      {title && <p className="font-bold text-slate-100 leading-tight">{title}</p>}
      {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      <div className="space-y-1 mt-1.5 pt-1 border-t border-slate-800/80">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              {item.color && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
              )}
              <span className="text-slate-300 font-medium">{item.label}:</span>
            </div>
            <span className="font-mono font-bold text-white">
              {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
              {item.unit ? ` ${item.unit}` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

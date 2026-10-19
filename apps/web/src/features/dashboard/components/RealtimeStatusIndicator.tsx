import React from "react";
import { RefreshCw, Radio, AlertTriangle } from "lucide-react";

export type ConnectionStatus = "connected" | "connecting" | "reconnecting" | "offline";

interface RealtimeStatusIndicatorProps {
  status: ConnectionStatus;
  lastUpdated: Date | string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export const RealtimeStatusIndicator: React.FC<RealtimeStatusIndicatorProps> = ({
  status,
  lastUpdated,
  onRefresh,
  isRefreshing = false,
  className = "",
}) => {
  const formatTime = (ts: Date | string | null): string => {
    if (!ts) return "Just now";
    const d = typeof ts === "string" ? new Date(ts) : ts;
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const getStatusBadge = () => {
    switch (status) {
      case "connected":
        return {
          dotColor: "bg-emerald-500",
          pulse: true,
          label: "Live Real-Time Active",
          textColor: "text-emerald-700",
          bgColor: "bg-emerald-50/80 border-emerald-200/60",
          icon: Radio,
        };
      case "connecting":
      case "reconnecting":
        return {
          dotColor: "bg-amber-500",
          pulse: true,
          label: status === "connecting" ? "Connecting live stream..." : "Reconnecting...",
          textColor: "text-amber-700",
          bgColor: "bg-amber-50/80 border-amber-200/60",
          icon: RefreshCw,
        };
      case "offline":
      default:
        return {
          dotColor: "bg-slate-400",
          pulse: false,
          label: "Offline (Polling fallback)",
          textColor: "text-slate-600",
          bgColor: "bg-slate-100 border-slate-200",
          icon: AlertTriangle,
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div
      data-testid="realtime-status-indicator"
      className={`flex items-center gap-2.5 text-xs ${className}`}
    >
      <div
        data-testid={`realtime-status-${status}`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all ${badge.bgColor} ${badge.textColor}`}
        title={`Status: ${badge.label}. Last synced: ${formatTime(lastUpdated)}`}
      >
        <span
          className={`w-2 h-2 rounded-full ${badge.dotColor} ${badge.pulse ? "animate-pulse" : ""}`}
          aria-hidden="true"
        />
        <span>{badge.label}</span>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-[11px]">
        <span>Synced:</span>
        <span className="font-mono text-slate-600 font-semibold">{formatTime(lastUpdated)}</span>
      </div>

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          title="Force refresh analytics from server"
          aria-label="Refresh dashboard data"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-purple-600" : ""}`}
          />
        </button>
      )}
    </div>
  );
};

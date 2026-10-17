import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Briefcase,
  UserCheck,
  UserX,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import { DashboardOverviewData, FunnelData } from "../../types/analytics";
import { fetchDashboardOverview, fetchRecruitmentFunnel } from "../../api/analyticsApi";
import { MetricCard } from "./MetricCard";
import { DateRangeSelector } from "./DateRangeSelector";
import { StageDistributionChart } from "./StageDistributionChart";
import { FunnelChart } from "./FunnelChart";
import { SourcingChart } from "./SourcingChart";
import { StageDurationCard } from "./StageDurationCard";

export const DashboardView: React.FC = () => {
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Date range filters
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        period: !fromDate && !toDate ? period : undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      };

      const [overviewRes, funnelRes] = await Promise.all([
        fetchDashboardOverview(params),
        fetchRecruitmentFunnel(params),
      ]);

      setOverview(overviewRes.data);
      setFunnel(funnelRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  }, [period, fromDate, toDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePeriodChange = (newPeriod: "7d" | "30d" | "90d" | "all") => {
    setFromDate("");
    setToDate("");
    setPeriod(newPeriod);
  };

  const handleCustomDateChange = (from: string, to: string) => {
    setFromDate(from);
    setToDate(to);
  };

  const handleResetFilters = () => {
    setFromDate("");
    setToDate("");
    setPeriod("all");
  };

  return (
    <div className="space-y-6" data-testid="dashboard-view">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Recruitment Analytics & Insights
            </h2>
            {overview && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                {overview.period.label}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time pipeline performance, conversion funnel metrics, and candidate volume.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200/80 transition-colors"
            title="Refresh dashboard metrics"
            aria-label="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-brand-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Date Range Selector Bar */}
      <DateRangeSelector
        period={period}
        from={fromDate}
        to={toDate}
        onPeriodChange={handlePeriodChange}
        onCustomDateChange={handleCustomDateChange}
        onReset={handleResetFilters}
      />

      {/* API Error State */}
      {error && (
        <div
          data-testid="analytics-error-banner"
          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-semibold">Unable to load recruitment metrics</p>
              <p className="text-xs text-rose-600 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && !overview && (
        <div className="space-y-6" data-testid="dashboard-loading-skeleton">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-32 animate-pulse flex flex-col justify-between"
              >
                <div className="flex justify-between items-center">
                  <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                  <div className="w-16 h-4 bg-slate-100 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="w-20 h-6 bg-slate-200 rounded" />
                  <div className="w-32 h-3 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 h-80 animate-pulse" />
            <div className="bg-white p-6 rounded-2xl border border-slate-200 h-80 animate-pulse" />
          </div>
        </div>
      )}

      {/* Populated Dashboard Content */}
      {overview && (
        <div className="space-y-6" data-testid="dashboard-content">
          {/* Top 4 KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <MetricCard
              title="Total Active Candidates"
              value={overview.totals.totalCandidates}
              subtitle="Registered candidate profiles"
              icon={Users}
              iconColor="text-brand-600"
              iconBg="bg-brand-50"
              badge="Talent Pool"
              badgeBg="bg-brand-50"
              badgeText="text-brand-700"
            />

            <MetricCard
              title="Open Job Positions"
              value={overview.totals.openPositions}
              subtitle="Currently recruiting openings"
              icon={Briefcase}
              iconColor="text-indigo-600"
              iconBg="bg-indigo-50"
              badge="Requisitions"
              badgeBg="bg-indigo-50"
              badgeText="text-indigo-700"
            />

            <MetricCard
              title="Hired Candidates"
              value={overview.totals.hiredCandidates}
              subtitle="Distinct hired individuals"
              icon={UserCheck}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
              badge="Success"
              badgeBg="bg-emerald-50"
              badgeText="text-emerald-700"
            />

            <MetricCard
              title="Rejected Candidates"
              value={overview.totals.rejectedCandidates}
              subtitle="Distinct rejected individuals"
              icon={UserX}
              iconColor="text-rose-600"
              iconBg="bg-rose-50"
              badge="Archived"
              badgeBg="bg-rose-50"
              badgeText="text-rose-700"
            />
          </div>

          {/* Conversion Rate Highlights Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Screening Conversion
                </span>
                <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">
                  {overview.conversion.screeningRate !== null
                    ? `${(overview.conversion.screeningRate * 100).toFixed(1)}%`
                    : "—"}
                </span>
                <span className="text-[10px] text-slate-400">
                  Applied to Screening rate
                </span>
              </div>
              <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Interview Conversion
                </span>
                <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">
                  {overview.conversion.interviewRate !== null
                    ? `${(overview.conversion.interviewRate * 100).toFixed(1)}%`
                    : "—"}
                </span>
                <span className="text-[10px] text-slate-400">
                  Screening to Interview rate
                </span>
              </div>
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl shrink-0">
                <Activity className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Offer Acceptance
                </span>
                <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">
                  {overview.conversion.offerAcceptanceRate !== null
                    ? `${(overview.conversion.offerAcceptanceRate * 100).toFixed(1)}%`
                    : "—"}
                </span>
                <span className="text-[10px] text-slate-400">
                  Resolved offer rate
                </span>
              </div>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Core Visualizations: Applications by Stage & Funnel Throughput */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StageDistributionChart stageCounts={overview.applicationsByStage} />

            {funnel ? (
              <FunnelChart
                stages={funnel.stages}
                offerAcceptance={funnel.offerAcceptance}
                totalCohort={funnel.totalCohortApplications}
              />
            ) : (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-400">
                <Layers className="w-6 h-6 mr-2 opacity-40" />
                <span className="text-xs">Loading funnel analytics...</span>
              </div>
            )}
          </div>

          {/* Sourcing & Stage Duration Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SourcingChart
              sourcing={overview.sourcing}
              totalApplications={overview.totals.activeApplications}
            />

            <StageDurationCard durations={overview.averageTimeInStageMs} />
          </div>

          {/* Footer Metadata */}
          <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between text-xs text-slate-400">
            <span>
              Metrics cohort: <span className="font-medium text-slate-700">{overview.period.label}</span>
            </span>
            <span>
              Generated at {new Date(overview.generatedAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

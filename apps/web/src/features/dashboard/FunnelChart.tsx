import React from "react";
import { FunnelStageData, OfferAcceptanceData } from "../../types/analytics";
import { TrendingDown, Award, CheckCircle, Clock } from "lucide-react";

interface FunnelChartProps {
  stages: FunnelStageData[];
  offerAcceptance: OfferAcceptanceData;
  totalCohort: number;
}

const STAGE_COLORS: Record<string, string> = {
  Applied: "bg-slate-500",
  Screening: "bg-sky-500",
  Interview: "bg-purple-500",
  Offer: "bg-amber-500",
  Hired: "bg-emerald-500",
};

export const FunnelChart: React.FC<FunnelChartProps> = ({
  stages,
  offerAcceptance,
  totalCohort,
}) => {
  const maxCount = stages.length > 0 ? Math.max(...stages.map((s) => s.count), 1) : 1;

  return (
    <div
      data-testid="recruitment-funnel-chart"
      className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-600" />
            <span>Recruitment Funnel Throughput</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cohort progression from initial application to hire
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg">
          Cohort: {totalCohort} Apps
        </span>
      </div>

      {totalCohort === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm">
          <span>No cohort applications recorded for this period.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Horizontal Funnel Step Bars */}
          <div className="space-y-3">
            {stages.map((stage, idx) => {
              const widthPct = Math.max(Math.round((stage.count / maxCount) * 100), 4);
              const colorClass = STAGE_COLORS[stage.stage] || "bg-brand-500";

              return (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {idx + 1}. {stage.stage}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        ({stage.count} applications)
                      </span>
                    </div>

                    {/* Step-to-step conversion indicator */}
                    {idx > 0 && (
                      <div className="flex items-center gap-2 text-[11px]">
                        {stage.conversionRateFromPrevious !== null ? (
                          <span className="font-semibold text-emerald-600 font-mono">
                            {(stage.conversionRateFromPrevious * 100).toFixed(1)}% conv.
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}

                        {stage.dropoffRateFromPrevious !== null && stage.dropoffRateFromPrevious > 0 && (
                          <span className="text-rose-500 font-mono flex items-center gap-0.5">
                            <TrendingDown className="w-3 h-3" />
                            {(stage.dropoffRateFromPrevious * 100).toFixed(1)}% drop
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Funnel Progress Track */}
                  <div className="h-4 w-full bg-slate-100 rounded-lg overflow-hidden flex items-center">
                    <div
                      className={`h-full ${colorClass} rounded-lg transition-all duration-500`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Offer Acceptance Rate Spotlight Banner */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-50/80 to-amber-100/40 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Offer Acceptance Rate
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-200/60 text-amber-900 rounded font-semibold">
                  Resolved Only
                </span>
              </div>
              <p className="text-xs text-amber-900/80 mt-1">
                {offerAcceptance.offersAccepted} accepted / {offerAcceptance.offersAccepted + offerAcceptance.offersRejected} resolved offers
                {offerAcceptance.pendingOffers > 0 && (
                  <span className="text-slate-500 ml-1">
                    ({offerAcceptance.pendingOffers} pending excluded)
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-2xl font-bold font-mono text-amber-900">
                  {offerAcceptance.acceptanceRate !== null
                    ? `${(offerAcceptance.acceptanceRate * 100).toFixed(1)}%`
                    : "—"}
                </span>
                <span className="block text-[10px] text-amber-700/80">
                  {offerAcceptance.acceptanceRate !== null ? "Success Rate" : "No resolved offers"}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-200/80 flex items-center justify-center text-amber-800 shrink-0">
                {offerAcceptance.acceptanceRate !== null ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

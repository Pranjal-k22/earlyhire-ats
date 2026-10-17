export type PipelineStage =
  | "Applied"
  | "Screening"
  | "Interview"
  | "Offer"
  | "Hired"
  | "Rejected";

export interface SourcingItem {
  source: string;
  count: number;
  percentage: number;
}

export interface FunnelStageData {
  stage: string;
  count: number;
  conversionRateFromPrevious: number | null;
  dropoffRateFromPrevious: number | null;
}

export interface OfferAcceptanceData {
  offersExtended: number;
  offersAccepted: number;
  offersRejected: number;
  pendingOffers: number;
  acceptanceRate: number | null;
}

export interface DashboardOverviewData {
  period: {
    from: string | null;
    to: string | null;
    label: string;
  };
  totals: {
    totalCandidates: number;
    openPositions: number;
    hiredCandidates: number;
    rejectedCandidates: number;
    activeApplications: number;
  };
  applicationsByStage: Record<PipelineStage, number>;
  conversion: {
    screeningRate: number | null;
    interviewRate: number | null;
    offerAcceptanceRate: number | null;
    offerToHireRate: number | null;
  };
  sourcing: SourcingItem[];
  averageTimeInStageMs: Record<string, number | null>;
  generatedAt: string;
}

export interface FunnelData {
  period: {
    from: string | null;
    to: string | null;
    label: string;
  };
  totalCohortApplications: number;
  stages: FunnelStageData[];
  offerAcceptance: OfferAcceptanceData;
  generatedAt: string;
}

export interface AnalyticsQueryParams {
  period?: "7d" | "30d" | "90d" | "all";
  from?: string;
  to?: string;
}

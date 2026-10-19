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

export interface TrendMetric {
  percentageChange: number | null;
  direction: "up" | "down" | "neutral";
  previous: number | null;
}

export interface TimeToHireData {
  averageDays: number | null;
  averageMs: number | null;
  hiredCount: number;
}

export interface ApplicationTrendPoint {
  date: string;
  label: string;
  applications: number;
  screenings: number;
  interviews: number;
  hires: number;
}

export interface SkillItem {
  skill: string;
  count: number;
  percentage: number;
}

export interface ScoreBucket {
  range: string;
  count: number;
  percentage: number;
}

export interface JobPerformanceItem {
  jobId: string;
  title: string;
  department: string;
  status: string;
  applicationsCount: number;
  screeningCount: number;
  interviewCount: number;
  hiredCount: number;
  avgScore: number | null;
}

export interface RecentResumeItem {
  id: string;
  applicationId?: string;
  candidateId?: string;
  candidateName: string;
  jobTitle?: string;
  filename: string;
  date: string;
  score: number | null;
  status: "completed" | "processing" | "pending";
  stage?: string;
  downloadUrl?: string;
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
  // Enhanced visualization metrics
  trends?: {
    activeApplications: TrendMetric;
    hiredCandidates: TrendMetric;
  };
  timeToHire?: TimeToHireData;
  applicationTrends?: ApplicationTrendPoint[];
  topSkills?: SkillItem[];
  scoreDistribution?: ScoreBucket[];
  jobPerformance?: JobPerformanceItem[];
  recentResumes?: RecentResumeItem[];
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

export interface PlatformAnalyticsData {
  users: {
    total: number;
    distribution: Array<{ role: string; count: number; percentage: number }>;
    assignedUsers: number;
    activeRolesCount: number;
  };
  resumes: {
    total: number;
    counts: { completed: number; pending: number; failed: number };
    successRate: number;
  };
  ats: {
    totalAnalyses: number;
    averageScore: number;
    averageLatencyMs: number;
  };
  jobs: {
    total: number;
    statusCounts: Record<string, number>;
    openJobs: number;
  };
  platform: {
    totalApplications: number;
    activeSseConnections: number;
  };
  generatedAt: string;
}

export interface CandidateAnalyticsData {
  totalApplications: number;
  activeApplications: number;
  stageDistribution: Record<PipelineStage, number>;
  scheduledInterviews: number;
  resumesCount: number;
  averageAtsScore: number | null;
  generatedAt: string;
}

export interface AnalyticsQueryParams {
  period?: "7d" | "30d" | "90d" | "all";
  from?: string;
  to?: string;
  jobId?: string;
}

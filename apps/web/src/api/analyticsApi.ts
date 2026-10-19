import {
  DashboardOverviewData,
  FunnelData,
  PlatformAnalyticsData,
  CandidateAnalyticsData,
  AnalyticsQueryParams,
} from "../types/analytics";
import { API_BASE } from "./baseUrl";
import { parseApiResponse } from "./clientHelper";

function buildQueryString(params?: AnalyticsQueryParams): string {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  if (params.period) searchParams.set("period", params.period);
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.jobId) searchParams.set("jobId", params.jobId);
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchDashboardOverview(
  params?: AnalyticsQueryParams
): Promise<{ success: boolean; data: DashboardOverviewData }> {
  const qs = buildQueryString(params);
  const res = await fetch(`${API_BASE}/api/v1/analytics/overview${qs}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: DashboardOverviewData }>(
    res,
    "Failed to fetch dashboard overview"
  );
}

export async function fetchRecruitmentFunnel(
  params?: AnalyticsQueryParams
): Promise<{ success: boolean; data: FunnelData }> {
  const qs = buildQueryString(params);
  const res = await fetch(`${API_BASE}/api/v1/analytics/funnel${qs}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: FunnelData }>(
    res,
    "Failed to fetch recruitment funnel"
  );
}

export async function fetchPlatformAnalytics(): Promise<{
  success: boolean;
  data: PlatformAnalyticsData;
}> {
  const res = await fetch(`${API_BASE}/api/v1/analytics/platform`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: PlatformAnalyticsData }>(
    res,
    "Failed to fetch platform analytics"
  );
}

export async function fetchCandidateAnalytics(): Promise<{
  success: boolean;
  data: CandidateAnalyticsData;
}> {
  const res = await fetch(`${API_BASE}/api/v1/analytics/candidate`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: CandidateAnalyticsData }>(
    res,
    "Failed to fetch candidate analytics"
  );
}

/**
 * Creates an authenticated EventSource stream connected to the SSE analytics hub.
 */
export function createAnalyticsEventSource(): EventSource {
  const url = `${API_BASE}/api/v1/analytics/events`;
  return new EventSource(url, { withCredentials: true });
}

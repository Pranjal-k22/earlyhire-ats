import { DashboardOverviewData, FunnelData, AnalyticsQueryParams } from "../types/analytics";
import { API_BASE } from "./baseUrl";

function buildQueryString(params?: AnalyticsQueryParams): string {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  if (params.period) searchParams.set("period", params.period);
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
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

  if (!res.ok) {
    let msg = `HTTP error! status: ${res.status}`;
    try {
      const errBody = await res.json();
      if (errBody?.message) msg = errBody.message;
    } catch {
      // ignore JSON parse error
    }
    throw new Error(msg);
  }

  return res.json();
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

  if (!res.ok) {
    let msg = `HTTP error! status: ${res.status}`;
    try {
      const errBody = await res.json();
      if (errBody?.message) msg = errBody.message;
    } catch {
      // ignore JSON parse error
    }
    throw new Error(msg);
  }

  return res.json();
}

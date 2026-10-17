import { API_BASE } from "./baseUrl";
import { parseApiResponse } from "./clientHelper";

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string;
  canonicalRole: string;
  isActive: boolean;
  headline?: string;
  createdAt: string;
}

export interface AIUsageMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  errorRate: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  providerBreakdown: Array<{
    _id: string;
    count: number;
    successCount: number;
  }>;
}

export interface SystemIntegrationsHealth {
  database: {
    status: string;
    name: string;
  };
  aiProviders: {
    primary: string;
    fallback: string;
    gemini: { configured: boolean; model: string };
    groq: { configured: boolean; model: string };
    offlineFallback: { configured: boolean; model: string };
  };
  googleCalendar: {
    configured: boolean;
    conferenceIntegration: string;
  };
  overview: {
    activeJobs: number;
    totalApplications: number;
  };
}

export const fetchPlatformUsers = async (): Promise<{
  success: boolean;
  data: { users: PlatformUser[] };
}> => {
  const res = await fetch(`${API_BASE}/api/v1/platform/users`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: { users: PlatformUser[] } }>(res, "Failed to fetch platform users");
};

export const updatePlatformUserRole = async (
  userId: string,
  role: string
): Promise<{ success: boolean; data: { user: PlatformUser } }> => {
  const res = await fetch(`${API_BASE}/api/v1/platform/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    credentials: "include",
    body: JSON.stringify({ role }),
  });

  return parseApiResponse<{ success: boolean; data: { user: PlatformUser } }>(res, "Failed to update user role");
};

export const fetchAIUsageMetrics = async (): Promise<{
  success: boolean;
  data: AIUsageMetrics;
}> => {
  const res = await fetch(`${API_BASE}/api/v1/platform/ai-metrics`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: AIUsageMetrics }>(res, "Failed to fetch AI usage metrics");
};

export const fetchSystemIntegrationsHealth = async (): Promise<{
  success: boolean;
  data: SystemIntegrationsHealth;
}> => {
  const res = await fetch(`${API_BASE}/api/v1/platform/health`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: SystemIntegrationsHealth }>(res, "Failed to fetch system integrations health");
};

import { API_BASE } from "./baseUrl";

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
  });
  if (!res.ok) throw new Error(`Failed to fetch platform users: ${res.status}`);
  return res.json();
};

export const updatePlatformUserRole = async (
  userId: string,
  role: string
): Promise<{ success: boolean; data: { user: PlatformUser } }> => {
  const res = await fetch(`${API_BASE}/api/v1/platform/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to update user role: ${res.status}`);
  }
  return res.json();
};

export const fetchAIUsageMetrics = async (): Promise<{
  success: boolean;
  data: AIUsageMetrics;
}> => {
  const res = await fetch(`${API_BASE}/api/v1/platform/ai-metrics`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch AI usage metrics: ${res.status}`);
  return res.json();
};

export const fetchSystemIntegrationsHealth = async (): Promise<{
  success: boolean;
  data: SystemIntegrationsHealth;
}> => {
  const res = await fetch(`${API_BASE}/api/v1/platform/health`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch system integrations health: ${res.status}`);
  return res.json();
};

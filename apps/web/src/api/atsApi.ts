import { API_BASE } from "./baseUrl";

export interface AtsReport {
  id: string;
  overallScore: number;
  breakdown: {
    skillsScore: number;
    experienceScore: number;
    educationScore: number;
    roleRelevanceScore: number;
  };
  requiredSkillsFound: string[];
  missingCriteria: string[];
  experienceEvidence: string[];
  concreteSuggestions: string[];
  suggestedInterviewTopics: string[];
  confidence: "low" | "medium" | "high";
  summary: string;
  provider: string;
  model: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  createdAt: string;
  jobId?: {
    id: string;
    title: string;
    department: string;
    location: string;
    status: string;
  };
}

export const analyzeResume = async (params: {
  jobId: string;
  resumeId?: string;
  forceRefresh?: boolean;
}): Promise<{ success: boolean; data: { analysis: AtsReport } }> => {
  const res = await fetch(`${API_BASE}/api/v1/ats/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `ATS analysis failed: ${res.status}`);
  }

  return res.json();
};

export const fetchMyAnalyses = async (): Promise<{ success: boolean; data: { analyses: AtsReport[] } }> => {
  const res = await fetch(`${API_BASE}/api/v1/ats/my`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch analyses: ${res.status}`);
  return res.json();
};

export const fetchAnalysesForJob = async (
  jobId: string
): Promise<{ success: boolean; data: { analyses: AtsReport[] } }> => {
  const res = await fetch(`${API_BASE}/api/v1/ats/job/${jobId}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch job analyses: ${res.status}`);
  return res.json();
};

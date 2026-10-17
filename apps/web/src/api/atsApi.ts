import { API_BASE } from "./baseUrl";
import { parseApiResponse } from "./clientHelper";

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
  resumeId?: string | {
    id: string;
    originalFilename?: string;
    createdAt?: string;
  };
  jobId?: string | {
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
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });

  return parseApiResponse<{ success: boolean; data: { analysis: AtsReport } }>(res, "ATS analysis failed");
};

export const fetchMyAnalyses = async (): Promise<{ success: boolean; data: { analyses: AtsReport[] } }> => {
  const res = await fetch(`${API_BASE}/api/v1/ats/my`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: { analyses: AtsReport[] } }>(res, "Failed to fetch analyses");
};

export const fetchAnalysesForJob = async (
  jobId: string
): Promise<{ success: boolean; data: { analyses: AtsReport[] } }> => {
  const res = await fetch(`${API_BASE}/api/v1/ats/job/${jobId}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: { analyses: AtsReport[] } }>(res, "Failed to fetch job analyses");
};

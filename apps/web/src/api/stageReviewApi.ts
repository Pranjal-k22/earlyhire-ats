import { API_BASE } from "./baseUrl";
import { parseApiResponse } from "./clientHelper";

export interface StageReview {
  id: string;
  applicationId: string;
  stage: string;
  reviewType: string;
  suitabilityScore?: number;
  aiSummary: string;
  suggestedQuestions: Array<{
    question: string;
    purpose: string;
    expectedSignal?: string;
  }>;
  rubricCriteria: string[];
  strengths: string[];
  gapsOrRisks: string[];
  recommendedDecision: "advance" | "hold" | "reject_suggested";
  status: "pending" | "completed" | "failed";
  provider: string;
  model: string;
  humanDecision?: {
    decision: "advance" | "hold" | "reject";
    actorName: string;
    notes: string;
    decidedAt: string;
  } | null;
}

export const fetchOrGenerateStageReview = async (
  applicationId: string
): Promise<{ success: boolean; data: { review: StageReview } }> => {
  const res = await fetch(`${API_BASE}/api/v1/stage-reviews/application/${applicationId}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: { review: StageReview } }>(res, "Failed to fetch stage review");
};

export const recordHumanDecision = async (
  reviewId: string,
  decision: "advance" | "hold" | "reject",
  notes: string
): Promise<{ success: boolean; data: { review: StageReview } }> => {
  const res = await fetch(`${API_BASE}/api/v1/stage-reviews/${reviewId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    credentials: "include",
    body: JSON.stringify({ decision, notes }),
  });

  return parseApiResponse<{ success: boolean; data: { review: StageReview } }>(res, "Failed to record decision");
};

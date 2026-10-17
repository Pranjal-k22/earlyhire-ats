import { API_BASE } from "./baseUrl";

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
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch stage review: ${res.status}`);
  }
  return res.json();
};

export const recordHumanDecision = async (
  reviewId: string,
  decision: "advance" | "hold" | "reject",
  notes: string
): Promise<{ success: boolean; data: { review: StageReview } }> => {
  const res = await fetch(`${API_BASE}/api/v1/stage-reviews/${reviewId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ decision, notes }),
  });
  if (!res.ok) throw new Error(`Failed to record decision: ${res.status}`);
  return res.json();
};

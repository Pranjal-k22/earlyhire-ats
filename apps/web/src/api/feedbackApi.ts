import { API_BASE } from "./baseUrl";

export interface FeedbackSubmission {
  interviewId: string;
  applicationId: string;
  ratings: {
    technicalRating: number;
    communicationRating: number;
    problemSolvingRating: number;
    cultureAndValuesRating: number;
    overallRating: number;
  };
  strengths: string;
  concerns: string;
  internalNotes: string;
  candidateReleasableFeedback: string;
  recommendation: "strong_hire" | "hire" | "hold" | "no_hire";
}

export interface FeedbackItem {
  id: string;
  interviewerName?: string;
  ratings?: {
    technicalRating: number;
    communicationRating: number;
    problemSolvingRating: number;
    cultureAndValuesRating: number;
    overallRating: number;
  };
  strengths?: string;
  concerns?: string;
  internalNotes?: string;
  candidateReleasableFeedback?: string;
  feedback?: string; // Released view property for candidates
  isReleasedToCandidate?: boolean;
  releasedAt?: string | null;
  createdAt: string;
  recommendation?: string;
}

export const submitFeedback = async (
  payload: FeedbackSubmission
): Promise<{ success: boolean; data: { feedback: FeedbackItem } }> => {
  const res = await fetch(`${API_BASE}/api/v1/feedback/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Feedback submission failed: ${res.status}`);
  }

  return res.json();
};

export const fetchFeedbackForApplication = async (
  applicationId: string
): Promise<{ success: boolean; data: { feedbacks: FeedbackItem[] } }> => {
  const res = await fetch(`${API_BASE}/api/v1/feedback/application/${applicationId}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch feedback: ${res.status}`);
  return res.json();
};

export const releaseFeedback = async (
  feedbackId: string
): Promise<{ success: boolean; data: { released: boolean; feedback: FeedbackItem } }> => {
  const res = await fetch(`${API_BASE}/api/v1/feedback/${feedbackId}/release`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to release feedback: ${res.status}`);
  return res.json();
};

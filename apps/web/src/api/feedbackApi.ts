import { API_BASE } from "./baseUrl";
import { parseApiResponse } from "./clientHelper";

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
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return parseApiResponse<{ success: boolean; data: { feedback: FeedbackItem } }>(res, "Feedback submission failed");
};

export const fetchFeedbackForApplication = async (
  applicationId: string
): Promise<{ success: boolean; data: { feedbacks: FeedbackItem[] } }> => {
  const res = await fetch(`${API_BASE}/api/v1/feedback/application/${applicationId}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: { feedbacks: FeedbackItem[] } }>(res, "Failed to fetch feedback");
};

export const releaseFeedback = async (
  feedbackId: string
): Promise<{ success: boolean; data: { released: boolean; feedback: FeedbackItem } }> => {
  const res = await fetch(`${API_BASE}/api/v1/feedback/${feedbackId}/release`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: { released: boolean; feedback: FeedbackItem } }>(res, "Failed to release feedback");
};

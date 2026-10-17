import { API_BASE } from "./baseUrl";
import { parseApiResponse } from "./clientHelper";

export interface InterviewItem {
  id: string;
  applicationId: string;
  title: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  timezone: string;
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
  googleMeetLink?: string | null;
  manualMeetingLink?: string | null;
  meetingType: "google_meet" | "manual_link" | "in_person";
  notes?: string;
  cancellationReason?: string | null;
  createdAt: string;
  jobId?: {
    id: string;
    title: string;
    department: string;
    location: string;
  };
}

export const scheduleInterview = async (payload: {
  applicationId: string;
  title: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  timezone?: string;
  meetingType?: "google_meet" | "manual_link" | "in_person";
  manualMeetingLink?: string;
  notes?: string;
  interviewers?: Array<{ name: string; email: string }>;
}): Promise<{ success: boolean; data: { interview: InterviewItem } }> => {
  const res = await fetch(`${API_BASE}/api/v1/interviews/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return parseApiResponse<{ success: boolean; data: { interview: InterviewItem } }>(res, "Failed to schedule interview");
};

export const fetchMyInterviews = async (): Promise<{ success: boolean; data: { interviews: InterviewItem[] } }> => {
  const res = await fetch(`${API_BASE}/api/v1/interviews/my`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: { interviews: InterviewItem[] } }>(res, "Failed to fetch interviews");
};

export const fetchInterviewsForApplication = async (
  applicationId: string
): Promise<{ success: boolean; data: { interviews: InterviewItem[] } }> => {
  const res = await fetch(`${API_BASE}/api/v1/interviews/application/${applicationId}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: { interviews: InterviewItem[] } }>(res, "Failed to fetch interviews");
};

export const cancelInterview = async (
  id: string,
  reason: string
): Promise<{ success: boolean; data: { interview: InterviewItem } }> => {
  const res = await fetch(`${API_BASE}/api/v1/interviews/${id}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    credentials: "include",
    body: JSON.stringify({ reason }),
  });

  return parseApiResponse<{ success: boolean; data: { interview: InterviewItem } }>(res, "Failed to cancel interview");
};

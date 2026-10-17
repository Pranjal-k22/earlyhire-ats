import { API_BASE } from "./baseUrl";
import { parseApiResponse } from "./clientHelper";

export interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  canonicalRole: "candidate" | "hiring_team" | "platform_manager";
  headline: string;
  phone: string;
  bio: string;
  skills: string[];
  resumeId: string | null;
  candidateProfileId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const fetchProfile = async (): Promise<{ success: boolean; data: { user: CandidateProfile } }> => {
  const res = await fetch(`${API_BASE}/api/v1/profile`, {
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    credentials: "include",
  });
  return parseApiResponse<{ success: boolean; data: { user: CandidateProfile } }>(res, "Failed to fetch profile");
};

export const updateProfile = async (
  payload: Partial<Pick<CandidateProfile, "name" | "headline" | "phone" | "bio" | "skills">>
): Promise<{ success: boolean; data: { user: CandidateProfile } }> => {
  const res = await fetch(`${API_BASE}/api/v1/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return parseApiResponse<{ success: boolean; data: { user: CandidateProfile } }>(res, "Failed to update profile");
};

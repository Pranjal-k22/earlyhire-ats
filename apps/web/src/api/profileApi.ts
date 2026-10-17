import { API_BASE } from "./baseUrl";

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
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch profile: ${res.status}`);
  return res.json();
};

export const updateProfile = async (
  payload: Partial<Pick<CandidateProfile, "name" | "headline" | "phone" | "bio" | "skills">>
): Promise<{ success: boolean; data: { user: CandidateProfile } }> => {
  const res = await fetch(`${API_BASE}/api/v1/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update profile: ${res.status}`);
  return res.json();
};

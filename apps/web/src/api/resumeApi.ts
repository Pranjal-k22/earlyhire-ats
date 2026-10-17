import { API_BASE } from "./baseUrl";
import { parseApiResponse } from "./clientHelper";

export interface ResumeItem {
  id: string;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  parsingStatus: "pending" | "completed" | "failed";
  parsingError?: string | null;
  parsedText?: string;
  contentSha256: string;
  createdAt: string;
}

export const uploadResume = async (file: File): Promise<{ success: boolean; data: { resume: ResumeItem } }> => {
  const formData = new FormData();
  formData.append("resume", file);

  const res = await fetch(`${API_BASE}/api/v1/resumes/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  return parseApiResponse<{ success: boolean; data: { resume: ResumeItem } }>(res, "Upload failed");
};

export const fetchMyResumes = async (): Promise<{ success: boolean; data: { resumes: ResumeItem[] } }> => {
  const res = await fetch(`${API_BASE}/api/v1/resumes/my`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: { resumes: ResumeItem[] } }>(res, "Failed to fetch resumes");
};

export const deleteResume = async (id: string): Promise<{ success: boolean; data: { deleted: boolean } }> => {
  const res = await fetch(`${API_BASE}/api/v1/resumes/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: { deleted: boolean } }>(res, "Failed to delete resume");
};

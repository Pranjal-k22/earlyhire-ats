import { API_BASE } from "./baseUrl";

export interface ResumeItem {
  id: string;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  parsingStatus: "pending" | "completed" | "failed";
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

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Upload failed with status ${res.status}`);
  }

  return res.json();
};

export const fetchMyResumes = async (): Promise<{ success: boolean; data: { resumes: ResumeItem[] } }> => {
  const res = await fetch(`${API_BASE}/api/v1/resumes/my`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch resumes: ${res.status}`);
  return res.json();
};

export const deleteResume = async (id: string): Promise<{ success: boolean; data: { deleted: boolean } }> => {
  const res = await fetch(`${API_BASE}/api/v1/resumes/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to delete resume: ${res.status}`);
  return res.json();
};

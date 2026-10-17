import { JobListResponse, SingleJobResponse, JobFormData } from "../types/job";
import { API_BASE } from "./baseUrl";
import { parseApiResponse } from "./clientHelper";

export const fetchJobs = async (params: {
  search?: string;
  status?: string;
  department?: string;
  location?: string;
  employmentType?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  limit?: number;
  includeArchived?: boolean;
} = {}): Promise<JobListResponse> => {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.department) query.set("department", params.department);
  if (params.location) query.set("location", params.location);
  if (params.employmentType) query.set("employmentType", params.employmentType);
  if (params.createdFrom) query.set("createdFrom", params.createdFrom);
  if (params.createdTo) query.set("createdTo", params.createdTo);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.includeArchived) query.set("includeArchived", "true");

  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/v1/jobs${qs}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept": "application/json",
    },
  });

  return parseApiResponse<JobListResponse>(res, "Failed to fetch jobs");
};

export const fetchJobById = async (id: string): Promise<SingleJobResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/jobs/${id}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept": "application/json",
    },
  });

  return parseApiResponse<SingleJobResponse>(res, "Failed to fetch job");
};

export const createJob = async (data: JobFormData): Promise<SingleJobResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/jobs`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(data),
  });

  return parseApiResponse<SingleJobResponse>(res, "Failed to create job");
};

export const updateJob = async (id: string, data: Partial<JobFormData>): Promise<SingleJobResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/jobs/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(data),
  });

  return parseApiResponse<SingleJobResponse>(res, "Failed to update job");
};

export const archiveJob = async (id: string): Promise<SingleJobResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/jobs/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Accept": "application/json",
    },
  });

  return parseApiResponse<SingleJobResponse>(res, "Failed to archive job");
};

import { JobListResponse, SingleJobResponse, JobFormData } from "../types/job";

export const fetchJobs = async (params: {
  search?: string;
  status?: string;
  department?: string;
  page?: number;
  limit?: number;
  includeArchived?: boolean;
} = {}): Promise<JobListResponse> => {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.department) query.set("department", params.department);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.includeArchived) query.set("includeArchived", "true");

  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await fetch(`/api/v1/jobs${qs}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept": "application/json",
    },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `Failed to fetch jobs (HTTP ${res.status})`);
  }

  return body;
};

export const fetchJobById = async (id: string): Promise<SingleJobResponse> => {
  const res = await fetch(`/api/v1/jobs/${id}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept": "application/json",
    },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `Failed to fetch job (HTTP ${res.status})`);
  }

  return body;
};

export const createJob = async (data: JobFormData): Promise<SingleJobResponse> => {
  const res = await fetch("/api/v1/jobs", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `Failed to create job (HTTP ${res.status})`);
  }

  return body;
};

export const updateJob = async (id: string, data: Partial<JobFormData>): Promise<SingleJobResponse> => {
  const res = await fetch(`/api/v1/jobs/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `Failed to update job (HTTP ${res.status})`);
  }

  return body;
};

export const archiveJob = async (id: string): Promise<SingleJobResponse> => {
  const res = await fetch(`/api/v1/jobs/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Accept": "application/json",
    },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `Failed to archive job (HTTP ${res.status})`);
  }

  return body;
};

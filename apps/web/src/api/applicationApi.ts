import {
  ApplicationListResponse,
  SingleApplicationResponse,
  ApplicationHistoryResponse,
  HiringStage,
} from "../types/application";

export const fetchApplications = async (
  params: {
    page?: number;
    limit?: number;
    jobId?: string;
    candidateId?: string;
    stage?: HiringStage;
    status?: string;
    sort?: string;
    order?: "asc" | "desc";
  } = {}
): Promise<ApplicationListResponse> => {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.jobId && params.jobId !== "all") query.set("jobId", params.jobId);
  if (params.candidateId) query.set("candidateId", params.candidateId);
  if (params.stage && (params.stage as string) !== "all") query.set("stage", params.stage);
  if (params.status) query.set("status", params.status);
  if (params.sort) query.set("sort", params.sort);
  if (params.order) query.set("order", params.order);

  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await fetch(`/api/v1/applications${qs}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `Failed to fetch applications (HTTP ${res.status})`);
  }

  return body;
};

export const fetchApplicationById = async (
  id: string
): Promise<SingleApplicationResponse> => {
  const res = await fetch(`/api/v1/applications/${id}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `Failed to fetch application (HTTP ${res.status})`);
  }

  return body;
};

export const createApplication = async (data: {
  candidateId: string;
  jobId: string;
  source?: string;
}): Promise<SingleApplicationResponse> => {
  const res = await fetch("/api/v1/applications", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `Failed to create application (HTTP ${res.status})`);
  }

  return body;
};

export const transitionApplicationStage = async (
  id: string,
  data: {
    toStage: HiringStage;
    reason?: string;
    expectedStage?: HiringStage;
    expectedVersion?: number;
  }
): Promise<SingleApplicationResponse> => {
  const res = await fetch(`/api/v1/applications/${id}/stage`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `Failed to transition stage (HTTP ${res.status})`);
  }

  return body;
};

export const fetchApplicationHistory = async (
  id: string
): Promise<ApplicationHistoryResponse> => {
  const res = await fetch(`/api/v1/applications/${id}/history`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `Failed to fetch stage history (HTTP ${res.status})`);
  }

  return body;
};

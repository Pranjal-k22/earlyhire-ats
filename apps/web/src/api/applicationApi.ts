import {
  ApplicationListResponse,
  SingleApplicationResponse,
  ApplicationHistoryResponse,
  CandidateComparisonResponse,
  HiringStage,
  IAtsSnapshot,
} from "../types/application";
import { API_BASE } from "./baseUrl";
import { parseApiResponse } from "./clientHelper";

export const fetchApplications = async (
  params: {
    page?: number;
    limit?: number;
    jobId?: string;
    candidateId?: string;
    stage?: HiringStage;
    status?: string;
    search?: string;
    appliedFrom?: string;
    appliedTo?: string;
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
  if (params.search) query.set("search", params.search);
  if (params.appliedFrom) query.set("appliedFrom", params.appliedFrom);
  if (params.appliedTo) query.set("appliedTo", params.appliedTo);
  if (params.sort) query.set("sort", params.sort);
  if (params.order) query.set("order", params.order);

  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/v1/applications${qs}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<ApplicationListResponse>(res, "Failed to fetch applications");
};

export const fetchApplicationById = async (
  id: string
): Promise<SingleApplicationResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/applications/${id}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<SingleApplicationResponse>(res, "Failed to fetch application");
};

export const createApplication = async (data: {
  candidateId: string;
  jobId: string;
  source?: string;
}): Promise<SingleApplicationResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/applications`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  return parseApiResponse<SingleApplicationResponse>(res, "Failed to create application");
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
  const res = await fetch(`${API_BASE}/api/v1/applications/${id}/stage`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  return parseApiResponse<SingleApplicationResponse>(res, "Failed to transition stage");
};

export const fetchApplicationHistory = async (
  id: string
): Promise<ApplicationHistoryResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/applications/${id}/history`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<ApplicationHistoryResponse>(res, "Failed to fetch stage history");
};

export const applyForJobApi = async (data: {
  jobId: string;
  resumeId?: string;
  notes?: string;
  source?: string;
}): Promise<SingleApplicationResponse & { data: { atsSnapshot: IAtsSnapshot | null } }> => {
  const res = await fetch(`${API_BASE}/api/v1/applications/apply`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  return parseApiResponse<SingleApplicationResponse & { data: { atsSnapshot: IAtsSnapshot | null } }>(
    res,
    "Failed to submit application"
  );
};

export const fetchApplicationComparison = async (
  id: string
): Promise<CandidateComparisonResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/applications/${id}/comparison`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<CandidateComparisonResponse>(
    res,
    "Failed to fetch candidate comparison"
  );
};


import {
  CandidateListResponse,
  SingleCandidateResponse,
  CandidateFormData,
} from "../types/candidate";
import { API_BASE } from "./baseUrl";
import { parseApiResponse } from "./clientHelper";

export const fetchCandidates = async (
  params: {
    page?: number;
    limit?: number;
    search?: string;
    skill?: string;
    source?: string;
    createdFrom?: string;
    createdTo?: string;
    includeArchived?: boolean;
    experienceMin?: number;
    experienceMax?: number;
    sort?: string;
    order?: "asc" | "desc";
  } = {}
): Promise<CandidateListResponse> => {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.skill) query.set("skill", params.skill);
  if (params.source && params.source !== "all") query.set("source", params.source);
  if (params.createdFrom) query.set("createdFrom", params.createdFrom);
  if (params.createdTo) query.set("createdTo", params.createdTo);
  if (params.experienceMin !== undefined) query.set("experienceMin", String(params.experienceMin));
  if (params.experienceMax !== undefined) query.set("experienceMax", String(params.experienceMax));
  if (params.includeArchived) query.set("includeArchived", "true");
  if (params.sort) query.set("sort", params.sort);
  if (params.order) query.set("order", params.order);

  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/v1/candidates${qs}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<CandidateListResponse>(res, "Failed to fetch candidates");
};

export const fetchCandidateById = async (id: string): Promise<SingleCandidateResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/candidates/${id}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<SingleCandidateResponse>(res, "Failed to fetch candidate");
};

export const createCandidate = async (
  data: CandidateFormData
): Promise<SingleCandidateResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/candidates`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  return parseApiResponse<SingleCandidateResponse>(res, "Failed to create candidate");
};

export const updateCandidate = async (
  id: string,
  data: Partial<CandidateFormData>
): Promise<SingleCandidateResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/candidates/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  return parseApiResponse<SingleCandidateResponse>(res, "Failed to update candidate");
};

export const archiveCandidate = async (id: string): Promise<SingleCandidateResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/candidates/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<SingleCandidateResponse>(res, "Failed to archive candidate");
};

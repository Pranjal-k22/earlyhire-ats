import {
  CandidateListResponse,
  SingleCandidateResponse,
  CandidateFormData,
} from "../types/candidate";

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
  if (params.includeArchived) query.set("includeArchived", "true");
  if (params.sort) query.set("sort", params.sort);
  if (params.order) query.set("order", params.order);

  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await fetch(`/api/v1/candidates${qs}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `Failed to fetch candidates (HTTP ${res.status})`);
  }

  return body;
};

export const fetchCandidateById = async (id: string): Promise<SingleCandidateResponse> => {
  const res = await fetch(`/api/v1/candidates/${id}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `Failed to fetch candidate (HTTP ${res.status})`);
  }

  return body;
};

export const createCandidate = async (
  data: CandidateFormData
): Promise<SingleCandidateResponse> => {
  const res = await fetch("/api/v1/candidates", {
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
    throw new Error(body?.error?.message || `Failed to create candidate (HTTP ${res.status})`);
  }

  return body;
};

export const updateCandidate = async (
  id: string,
  data: Partial<CandidateFormData>
): Promise<SingleCandidateResponse> => {
  const res = await fetch(`/api/v1/candidates/${id}`, {
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
    throw new Error(body?.error?.message || `Failed to update candidate (HTTP ${res.status})`);
  }

  return body;
};

export const archiveCandidate = async (id: string): Promise<SingleCandidateResponse> => {
  const res = await fetch(`/api/v1/candidates/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `Failed to archive candidate (HTTP ${res.status})`);
  }

  return body;
};

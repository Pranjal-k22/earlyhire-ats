import { NoteListResponse, SingleNoteResponse, DeleteNoteResponse } from "../types/note";
import { API_BASE } from "./baseUrl";
import { parseApiResponse } from "./clientHelper";

export const fetchCandidateNotes = async (
  candidateId: string,
  params: { page?: number; limit?: number; order?: "asc" | "desc" } = {}
): Promise<NoteListResponse> => {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.order) query.set("order", params.order);

  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/v1/candidates/${candidateId}/notes${qs}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<NoteListResponse>(res, "Failed to fetch notes");
};

export const createCandidateNote = async (
  candidateId: string,
  noteData: { body: string }
): Promise<SingleNoteResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/candidates/${candidateId}/notes`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(noteData),
  });

  return parseApiResponse<SingleNoteResponse>(res, "Failed to create note");
};

export const deleteCandidateNote = async (
  noteId: string,
  candidateId?: string
): Promise<DeleteNoteResponse> => {
  const url = candidateId
    ? `${API_BASE}/api/v1/candidates/${candidateId}/notes/${noteId}`
    : `${API_BASE}/api/v1/notes/${noteId}`;

  const res = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<DeleteNoteResponse>(res, "Failed to delete note");
};

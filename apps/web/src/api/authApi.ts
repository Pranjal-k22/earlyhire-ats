import { AuthResponse, LoginPayload, SignupPayload, RecruiterSignupPayload } from "../types/auth";
import { API_BASE } from "./baseUrl";
import { parseApiResponse } from "./clientHelper";

export interface GoogleCalendarStatusResponse {
  success: boolean;
  data: {
    isConfiguredOnServer: boolean;
    connected: boolean;
    email: string | null;
    connectedAt: string | null;
    scope: string | null;
  };
}

export const signup = async (payload: SignupPayload): Promise<AuthResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/auth/signup`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse<AuthResponse>(res, "Signup failed");
};

export const signupRecruiter = async (payload: RecruiterSignupPayload): Promise<AuthResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/auth/signup/recruiter`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse<AuthResponse>(res, "Recruiter registration failed");
};

export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse<AuthResponse>(res, "Login failed");
};

export const logout = async (): Promise<{ success: boolean; data: { loggedOut: boolean } }> => {
  const res = await fetch(`${API_BASE}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept": "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: { loggedOut: boolean } }>(res, "Logout failed");
};

export const fetchMe = async (): Promise<AuthResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept": "application/json",
    },
  });

  return parseApiResponse<AuthResponse>(res, "Authentication required");
};

export const fetchGoogleCalendarStatus = async (): Promise<GoogleCalendarStatusResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/auth/google/status`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept": "application/json",
    },
  });

  return parseApiResponse<GoogleCalendarStatusResponse>(res, "Failed to fetch calendar status");
};

export const getGoogleAuthUrl = async (): Promise<{ success: boolean; data: { url: string; state: string } }> => {
  const res = await fetch(`${API_BASE}/api/v1/auth/google?json=true`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept": "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: { url: string; state: string } }>(res, "Failed to initiate Google authorization");
};

export const disconnectGoogleCalendar = async (): Promise<{ success: boolean; data: { disconnected: boolean } }> => {
  const res = await fetch(`${API_BASE}/api/v1/auth/google/disconnect`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept": "application/json",
    },
  });

  return parseApiResponse<{ success: boolean; data: { disconnected: boolean } }>(res, "Failed to disconnect Google Calendar");
};

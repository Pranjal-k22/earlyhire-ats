import { AuthResponse, LoginPayload, SignupPayload } from "../types/auth";
import { API_BASE } from "./baseUrl";
import { parseApiResponse } from "./clientHelper";

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

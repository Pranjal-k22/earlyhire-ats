import { AuthResponse, LoginPayload, SignupPayload } from "../types/auth";
import { API_BASE } from "./baseUrl";

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

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `Signup failed (HTTP ${res.status})`);
  }

  return body;
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

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `Login failed (HTTP ${res.status})`);
  }

  return body;
};

export const logout = async (): Promise<{ success: boolean; data: { loggedOut: boolean } }> => {
  const res = await fetch(`${API_BASE}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept": "application/json",
    },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `Logout failed (HTTP ${res.status})`);
  }

  return body;
};

export const fetchMe = async (): Promise<AuthResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept": "application/json",
    },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || `Authentication required (HTTP ${res.status})`);
  }

  return body;
};

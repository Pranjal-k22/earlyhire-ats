export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  canonicalRole?: "candidate" | "hiring_team" | "platform_manager";
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
  };
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

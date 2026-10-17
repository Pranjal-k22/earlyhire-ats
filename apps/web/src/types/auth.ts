export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "recruiter" | "hiring_manager";
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
}

export interface LoginPayload {
  email: string;
  password: string;
}

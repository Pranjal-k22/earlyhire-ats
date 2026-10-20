export type UserApprovalStatus = "pending" | "approved" | "rejected";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  canonicalRole?: "candidate" | "hiring_team" | "platform_manager";
  company?: string;
  department?: string;
  approvalStatus?: UserApprovalStatus;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    requiresApproval?: boolean;
    message?: string;
  };
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface RecruiterSignupPayload {
  name: string;
  email: string;
  password: string;
  company: string;
  department?: string;
  headline?: string;
  phone?: string;
  inviteCode?: string;
  role?: "recruiter" | "hiring_team";
}

export interface LoginPayload {
  email: string;
  password: string;
}

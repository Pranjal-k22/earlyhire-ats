export type CandidateSource =
  | "Referral"
  | "LinkedIn"
  | "CompanyWebsite"
  | "JobBoard"
  | "Agency"
  | "Other";

export interface CandidateUserRef {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Candidate {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  phone?: string;
  location?: string;
  currentTitle?: string;
  experienceYears: number;
  skills: string[];
  resumeUrl?: string | null;
  source: CandidateSource;
  summary?: string;
  createdBy?: CandidateUserRef;
  updatedBy?: CandidateUserRef;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateFormData {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  currentTitle?: string;
  experienceYears: number;
  skills: string[];
  resumeUrl?: string | null;
  source: CandidateSource;
  summary?: string;
}

export interface CandidateListResponse {
  success: boolean;
  data: Candidate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleCandidateResponse {
  success: boolean;
  data: {
    candidate: Candidate;
    archived?: boolean;
  };
}

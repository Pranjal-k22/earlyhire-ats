export type JobStatus = "Open" | "Paused" | "Closed" | "Archived";
export type EmploymentType = "FullTime" | "PartTime" | "Contract" | "Internship";

export interface JobOwner {
  id?: string;
  name: string;
  email: string;
  role?: string;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  description: string;
  requirements: string[];
  experienceMin: number;
  experienceMax?: number;
  status: JobStatus;
  ownerId?: JobOwner | string;
  openedAt: string;
  closesAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface JobListResponse {
  success: boolean;
  data: Job[];
  pagination: JobPagination;
}

export interface SingleJobResponse {
  success: boolean;
  data: {
    job: Job;
    archived?: boolean;
  };
}

export interface JobFormData {
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  description: string;
  requirements: string[];
  experienceMin: number;
  experienceMax?: number;
  status: JobStatus;
  closesAt?: string | null;
}

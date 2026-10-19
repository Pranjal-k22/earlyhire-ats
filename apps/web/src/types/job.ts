export type JobStatus = "Open" | "Paused" | "Closed" | "Archived";
export type EmploymentType = "FullTime" | "PartTime" | "Contract" | "Internship";

export interface JobOwner {
  id?: string;
  name: string;
  email: string;
  role?: string;
}

export interface JobPipelineCounts {
  total: number;
  Applied: number;
  Screening: number;
  Interview: number;
  Offer: number;
  Hired: number;
  Rejected: number;
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
  pipelineCounts?: JobPipelineCounts;
  openedAt: string;
  closesAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobPipelineStats {
  jobId: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  status: JobStatus;
  owner?: JobOwner | string;
  totalApplications: number;
  stages: JobPipelineCounts;
  interviews: {
    scheduled: number;
    completed: number;
    cancelled: number;
    rescheduled: number;
  };
  offers: {
    Draft: number;
    PendingApproval: number;
    Approved: number;
    Extended: number;
    Accepted: number;
    Declined: number;
  };
}

export interface JobPipelineStatsResponse {
  success: boolean;
  data: JobPipelineStats;
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

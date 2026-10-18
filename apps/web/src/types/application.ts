import { Candidate } from "./candidate";
import { Job } from "./job";

export const HIRING_STAGES = [
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
] as const;

export type HiringStage = (typeof HIRING_STAGES)[number];

export type ApplicationStatus = "Active" | "Withdrawn" | "Archived";

export interface ApplicationUserRef {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface IAtsSnapshot {
  overallScore: number;
  breakdown: {
    skillsScore: number;
    experienceScore: number;
    educationScore: number;
    roleRelevanceScore: number;
  };
  status:
    | "dual_complete"
    | "partial_ollama"
    | "partial_gemini"
    | "completed"
    | "in_progress"
    | "pending"
    | "failed";
  provider: string;
  model: string;
  resumeVersion: number;
  resumeContentHash?: string | null;
  jobContentHash?: string | null;
  promptVersion: string;
  rubricVersion: string;
  assessedAt: string;
  reportRef?: string | null;
  matchedSkills?: string[];
  missingCriteria?: string[];
}

export interface Application {
  id: string;
  candidateId: Candidate;
  jobId: Job;
  recruiterId?: ApplicationUserRef;
  resumeId?: {
    id: string;
    originalFilename?: string;
    fileSizeBytes?: number;
    version?: number;
    createdAt?: string;
  } | null;
  atsAnalysisId?: {
    id: string;
    overallScore: number;
    breakdown: Record<string, number>;
    summary?: string;
    provider?: string;
    model?: string;
    status?: string;
  } | null;
  atsSnapshot?: IAtsSnapshot | null;
  stage: HiringStage;
  currentStage: HiringStage;
  status: ApplicationStatus;
  appliedAt: string;
  lastStageChangedAt: string;
  rejectedAt?: string | null;
  hiredAt?: string | null;
  source?: string;
  createdBy?: ApplicationUserRef;
  updatedBy?: ApplicationUserRef;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewStageHistoryItem {
  id: string;
  applicationId: string;
  fromStage: HiringStage | null;
  toStage: HiringStage;
  actorId: ApplicationUserRef;
  changedAt: string;
  reason?: string | null;
  durationMsFromPreviousStage?: number | null;
}

export interface ApplicationListResponse {
  success: boolean;
  data: {
    applications: Application[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface SingleApplicationResponse {
  success: boolean;
  data: {
    application: Application;
    candidate?: Candidate;
    job?: Job;
    historyEvent?: InterviewStageHistoryItem;
  };
}

export interface ApplicationHistoryResponse {
  success: boolean;
  data: {
    history: InterviewStageHistoryItem[];
  };
}

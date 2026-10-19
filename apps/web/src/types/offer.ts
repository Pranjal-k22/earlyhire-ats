export type OfferStatus =
  | "Draft"
  | "PendingApproval"
  | "Approved"
  | "Extended"
  | "Accepted"
  | "Declined"
  | "Expired"
  | "Withdrawn";

export interface Offer {
  id: string;
  applicationId:
    | string
    | { id: string; currentStage?: string; stage?: string; appliedAt?: string };
  jobId:
    | string
    | { id: string; title: string; department?: string; location?: string; employmentType?: string };
  candidateId: string;
  candidateUserId: string;
  createdBy: { id?: string; name: string; email: string };
  approvedBy?: { id?: string; name: string; email: string } | null;
  title: string;
  salary: number;
  currency: string;
  employmentType: "FullTime" | "PartTime" | "Contract" | "Internship";
  location: string;
  startDate?: string | null;
  expiryDate?: string | null;
  status: OfferStatus;
  notes?: string;
  candidateResponseNotes?: string;
  respondedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SingleOfferResponse {
  success: boolean;
  data: {
    offer: Offer | null;
  };
}

export interface OfferListResponse {
  success: boolean;
  data: {
    offers: Offer[];
  };
}

export interface CreateOfferPayload {
  applicationId: string;
  title: string;
  salary: number;
  currency?: string;
  employmentType?: "FullTime" | "PartTime" | "Contract" | "Internship";
  location?: string;
  startDate?: string;
  expiryDate?: string;
  notes?: string;
}

export interface RespondOfferPayload {
  response: "Accepted" | "Declined";
  notes?: string;
}

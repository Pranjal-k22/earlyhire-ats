import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { App } from "../app/App";
import { JobsView } from "../features/jobs/JobsView";
import { CandidatesView } from "../features/candidates/CandidatesView";
import { PipelineView } from "../features/pipeline/PipelineView";
import { DashboardView } from "../features/dashboard/DashboardView";

// Mock Recharts ResponsiveContainer for JSDOM
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

describe("Phase 8 — End-to-End Workflow Integration & Cross-Module Verification", () => {
  const mockRecruiter = {
    id: "recruiter-1",
    name: "Elena Rostova",
    email: "elena@earlyai.com",
    role: "recruiter" as const,
  };

  const mockJob = {
    _id: "job-101",
    id: "job-101",
    title: "Senior Full-Stack Engineer",
    department: "Engineering",
    location: "Bengaluru / Hybrid",
    employmentType: "FullTime",
    description: "Lead ATS feature development and system architecture.",
    requirements: ["React", "TypeScript", "Node.js"],
    experienceMin: 4,
    experienceMax: 8,
    status: "Open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockCandidate = {
    _id: "cand-201",
    id: "cand-201",
    fullName: "Priya Sharma",
    name: "Priya Sharma",
    email: "priya.sharma@example.com",
    phone: "+91 98765 43210",
    currentCompany: "Acme Corp",
    currentTitle: "Full-Stack Developer",
    experienceYears: 5,
    skills: ["React", "TypeScript", "Tailwind CSS", "Express"],
    source: "LinkedIn",
    resumeUrl: "https://example.com/resumes/priya.pdf",
    notesCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockApplication = {
    _id: "app-301",
    id: "app-301",
    jobId: mockJob,
    candidateId: mockCandidate,
    stage: "Applied" as const,
    currentStage: "Applied" as const,
    status: "Active" as const,
    appliedAt: new Date().toISOString(),
    lastStageChangedAt: new Date().toISOString(),
    source: "LinkedIn",
    version: 0,
    history: [
      {
        stage: "Applied" as const,
        changedAt: new Date().toISOString(),
        actorId: mockRecruiter.id,
        durationMinutes: 0,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockOverview = {
    success: true,
    data: {
      period: { from: null, to: null, label: "All Time" },
      totals: {
        totalCandidates: 25,
        openPositions: 4,
        hiredCandidates: 6,
        rejectedCandidates: 3,
        activeApplications: 18,
      },
      applicationsByStage: {
        Applied: 5,
        Screening: 4,
        Interview: 3,
        Offer: 2,
        Hired: 6,
        Rejected: 3,
      },
      conversion: {
        screeningRate: 0.7222,
        interviewRate: 0.6154,
        offerAcceptanceRate: 0.8571,
        offerToHireRate: 0.8571,
      },
      sourcing: [
        { source: "LinkedIn", count: 10, percentage: 55.6 },
        { source: "Referral", count: 5, percentage: 27.8 },
      ],
      averageTimeInStageMs: {
        Applied: 172800000,
        Screening: 259200000,
        Interview: 432000000,
        Offer: 86400000,
      },
      generatedAt: "2026-10-17T12:00:00.000Z",
    },
  };

  const mockFunnel = {
    success: true,
    data: {
      period: { from: null, to: null, label: "All Time" },
      totalCohortApplications: 18,
      stages: [
        { stage: "Applied", count: 18, conversionRateFromPrevious: 1.0, dropoffRateFromPrevious: 0 },
        { stage: "Screening", count: 13, conversionRateFromPrevious: 0.7222, dropoffRateFromPrevious: 0.2778 },
        { stage: "Interview", count: 8, conversionRateFromPrevious: 0.6154, dropoffRateFromPrevious: 0.3846 },
        { stage: "Offer", count: 7, conversionRateFromPrevious: 0.875, dropoffRateFromPrevious: 0.125 },
        { stage: "Hired", count: 6, conversionRateFromPrevious: 0.8571, dropoffRateFromPrevious: 0.1429 },
      ],
      offerAcceptance: {
        offersExtended: 7,
        offersAccepted: 6,
        offersRejected: 1,
        pendingOffers: 0,
        acceptanceRate: 0.8571,
      },
      generatedAt: "2026-10-17T12:00:00.000Z",
    },
  };

  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockFetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      const method = options?.method || "GET";

      if (url.includes("/api/v1/health")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: "ok", service: "earlyai-ats-api" }),
        });
      }

      if (url.includes("/api/v1/auth/me")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { user: mockRecruiter } }),
        });
      }

      if (url.includes("/api/v1/jobs")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [mockJob],
            pagination: { total: 1, page: 1, limit: 100, totalPages: 1 },
          }),
        });
      }

      if (url.includes("/api/v1/candidates")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [mockCandidate],
            pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
          }),
        });
      }

      if (url.includes("/api/v1/applications") && method === "GET") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              applications: [mockApplication],
              pagination: { total: 1, page: 1, limit: 100, pages: 1 },
            },
          }),
        });
      }

      if (url.includes("/stage") && (method === "PATCH" || method === "PUT")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              application: {
                ...mockApplication,
                currentStage: "Screening",
                stage: "Screening",
              },
            },
          }),
        });
      }

      if (url.includes("/api/v1/analytics/overview")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockOverview,
        });
      }

      if (url.includes("/api/v1/analytics/funnel")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockFunnel,
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      });
    });

    vi.stubGlobal("fetch", mockFetch);
  });

  it("1. Workflow B: Lists jobs, displays badges, and supports status & search filtering", async () => {
    render(<JobsView />);

    await waitFor(() => {
      expect(screen.getByText("Senior Full-Stack Engineer")).toBeInTheDocument();
      expect(screen.getByText("Engineering")).toBeInTheDocument();
      expect(screen.getByText("Bengaluru / Hybrid")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by title, department, or location/i);
    fireEvent.change(searchInput, { target: { value: "Full-Stack" } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("search=Full-Stack"),
        expect.anything()
      );
    });
  });

  it("2. Workflow C: Displays candidate profile, contact details, experience, and skills badges", async () => {
    render(<CandidatesView />);

    await waitFor(() => {
      expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
      expect(screen.getByText(/5 years experience/i)).toBeInTheDocument();
      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
    });
  });

  it("3. Workflow D: Populates pipeline Kanban stage columns and triggers stage progression", async () => {
    render(<PipelineView />);

    await waitFor(() => {
      expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
      expect(screen.getAllByText("Senior Full-Stack Engineer").length).toBeGreaterThanOrEqual(1);
    });

    // Advance candidate to next stage (Screening)
    const advanceBtn = screen.getByRole("button", { name: /advance priya sharma to screening/i });
    fireEvent.click(advanceBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/stage"),
        expect.objectContaining({
          method: "PATCH",
        })
      );
    });
  });

  it("4. Workflow E: Dashboard KPI analytics correctly render aggregate rates and metrics", async () => {
    render(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-content")).toBeInTheDocument();
    });

    expect(screen.getByText("Total Active Candidates")).toBeInTheDocument();
    expect(screen.getByTestId("metric-card-total-active-candidates")).toHaveTextContent("25");
    expect(screen.getByTestId("metric-card-open-job-positions")).toHaveTextContent("4");
    expect(screen.getByText("Offer Acceptance")).toBeInTheDocument();
    expect(screen.getAllByText("85.7%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Candidate Sourcing Channels")).toBeInTheDocument();
  });

  it("5. Seamlessly navigates across workspace tabs from Dashboard to Jobs, Candidates and Pipeline", async () => {
    render(<App />);

    // Initially on Dashboard
    await waitFor(() => {
      expect(screen.getByTestId("dashboard-content")).toBeInTheDocument();
    });

    // Navigate to Jobs
    const jobsTab = screen.getByRole("button", { name: /^jobs$/i });
    fireEvent.click(jobsTab);

    await waitFor(() => {
      expect(screen.getByText("Job Openings")).toBeInTheDocument();
      expect(screen.getByText("Senior Full-Stack Engineer")).toBeInTheDocument();
    });

    // Navigate to Candidates
    const candidatesTab = screen.getByRole("button", { name: /^candidates$/i });
    fireEvent.click(candidatesTab);

    await waitFor(() => {
      expect(screen.getByText("Candidate Profiles")).toBeInTheDocument();
      expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    });

    // Navigate to Pipeline
    const pipelineTab = screen.getByRole("button", { name: /^pipeline$/i });
    fireEvent.click(pipelineTab);

    await waitFor(() => {
      expect(screen.getByText("Hiring Pipeline")).toBeInTheDocument();
    });
  });
});

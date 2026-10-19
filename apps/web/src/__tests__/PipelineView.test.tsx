import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { PipelineView } from "../features/pipeline/PipelineView";
import { App } from "../app/App";

const mockJob = {
  id: "66f111111111111111111101",
  title: "Frontend Architect",
  department: "Engineering",
  location: "Bengaluru",
  employmentType: "FullTime" as const,
  description: "Architect Next-gen ATS user interfaces.",
  requirements: ["React", "TypeScript"],
  experienceMin: 5,
  status: "Open" as const,
  ownerId: "66f000000000000000000001",
  openedAt: "2026-10-15T10:00:00.000Z",
  createdAt: "2026-10-15T10:00:00.000Z",
  updatedAt: "2026-10-15T10:00:00.000Z",
};

const mockCandidate = {
  id: "66f222222222222222222201",
  name: "Priya Sharma",
  fullName: "Priya Sharma",
  email: "priya.sharma@example.com",
  experienceYears: 5,
  skills: ["React", "TypeScript", "Tailwind CSS"],
  source: "LinkedIn" as const,
  currentTitle: "Senior Frontend Engineer",
  createdAt: "2026-10-15T10:00:00.000Z",
  updatedAt: "2026-10-15T10:00:00.000Z",
};

const mockApplication = {
  id: "66f333333333333333333301",
  candidateId: mockCandidate,
  jobId: mockJob,
  stage: "Applied" as const,
  currentStage: "Applied" as const,
  status: "Active" as const,
  appliedAt: "2026-10-16T12:00:00.000Z",
  lastStageChangedAt: "2026-10-16T12:00:00.000Z",
  source: "LinkedIn",
  version: 0,
  createdAt: "2026-10-16T12:00:00.000Z",
  updatedAt: "2026-10-16T12:00:00.000Z",
};

describe("PipelineView Component — Phase 5 UI Verification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const setupMockFetch = (applications = [mockApplication], jobs = [mockJob]) => {
    return vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes("/api/v1/applications") && (!options || options.method === "GET")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              applications,
              pagination: { total: applications.length, page: 1, limit: 100, totalPages: 1 },
            },
          }),
        });
      }

      if (url.includes("/api/v1/jobs")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: jobs,
            pagination: { total: jobs.length, page: 1, limit: 100, totalPages: 1 },
          }),
        });
      }

      if (url.includes("/api/v1/candidates")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [mockCandidate],
            pagination: { total: 1, page: 1, limit: 100, totalPages: 1 },
          }),
        });
      }

      if (url.includes("/stage") && options?.method === "PATCH") {
        const body = JSON.parse((options?.body as string) || "{}");
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              application: {
                ...mockApplication,
                stage: body.toStage,
                currentStage: body.toStage,
                version: 1,
              },
            },
          }),
        });
      }

      if (url === "/api/v1/applications" && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              application: mockApplication,
            },
          }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });
    });
  };

  it("1. Loads pipeline and displays populated stage columns", async () => {
    vi.stubGlobal("fetch", setupMockFetch());

    render(<PipelineView />);

    await waitFor(() => {
      expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Frontend Architect").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Senior Frontend Engineer • 5y exp")).toBeInTheDocument();

    // Verify active pipeline stage columns are rendered
    expect(screen.getByTestId("stage-column-applied")).toBeInTheDocument();
    expect(screen.getByTestId("stage-column-screening")).toBeInTheDocument();
    expect(screen.getByTestId("stage-column-interview")).toBeInTheDocument();
    expect(screen.getByTestId("stage-column-offer")).toBeInTheDocument();

    // Verify switching to Hired & Rejected tab displays terminal stages
    fireEvent.click(screen.getByRole("tab", { name: /hired & rejected/i }));
    expect(screen.getByTestId("stage-column-hired")).toBeInTheDocument();
    expect(screen.getByTestId("stage-column-rejected")).toBeInTheDocument();
  });

  it("2. Displays empty pipeline state when no applications exist", async () => {
    vi.stubGlobal("fetch", setupMockFetch([], [mockJob]));

    render(<PipelineView />);

    await waitFor(() => {
      expect(screen.getAllByText("No applications").length).toBe(4);
    });

    // Check completed tab empty state
    fireEvent.click(screen.getByRole("tab", { name: /hired & rejected/i }));
    expect(screen.getAllByText("No applications").length).toBe(2);
  });

  it("3. Successfully advances stage after API confirmation", async () => {
    const fetchMock = setupMockFetch();
    vi.stubGlobal("fetch", fetchMock);

    render(<PipelineView />);

    await waitFor(() => {
      expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    });

    // Advance button for Applied stage should say "To Screening"
    const advanceButton = screen.getByRole("button", {
      name: /Advance Priya Sharma to Screening/i,
    });
    expect(advanceButton).toBeInTheDocument();

    fireEvent.click(advanceButton);

    await waitFor(() => {
      expect(screen.getByText(/Advanced Priya Sharma to Screening/i)).toBeInTheDocument();
    });
  });

  it("4. Opens rejection modal, enters optional reason, and submits rejection", async () => {
    const fetchMock = setupMockFetch();
    vi.stubGlobal("fetch", fetchMock);

    render(<PipelineView />);

    await waitFor(() => {
      expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    });

    const rejectButton = screen.getByRole("button", {
      name: /Reject application for Priya Sharma/i,
    });
    fireEvent.click(rejectButton);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByText("Reject Application")).toBeInTheDocument();
    });

    const reasonInput = screen.getByLabelText(/Reason for Rejection/i);
    fireEvent.change(reasonInput, { target: { value: "Compensation misalignment" } });

    const confirmButton = screen.getByRole("button", { name: /Confirm Rejection/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/Marked application as Rejected/i)).toBeInTheDocument();
    });
  });

  it("5. Opens New Application modal, validates required fields, and submits creation", async () => {
    const fetchMock = setupMockFetch();
    vi.stubGlobal("fetch", fetchMock);

    render(<PipelineView />);

    const newAppButton = screen.getByRole("button", { name: /New Application/i });
    fireEvent.click(newAppButton);

    await waitFor(() => {
      expect(screen.getByText("New Job Application")).toBeInTheDocument();
    });

    // Select candidate and job
    const candidateSelect = screen.getByLabelText(/Select Candidate/i);
    const jobSelect = screen.getByLabelText(/Select Job Opening/i);

    fireEvent.change(candidateSelect, { target: { value: mockCandidate.id } });
    fireEvent.change(jobSelect, { target: { value: mockJob.id } });

    const submitButton = screen.getByRole("button", { name: /Create Application/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Application created successfully and added to Applied stage/i)
      ).toBeInTheDocument();
    });
  });

  it("6. Displays error banner and retry action when API request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network connection lost"))
    );

    render(<PipelineView />);

    await waitFor(() => {
      expect(screen.getByText(/Network connection lost/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
  });

  it("7. Integrates Pipeline tab into App navigation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/health")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ status: "ok", service: "earlyai-ats-api" }),
          });
        }
        if (url.includes("/jobs")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: [],
              pagination: { total: 0 },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { applications: [], pagination: { total: 0 } },
          }),
        });
      })
    );

    render(<App />);

    const pipelineTab = screen.getByRole("button", { name: /Pipeline/i });
    expect(pipelineTab).toBeInTheDocument();

    fireEvent.click(pipelineTab);

    await waitFor(() => {
      expect(screen.getByText("Hiring Pipeline")).toBeInTheDocument();
    });
  });
});

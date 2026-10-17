import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { JobsView } from "../features/jobs/JobsView";
import { App } from "../app/App";

const mockJob = {
  id: "66f123456789abcdef000001",
  title: "Senior Full Stack Engineer",
  department: "Engineering",
  location: "Bengaluru / Hybrid",
  employmentType: "FullTime",
  description: "Building next-generation talent acquisition platform.",
  requirements: ["React", "TypeScript", "Node.js"],
  experienceMin: 3,
  experienceMax: 6,
  status: "Open" as const,
  openedAt: "2026-10-15T10:00:00.000Z",
  createdAt: "2026-10-15T10:00:00.000Z",
  updatedAt: "2026-10-15T10:00:00.000Z",
  owner: {
    id: "66f000000000000000000001",
    name: "Alex Recruiter",
    email: "recruiter@example.com",
    role: "recruiter" as const,
  },
};

describe("JobsView Component — Phase 3 UI Verification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders populated job listings with title, department, and status badge", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "success",
          data: [mockJob],
          pagination: {
            page: 1,
            limit: 12,
            total: 1,
            totalPages: 1,
          },
        }),
      })
    );

    render(<JobsView />);

    // Check loading indicator or wait for populated view
    await waitFor(() => {
      expect(screen.getByText("Senior Full Stack Engineer")).toBeInTheDocument();
    });

    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Bengaluru / Hybrid")).toBeInTheDocument();
    expect(screen.getByText("FullTime")).toBeInTheDocument();
    expect(screen.getAllByText("Open").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("1 Total")).toBeInTheDocument();
  });

  it("renders empty state when no job openings exist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "success",
          data: [],
          pagination: {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 0,
          },
        }),
      })
    );

    render(<JobsView />);

    await waitFor(() => {
      expect(screen.getByText("No job openings found")).toBeInTheDocument();
    });

    expect(screen.getByText(/No job postings have been created yet/)).toBeInTheDocument();
    expect(screen.getByText("Create First Job")).toBeInTheDocument();
  });

  it("renders error state with retry button when API request fails", async () => {
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({
              status: "error",
              error: { code: "SERVER_ERROR", message: "Database connection timed out" },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: "success",
            data: [mockJob],
            pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
          }),
        });
      })
    );

    render(<JobsView />);

    await waitFor(() => {
      expect(screen.getByText("Unable to load jobs")).toBeInTheDocument();
    });

    expect(screen.getByText("Database connection timed out")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();

    // Click retry and verify populated state
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("Senior Full Stack Engineer")).toBeInTheDocument();
    });
  });

  it("opens Create Job modal when clicking Create Job button", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "success",
          data: [],
          pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
        }),
      })
    );

    render(<JobsView />);

    await waitFor(() => {
      expect(screen.getByText("No job openings found")).toBeInTheDocument();
    });

    const createBtn = screen.getByRole("button", { name: /create job/i });
    fireEvent.click(createBtn);

    expect(screen.getByText("Create New Job Opening")).toBeInTheDocument();
    expect(screen.getByLabelText(/job title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/department/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/employment type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it("navigates between Overview and Jobs tabs seamlessly in App shell", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/health")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ status: "ok", service: "earlyai-ats-api" }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: "success",
            data: [mockJob],
            pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
          }),
        });
      })
    );

    render(<App />);

    // Initially in Overview
    expect(screen.getByText("Screening")).toBeInTheDocument();

    // Switch to Jobs tab
    const jobsTabBtn = screen.getByRole("button", { name: /^jobs$/i });
    fireEvent.click(jobsTabBtn);

    await waitFor(() => {
      expect(screen.getByText("Job Openings")).toBeInTheDocument();
      expect(screen.getByText("Senior Full Stack Engineer")).toBeInTheDocument();
    });

    // Switch back to Dashboard / Overview
    const dashboardTabBtn = screen.getByRole("button", { name: /dashboard/i });
    fireEvent.click(dashboardTabBtn);

    expect(screen.getByText("Screening")).toBeInTheDocument();
  });
});

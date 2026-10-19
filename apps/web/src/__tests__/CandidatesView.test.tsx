import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { CandidatesView } from "../features/candidates/CandidatesView";
import { App } from "../app/App";

const mockCandidate = {
  id: "66f9876543210fedcba00001",
  name: "Mira Shah",
  fullName: "Mira Shah",
  email: "mira.shah@example.com",
  phone: "+91 98765 43210",
  location: "Bengaluru",
  currentTitle: "Lead Full Stack Engineer",
  experienceYears: 6,
  skills: ["React", "TypeScript", "Node.js", "MongoDB"],
  resumeUrl: "https://example.com/resumes/mira.pdf",
  source: "LinkedIn" as const,
  summary: "Accomplished engineer with background scaling candidate portals.",
  createdBy: {
    id: "66f000000000000000000001",
    name: "Alex Recruiter",
    email: "recruiter@example.com",
    role: "recruiter",
  },
  archivedAt: null,
  createdAt: "2026-10-15T10:00:00.000Z",
  updatedAt: "2026-10-15T10:00:00.000Z",
};

describe("CandidatesView Component — Phase 4 UI Verification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders populated candidate listings with name, title, email, and source badge", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockCandidate],
          pagination: {
            page: 1,
            limit: 12,
            total: 1,
            totalPages: 1,
          },
        }),
      })
    );

    render(<CandidatesView />);

    await waitFor(() => {
      expect(screen.getByText("Mira Shah")).toBeInTheDocument();
    });

    expect(screen.getByText("Lead Full Stack Engineer")).toBeInTheDocument();
    expect(screen.getByText("mira.shah@example.com")).toBeInTheDocument();
    expect(screen.getByText("Bengaluru")).toBeInTheDocument();
    expect(screen.getByText("6 Years Experience")).toBeInTheDocument();
    expect(screen.getAllByText("LinkedIn").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("1 Total")).toBeInTheDocument();
  });

  it("renders empty state when no candidates are found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
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

    render(<CandidatesView />);

    await waitFor(() => {
      expect(screen.getByText("No candidate profiles found")).toBeInTheDocument();
    });

    expect(screen.getByText(/No candidates have been registered yet/)).toBeInTheDocument();
    expect(screen.getByText("Add First Candidate")).toBeInTheDocument();
  });

  it("renders API error state with retry button when fetching fails", async () => {
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const urlStr = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request)?.url || "";
        if (urlStr.includes("/notifications")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { unreadCount: 0, notifications: [], pagination: { total: 0 } },
            }),
          });
        }
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({
              success: false,
              error: { code: "SERVER_ERROR", message: "Failed to connect to database" },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [mockCandidate],
            pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
          }),
        });
      })
    );

    render(<CandidatesView />);

    await waitFor(() => {
      expect(screen.getByText("Unable to load candidate profiles")).toBeInTheDocument();
    });

    expect(screen.getByText("Failed to connect to database")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("Mira Shah")).toBeInTheDocument();
    });
  });

  it("opens Add Candidate modal and displays required inputs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
        }),
      })
    );

    render(<CandidatesView />);

    await waitFor(() => {
      expect(screen.getByText("No candidate profiles found")).toBeInTheDocument();
    });

    const addBtn = screen.getByRole("button", { name: /add candidate/i });
    fireEvent.click(addBtn);

    expect(screen.getByText("Add New Candidate")).toBeInTheDocument();
    expect(screen.getByLabelText(/candidate name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/experience/i)).toBeInTheDocument();
  });

  it("opens Candidate Detail modal when clicking candidate name", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockCandidate],
          pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
        }),
      })
    );

    render(<CandidatesView />);

    await waitFor(() => {
      expect(screen.getByText("Mira Shah")).toBeInTheDocument();
    });

    // Click candidate name to open detail modal
    fireEvent.click(screen.getByText("Mira Shah"));

    await waitFor(() => {
      expect(screen.getByText("Skills & Proficiencies")).toBeInTheDocument();
      expect(screen.getByText("Candidate Summary & Notes")).toBeInTheDocument();
      expect(screen.getByText("Open Resume")).toBeInTheDocument();
    });
  });

  it("navigates to Candidates tab from App shell navigation", async () => {
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
            success: true,
            data: [mockCandidate],
            pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
          }),
        });
      })
    );

    render(<App />);

    const candidatesTabBtn = screen.getByRole("button", { name: /^candidates$/i });
    fireEvent.click(candidatesTabBtn);

    await waitFor(() => {
      expect(screen.getByText("Candidate Profiles")).toBeInTheDocument();
      expect(screen.getByText("Mira Shah")).toBeInTheDocument();
    });
  });
});

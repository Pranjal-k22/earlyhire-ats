import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { CandidateNotesSection } from "../features/candidates/CandidateNotesSection";
import { CandidatesView } from "../features/candidates/CandidatesView";
import { JobsView } from "../features/jobs/JobsView";
import { Candidate } from "../types/candidate";
import { Note } from "../types/note";

const mockCandidate: Candidate = {
  id: "66f9876543210fedcba00001",
  name: "Mira Shah",
  fullName: "Mira Shah",
  email: "mira.shah@example.com",
  phone: "+91 98765 43210",
  location: "Bengaluru",
  currentTitle: "Lead Full Stack Engineer",
  experienceYears: 6,
  skills: ["React", "TypeScript", "Node.js", "MongoDB"],
  source: "LinkedIn",
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

const mockNote: Note = {
  id: "66f000000000000000000099",
  candidateId: "66f9876543210fedcba00001",
  authorId: {
    id: "66f000000000000000000001",
    name: "Alex Recruiter",
    email: "recruiter@example.com",
    role: "recruiter",
  },
  body: "Strong technical interview performance. Excellent problem solving.",
  deletedAt: null,
  createdAt: "2026-10-16T14:30:00.000Z",
  updatedAt: "2026-10-16T14:30:00.000Z",
};

describe("Phase 6 — Recruiter Notes & Advanced Search UI Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("CandidateNotesSection Component", () => {
    it("renders existing notes with author, timestamp, and safe text content", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              notes: [mockNote],
            },
          }),
        })
      );

      render(<CandidateNotesSection candidateId={mockCandidate.id} />);

      await waitFor(() => {
        expect(screen.getByText("Alex Recruiter")).toBeInTheDocument();
      });

      expect(
        screen.getByText("Strong technical interview performance. Excellent problem solving.")
      ).toBeInTheDocument();
      expect(screen.getByText("recruiter")).toBeInTheDocument();
    });

    it("renders empty state when candidate has no notes", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              notes: [],
            },
          }),
        })
      );

      render(<CandidateNotesSection candidateId={mockCandidate.id} />);

      await waitFor(() => {
        expect(
          screen.getByText("No recruiter notes yet.")
        ).toBeInTheDocument();
      });
    });

    it("submits a new note and reloads notes list", async () => {
      let callCount = 0;
      const fetchMock = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
        if (opts?.method === "POST") {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                note: {
                  ...mockNote,
                  id: "66f000000000000000000100",
                  body: "Candidate prefers remote work in APAC timezone.",
                },
              },
            }),
          });
        }
        callCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              notes:
                callCount > 1
                  ? [
                      mockNote,
                      {
                        ...mockNote,
                        id: "66f000000000000000000100",
                        body: "Candidate prefers remote work in APAC timezone.",
                      },
                    ]
                  : [mockNote],
            },
          }),
        });
      });
      vi.stubGlobal("fetch", fetchMock);

      render(<CandidateNotesSection candidateId={mockCandidate.id} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Add an internal observation/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Add an internal observation/i);
      fireEvent.change(input, {
        target: { value: "Candidate prefers remote work in APAC timezone." },
      });

      const submitButton = screen.getByRole("button", { name: /Add Note/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Candidate prefers remote work in APAC timezone.")
        ).toBeInTheDocument();
      });
    });

    it("safely displays note text without rendering HTML or executing scripts", async () => {
      const maliciousBody = "<b>Bold text</b> <script>alert('xss')</script>";
      const safeNote: Note = {
        ...mockNote,
        body: maliciousBody,
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              notes: [safeNote],
            },
          }),
        })
      );

      render(<CandidateNotesSection candidateId={mockCandidate.id} />);

      await waitFor(() => {
        // Plain text node contains exact string
        expect(screen.getByText(maliciousBody)).toBeInTheDocument();
      });

      // Confirm there are no raw script tags inserted
      expect(document.querySelector("script[src*='alert']")).toBeNull();
    });

    it("deletes a note after confirmation", async () => {
      const fetchMock = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
        if (opts?.method === "DELETE") {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { message: "Note deleted successfully" },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              notes: [mockNote],
            },
          }),
        });
      });
      vi.stubGlobal("fetch", fetchMock);

      render(<CandidateNotesSection candidateId={mockCandidate.id} />);

      await waitFor(() => {
        expect(screen.getByTitle(/delete note/i)).toBeInTheDocument();
      });

      const deleteBtn = screen.getByTitle(/delete note/i);
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining("/notes/66f000000000000000000099"),
          expect.objectContaining({ method: "DELETE" })
        );
      });
    });
  });

  describe("CandidatesView Advanced Filters", () => {
    it("handles search and experience filter inputs", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockCandidate],
          pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      render(<CandidatesView />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search by name, email, or skills/i)).toBeInTheDocument();
      });

      // Change search input
      const searchInput = screen.getByPlaceholderText(/Search by name, email, or skills/i);
      fireEvent.change(searchInput, { target: { value: "TypeScript" } });

      // Change experience dropdown
      const expSelect = screen.getByLabelText(/Filter candidates by tenure/i);
      fireEvent.change(expSelect, { target: { value: "5" } });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining("search=TypeScript"),
          expect.anything()
        );
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining("experienceMin=5"),
          expect.anything()
        );
      });

      // Clear filters button should appear
      const clearBtn = screen.getByRole("button", { name: /Clear Filters/i });
      expect(clearBtn).toBeInTheDocument();
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(searchInput).toHaveValue("");
        expect(expSelect).toHaveValue("");
      });
    });
  });

  describe("JobsView Filters", () => {
    it("filters jobs by status and search query", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          pagination: { page: 1, limit: 12, total: 0, totalPages: 1 },
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      render(<JobsView />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search by title, department, or location/i)).toBeInTheDocument();
      });

      // Click "Open" status button
      const openBtn = screen.getByRole("button", { name: "Open" });
      fireEvent.click(openBtn);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining("status=Open"),
          expect.anything()
        );
      });

      // Clear Filters button should be visible
      const clearBtn = screen.getByRole("button", { name: /Clear Filters/i });
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.not.stringContaining("status=Open"),
          expect.anything()
        );
      });
    });
  });
});

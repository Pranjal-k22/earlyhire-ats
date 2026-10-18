import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { CandidatePortalView } from "../features/candidate/CandidatePortalView";
import { AtsReportDrawer } from "../features/pipeline/AtsReportDrawer";
import { Application } from "../types/application";

const mockJob = {
  id: "job-101",
  title: "Senior Full Stack Engineer",
  department: "Engineering",
  location: "Remote",
  employmentType: "FullTime" as const,
  description: "TypeScript and React microservices engineer.",
  requirements: ["TypeScript", "React", "Node.js", "PostgreSQL"],
  experienceMin: 3,
  status: "Open" as const,
  ownerId: "recruiter-1",
  openedAt: "2026-10-15T10:00:00.000Z",
  createdAt: "2026-10-15T10:00:00.000Z",
  updatedAt: "2026-10-15T10:00:00.000Z",
};

const mockResume = {
  id: "res-101",
  originalFilename: "resume_john_doe.pdf",
  fileSizeBytes: 45000,
  mimeType: "application/pdf",
  parsingStatus: "completed" as const,
  parsedText: "John Doe Full Stack Developer",
  createdAt: "2026-10-16T10:00:00.000Z",
};

const mockAnalysisLowScore = {
  id: "analysis-101",
  jobId: "job-101",
  resumeId: "res-101",
  overallScore: 62,
  breakdown: {
    skillsScore: 60,
    experienceScore: 65,
    educationScore: 70,
    roleRelevanceScore: 55,
  },
  requiredSkillsFound: ["React", "Node.js"],
  missingCriteria: ["TypeScript (not evidenced in resume)", "PostgreSQL (not evidenced in resume)"],
  experienceEvidence: ["3 years at TechCorp"],
  concreteSuggestions: [
    "Clarify TypeScript and PostgreSQL experience.",
    "Add concrete performance metrics.",
  ],
  confidence: "high" as const,
  summary: "Solid foundational experience, but key backend criteria are unevidenced.",
  provider: "ollama",
  model: "qwen2.5:7b",
  promptVersion: "v1.0",
  rubricVersion: "v2.0-deterministic-hybrid",
  status: "dual_complete" as const,
  createdAt: "2026-10-17T10:00:00.000Z",
};

const mockApplicationWithSnapshot: Application = {
  id: "app-101",
  candidateId: {
    id: "cand-1",
    name: "John Doe",
    fullName: "John Doe",
    email: "john@example.com",
    experienceYears: 4,
    skills: ["React", "TypeScript"],
    source: "CompanyWebsite",
    createdAt: "2026-10-15T10:00:00.000Z",
    updatedAt: "2026-10-15T10:00:00.000Z",
  },
  jobId: mockJob,
  stage: "Applied",
  currentStage: "Applied",
  status: "Active",
  appliedAt: "2026-10-17T12:00:00.000Z",
  lastStageChangedAt: "2026-10-17T12:00:00.000Z",
  source: "Candidate Portal",
  version: 0,
  atsSnapshot: {
    overallScore: 84,
    breakdown: {
      skillsScore: 85,
      experienceScore: 80,
      educationScore: 85,
      roleRelevanceScore: 85,
    },
    status: "dual_complete",
    provider: "ollama",
    model: "qwen2.5:7b",
    resumeVersion: 1,
    promptVersion: "v1.0",
    rubricVersion: "v2.0-deterministic-hybrid",
    assessedAt: "2026-10-17T12:00:00.000Z",
    matchedSkills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
    missingCriteria: [],
  },
  createdAt: "2026-10-17T12:00:00.000Z",
  updatedAt: "2026-10-17T12:00:00.000Z",
};

describe("Candidate ATS Pre-Check, Coaching Panel, and Application Snapshot Workflow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const setupCandidateFetch = (analyses = [mockAnalysisLowScore]) => {
    return vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes("/api/v1/profile")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { user: { id: "u-1", name: "John Doe", email: "john@example.com" } },
          }),
        });
      }
      if (url.includes("/api/v1/resumes/my")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { resumes: [mockResume] },
          }),
        });
      }
      if (url.includes("/api/v1/ats/my")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { analyses },
          }),
        });
      }
      if (url.includes("/api/v1/interviews/my")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { interviews: [] },
          }),
        });
      }
      if (url.includes("/api/v1/jobs")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [mockJob],
          }),
        });
      }
      if (url.includes("/api/v1/applications/apply") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              application: mockApplicationWithSnapshot,
              atsSnapshot: mockApplicationWithSnapshot.atsSnapshot,
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

  it("renders candidate ATS score breakdown and triggers Low-Score Coaching Panel when score < 70%", async () => {
    global.fetch = setupCandidateFetch([mockAnalysisLowScore]);

    render(<CandidatePortalView />);

    // Switch to ATS tab
    const atsTabButton = await screen.findByText(/AI ATS Analyzer/i);
    fireEvent.click(atsTabButton);

    // Verify Overall Score and Breakdown rendered
    expect(await screen.findByText("62%")).toBeInTheDocument();
    expect(screen.getByText("Skills Evidence")).toBeInTheDocument();
    expect(screen.getByText("Experience Alignment")).toBeInTheDocument();

    // Verify Low-Score Coaching Panel rendered
    expect(screen.getByText(/Resume Optimization Coaching Panel/i)).toBeInTheDocument();
    expect(screen.getByText(/How to Strengthen Your Match Before Submitting/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload Improved Resume Version/i)).toBeInTheDocument();
  });

  it("opens Pre-Application Confirmation Modal and submits application with immutable snapshot", async () => {
    const fetchMock = setupCandidateFetch([mockAnalysisLowScore]);
    global.fetch = fetchMock;

    render(<CandidatePortalView />);

    // Switch to ATS tab
    const atsTabButton = await screen.findByText(/AI ATS Analyzer/i);
    fireEvent.click(atsTabButton);

    // Click "Submit Application" button
    const submitAppButton = await screen.findByRole("button", { name: /Submit Application/i });
    fireEvent.click(submitAppButton);

    // Verify modal appeared with Immutable Snapshot Guarantee notice
    expect(await screen.findByText(/Application Snapshot Confirmation/i)).toBeInTheDocument();
    expect(screen.getByText(/Immutable Snapshot Guarantee/i)).toBeInTheDocument();
    expect(screen.getAllByText("62%").length).toBeGreaterThan(0);

    // Confirm & Apply
    const confirmButton = screen.getByRole("button", { name: /Confirm & Apply/i });
    fireEvent.click(confirmButton);

    // Wait for applyForJobApi to be called
    await waitFor(() => {
      const applyCall = fetchMock.mock.calls.find((c) =>
        String(c[0]).includes("/api/v1/applications/apply")
      );
      expect(applyCall).toBeDefined();
      const reqInit = applyCall?.[1] as RequestInit | undefined;
      const body = JSON.parse(String(reqInit?.body || "{}"));
      expect(body.jobId).toBe("job-101");
      expect(body.resumeId).toBe("res-101");
    });

    // Verify success toast
    expect(
      await screen.findByText(/Application submitted successfully! Your immutable ATS snapshot has been recorded/i)
    ).toBeInTheDocument();
  });

  it("renders Recruiter AtsReportDrawer with immutable snapshot and human review disclaimer", async () => {
    render(
      <AtsReportDrawer
        isOpen={true}
        application={mockApplicationWithSnapshot}
        onClose={() => {}}
      />
    );

    // Verify recruiter drawer header and score
    expect(screen.getByText(/Application ATS Assessment/i)).toBeInTheDocument();
    expect(screen.getByText("84%")).toBeInTheDocument();
    expect(screen.getByText(/Immutable Submission Snapshot/i)).toBeInTheDocument();

    // Verify skills matched in snapshot
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();

    // Verify human recruiter accountability notice
    expect(screen.getByText(/Human Hiring Team Responsibility/i)).toBeInTheDocument();
    expect(
      screen.getByText(/EarlyAI ATS scores provide evidence-grounded decision support/i)
    ).toBeInTheDocument();
  });
});

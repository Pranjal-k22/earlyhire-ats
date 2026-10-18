import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { App } from "../app/App";
import { LandingPageView } from "../features/landing/LandingPageView";

describe("EarlyAI ATS — Premium Public Landing Page Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/v1/health")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ status: "ok", service: "earlyai-ats-api" }),
          });
        }
        if (url.includes("/api/v1/auth/me")) {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({ success: false, error: { message: "Unauthenticated" } }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      })
    );
  });

  it("1. Renders the landing page with editorial headline, eyebrow, and value proposition", () => {
    render(<App initialTab="landing" />);

    // Brand and Eyebrow
    expect(screen.getByText(/AI-POWERED RECRUITMENT PLATFORM/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Find Better Matches/i);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Build Better Teams/i);

    // Supporting copy
    expect(
      screen.getByText(/Turn resumes into actionable insights, connect candidates with the right opportunities/i)
    ).toBeInTheDocument();

    // Dual CTAs
    expect(screen.getAllByRole("button", { name: /get started/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /explore features/i })).toBeInTheDocument();
  });

  it("2. Renders all main navigation links and controls", () => {
    render(<App initialTab="landing" />);

    // Navigation links in header / footer
    expect(screen.getAllByRole("link", { name: /features/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /how it works/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /for candidates/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /for hiring teams/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /security/i }).length).toBeGreaterThanOrEqual(1);

    // Unauthenticated Controls
    expect(screen.getAllByRole("button", { name: /sign in/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("3. Opens AuthModal in signup mode when clicking Get Started CTA", async () => {
    render(<App initialTab="landing" />);

    const getStartedButtons = screen.getAllByRole("button", { name: /get started/i });
    fireEvent.click(getStartedButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /create candidate account/i })).toBeInTheDocument();
    });
  });

  it("4. Opens AuthModal in login mode when clicking Sign In CTA", async () => {
    render(<App initialTab="landing" />);

    const signInButtons = screen.getAllByRole("button", { name: /sign in/i });
    fireEvent.click(signInButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    });
  });

  it("5. Renders lower hero collaboration visuals and candidate match preview", () => {
    render(<App initialTab="landing" />);

    expect(screen.getByText(/Talent meets opportunity/i)).toBeInTheDocument();
    expect(screen.getByText(/Seamless Collaboration\+/i)).toBeInTheDocument();
    expect(screen.getAllByText("Priya Sharma").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("94%")).toBeInTheDocument();
    expect(screen.getByText(/ATS Analysis Complete/i)).toBeInTheDocument();
  });

  it("6. Renders the 4 sequential How It Works steps and human decision support notice", () => {
    render(<App initialTab="landing" />);

    expect(screen.getAllByText("01").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Create Your Account")).toBeInTheDocument();
    expect(screen.getAllByText("02").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Upload and Analyze")).toBeInTheDocument();
    expect(screen.getAllByText("03").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Discover and Apply")).toBeInTheDocument();
    expect(screen.getAllByText("04").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Review and Connect")).toBeInTheDocument();

    expect(screen.getByText(/Human-In-The-Loop Principle/i)).toBeInTheDocument();
  });

  it("7. Renders dedicated Candidate and Hiring Team sections with actionable CTAs", () => {
    render(<App initialTab="landing" />);

    expect(screen.getByText(/Your Next Opportunity/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start as a candidate/i })).toBeInTheDocument();

    expect(screen.getByText(/A Clearer View of/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /access hiring workspace/i })).toBeInTheDocument();
  });

  it("8. Renders verified platform security pillars and dynamic footer copyright", () => {
    render(<App initialTab="landing" />);

    expect(screen.getByText(/Strict Role-Based Access Control/i)).toBeInTheDocument();
    expect(screen.getByText(/Private Document Storage & Ownership/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Immutable Application Snapshots/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Protected Authentication Sessions/i)).toBeInTheDocument();

    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${currentYear} EarlyAI ATS`, "i"))).toBeInTheDocument();
  });

  it("9. Handles mobile navigation drawer toggle and Escape key dismissal", async () => {
    render(<LandingPageView currentUser={null} onOpenAuth={vi.fn()} onNavigateToWorkspace={vi.fn()} />);

    // Trigger mobile drawer
    const openMenuButton = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(openMenuButton);

    const mobileDialog = screen.getByRole("dialog", { name: /mobile navigation/i });
    expect(mobileDialog).toBeInTheDocument();

    // Dismiss with Escape key
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /mobile navigation/i })).not.toBeInTheDocument();
    });
  });

  it("10. Renders Enter Workspace button for authenticated user and navigates directly", () => {
    const mockUser = {
      id: "usr-1",
      name: "Dev Recruiter",
      email: "recruiter@earlyai.com",
      role: "recruiter" as const,
      canonicalRole: "hiring_team" as const,
    };

    const onNavigateMock = vi.fn();

    render(
      <LandingPageView
        currentUser={mockUser}
        onOpenAuth={vi.fn()}
        onNavigateToWorkspace={onNavigateMock}
      />
    );

    const enterButtons = screen.getAllByRole("button", { name: /enter workspace/i });
    expect(enterButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(enterButtons[0]);
    expect(onNavigateMock).toHaveBeenCalledTimes(1);
  });
});

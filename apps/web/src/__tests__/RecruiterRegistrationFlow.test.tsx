import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { App } from "../app/App";
import { AuthModal } from "../features/auth/AuthModal";
import { AuthPortalView } from "../features/auth/AuthPortalView";
import * as authApi from "../api/authApi";

describe("EarlyAI ATS — Frontend Recruiter Registration & Role Persistence Flow", () => {
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
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: "ok" }),
        });
      })
    );
  });

  it("1. Selecting Recruiter in AuthModal displays recruiter registration form fields", async () => {
    render(
      <AuthModal
        isOpen={true}
        initialMode="signup"
        initialPortal="candidate"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Initial is candidate
    expect(screen.getByRole("heading", { name: /create candidate account/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/company name/i)).not.toBeInTheDocument();

    // Switch to Recruiter tab
    const recruiterTab = screen.getByTestId("auth-role-recruiter");
    fireEvent.click(recruiterTab);

    // Now displays recruiter registration form
    expect(screen.getByRole("heading", { name: /create recruiter account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/department/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/work phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/invite code/i)).toBeInTheDocument();
    expect(screen.getByText(/hiring team authorization policy/i)).toBeInTheDocument();
  });

  it("2. Recruiter signup submits genuine recruiter payload including company details", async () => {
    const signupRecruiterSpy = vi.spyOn(authApi, "signupRecruiter").mockResolvedValueOnce({
      success: true,
      data: {
        requiresApproval: true,
        user: {
          id: "rec-new-1",
          name: "Dev Recruiter",
          email: "dev.recruiter@acme.corp",
          company: "Acme Talent Corp",
          department: "Technical Sourcing",
          phone: "+1-555-012-3456",
          role: "hiring_team",
          canonicalRole: "hiring_team",
          approvalStatus: "pending",
        },
      },
    });

    const handleSuccess = vi.fn();
    render(
      <AuthModal
        isOpen={true}
        initialMode="signup"
        initialPortal="recruiter"
        onClose={vi.fn()}
        onSuccess={handleSuccess}
      />
    );

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Dev Recruiter" } });
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: "dev.recruiter@acme.corp" } });
    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: "Acme Talent Corp" } });
    fireEvent.change(screen.getByLabelText(/department/i), { target: { value: "Technical Sourcing" } });
    fireEvent.change(screen.getByLabelText(/work phone/i), { target: { value: "+1-555-012-3456" } });
    fireEvent.change(screen.getByLabelText(/invite code/i), { target: { value: "INVITE2026" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "RecruiterPass123!" } });

    fireEvent.click(screen.getByTestId("signup-submit-button"));

    await waitFor(() => {
      expect(signupRecruiterSpy).toHaveBeenCalledWith({
        name: "Dev Recruiter",
        email: "dev.recruiter@acme.corp",
        password: "RecruiterPass123!",
        company: "Acme Talent Corp",
        department: "Technical Sourcing",
        phone: "+1-555-012-3456",
        inviteCode: "INVITE2026",
        role: "recruiter",
      });
      expect(handleSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "hiring_team",
          canonicalRole: "hiring_team",
          approvalStatus: "pending",
          company: "Acme Talent Corp",
        })
      );
    });
  });

  it("3. Candidate signup continues to submit canonical candidate payload", async () => {
    const candidateSignupSpy = vi.spyOn(authApi, "signup").mockResolvedValueOnce({
      success: true,
      data: {
        user: {
          id: "cand-77",
          name: "Standard Candidate",
          email: "standard.candidate@example.com",
          role: "candidate",
          canonicalRole: "candidate",
          approvalStatus: "approved",
        },
      },
    });

    const handleSuccess = vi.fn();
    render(
      <AuthModal
        isOpen={true}
        initialMode="signup"
        initialPortal="candidate"
        onClose={vi.fn()}
        onSuccess={handleSuccess}
      />
    );

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Standard Candidate" } });
    fireEvent.change(screen.getByLabelText(/candidate \/ work email/i), { target: { value: "standard.candidate@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "CandidatePass123!" } });

    fireEvent.click(screen.getByTestId("signup-submit-button"));

    await waitFor(() => {
      expect(candidateSignupSpy).toHaveBeenCalledWith({
        name: "Standard Candidate",
        email: "standard.candidate@example.com",
        password: "CandidatePass123!",
        role: "candidate",
      });
      expect(handleSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "candidate",
          canonicalRole: "candidate",
          approvalStatus: "approved",
        })
      );
    });
  });

  it("4. Pending recruiter displays dedicated Pending Approval screen and blocks workspace", async () => {
    vi.spyOn(authApi, "fetchMe").mockResolvedValue({
      success: true,
      data: {
        user: {
          id: "pending-rec-1",
          name: "Jane Recruiter",
          email: "jane@newhiring.corp",
          role: "hiring_team",
          canonicalRole: "hiring_team",
          approvalStatus: "pending",
          company: "New Hiring Co",
        },
      },
    });

    render(<App initialTab="overview" />);

    await waitFor(() => {
      expect(screen.getByText(/recruiter registration received/i)).toBeInTheDocument();
      expect(screen.getByText(/approval pending/i)).toBeInTheDocument();
      expect(screen.getAllByText(/New Hiring Co/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("button", { name: /check approval status/i })).toBeInTheDocument();
    });
  });

  it("5. Checking approval status refreshes session and unlocks recruiter workspace when approved", async () => {
    const fetchMeSpy = vi.spyOn(authApi, "fetchMe")
      .mockResolvedValueOnce({
        success: true,
        data: {
          user: {
            id: "pending-rec-2",
            name: "Alex Recruiter",
            email: "alex@talent.corp",
            role: "hiring_team",
            canonicalRole: "hiring_team",
            approvalStatus: "pending",
            company: "Talent Corp",
          },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          user: {
            id: "pending-rec-2",
            name: "Alex Recruiter",
            email: "alex@talent.corp",
            role: "hiring_team",
            canonicalRole: "hiring_team",
            approvalStatus: "approved",
            company: "Talent Corp",
          },
        },
      });

    render(<App initialTab="overview" />);

    const checkBtn = await screen.findByRole("button", { name: /check approval status/i });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(fetchMeSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/congratulations! your recruiter account has been approved/i)).toBeInTheDocument();
      expect(screen.queryByText(/approval pending/i)).not.toBeInTheDocument();
    });
  });

  it("6. Recruiter registration on AuthPortalView renders recruiter form and dispatches correctly", async () => {
    const signupRecruiterSpy = vi.spyOn(authApi, "signupRecruiter").mockResolvedValueOnce({
      success: true,
      data: {
        requiresApproval: true,
        user: {
          id: "portal-rec-1",
          name: "Portal Recruiter",
          email: "portal@agency.corp",
          company: "Global Agency",
          role: "hiring_team",
          canonicalRole: "hiring_team",
          approvalStatus: "pending",
        },
      },
    });

    const handleSuccess = vi.fn();
    render(
      <AuthPortalView
        initialPortal="recruiter"
        initialMode="signup"
        onSuccess={handleSuccess}
        onNavigateHome={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: /register recruiter account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Portal Recruiter" } });
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: "portal@agency.corp" } });
    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: "Global Agency" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "AgencyPassword123!" } });

    fireEvent.click(screen.getByTestId("signup-submit-button"));

    await waitFor(() => {
      expect(signupRecruiterSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Portal Recruiter",
          email: "portal@agency.corp",
          company: "Global Agency",
          role: "recruiter",
        })
      );
      expect(handleSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "hiring_team",
          approvalStatus: "pending",
        })
      );
    });
  });
});

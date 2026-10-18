import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { App } from "../app/App";
import { AuthPortalView } from "../features/auth/AuthPortalView";
import * as authApi from "../api/authApi";

describe("EarlyAI ATS — Unified Role-Based Auth Portals & RBAC Suite", () => {
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

  it("1. Candidate registration produces strictly candidate role without privilege escalation", async () => {
    const signupSpy = vi.spyOn(authApi, "signup").mockResolvedValueOnce({
      success: true,
      data: {
        user: {
          id: "cand-new-1",
          name: "Dev Candidate",
          email: "candidate@earlyai.corp",
          role: "candidate",
          canonicalRole: "candidate",
        },
      },
    });

    const handleSuccess = vi.fn();
    render(
      <AuthPortalView
        initialPortal="candidate"
        initialMode="signup"
        onSuccess={handleSuccess}
        onNavigateHome={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: /create candidate account/i })).toBeInTheDocument();
    expect(screen.getByText(/candidate role provisioned/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Dev Candidate" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "candidate@earlyai.corp" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "SecretPassword123!" } });

    const submitBtn = screen.getByTestId("signup-submit-button");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(signupSpy).toHaveBeenCalledWith({
        name: "Dev Candidate",
        email: "candidate@earlyai.corp",
        password: "SecretPassword123!",
        role: "candidate",
      });
      expect(handleSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ role: "candidate", canonicalRole: "candidate" })
      );
    });
  });

  it("2. Forged privileged registration rejected by backend displays clear error", async () => {
    vi.spyOn(authApi, "signup").mockRejectedValueOnce(
      new Error("Public registration is restricted to candidate accounts.")
    );

    render(
      <AuthPortalView
        initialPortal="candidate"
        initialMode="signup"
        onSuccess={vi.fn()}
        onNavigateHome={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Hacker User" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "hacker@earlyai.corp" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "HackedPassword123!" } });

    fireEvent.click(screen.getByTestId("signup-submit-button"));

    await waitFor(() => {
      expect(screen.getByText(/public registration is restricted to candidate accounts/i)).toBeInTheDocument();
    });
  });

  it("3. Candidate portal login with candidate credentials succeeds and redirects", async () => {
    vi.spyOn(authApi, "login").mockResolvedValueOnce({
      success: true,
      data: {
        user: {
          id: "cand-123",
          name: "John Candidate",
          email: "john@candidate.io",
          role: "candidate",
          canonicalRole: "candidate",
        },
      },
    });

    const handleSuccess = vi.fn();
    render(
      <AuthPortalView
        initialPortal="candidate"
        initialMode="login"
        onSuccess={handleSuccess}
        onNavigateHome={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByText(/sign in to your candidate workspace/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "john@candidate.io" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "Password123!" } });
    fireEvent.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ id: "cand-123", canonicalRole: "candidate" })
      );
    });
  });

  it("4. Recruiter login on Candidate portal triggers safe portal mismatch alert", async () => {
    vi.spyOn(authApi, "login").mockResolvedValueOnce({
      success: true,
      data: {
        user: {
          id: "recruiter-99",
          name: "Sarah Recruiter",
          email: "sarah@earlyai.corp",
          role: "hiring_team",
          canonicalRole: "hiring_team",
        },
      },
    });

    const handleSuccess = vi.fn();
    render(
      <AuthPortalView
        initialPortal="candidate"
        initialMode="login"
        onSuccess={handleSuccess}
        onNavigateHome={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "sarah@earlyai.corp" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "Password123!" } });
    fireEvent.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(screen.getByText(/portal mismatch/i)).toBeInTheDocument();
      expect(screen.getByText(/this account is registered as a hiring team \/ recruiter account/i)).toBeInTheDocument();
      expect(handleSuccess).not.toHaveBeenCalled();
    });
  });

  it("5. Candidate login on Recruiter portal triggers safe rejection alert", async () => {
    vi.spyOn(authApi, "login").mockResolvedValueOnce({
      success: true,
      data: {
        user: {
          id: "cand-321",
          name: "Bob Candidate",
          email: "bob@candidate.io",
          role: "candidate",
          canonicalRole: "candidate",
        },
      },
    });

    const handleSuccess = vi.fn();
    render(
      <AuthPortalView
        initialPortal="recruiter"
        initialMode="login"
        onSuccess={handleSuccess}
        onNavigateHome={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: /recruiter sign in/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "bob@candidate.io" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "Password123!" } });
    fireEvent.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(screen.getByText(/portal mismatch/i)).toBeInTheDocument();
      expect(screen.getByText(/candidate accounts cannot access the recruiter hiring workspace/i)).toBeInTheDocument();
      expect(handleSuccess).not.toHaveBeenCalled();
    });
  });

  it("6. Non-administrator login on Admin portal is rejected with 403 authorization error", async () => {
    vi.spyOn(authApi, "login").mockResolvedValueOnce({
      success: true,
      data: {
        user: {
          id: "user-444",
          name: "Staff Member",
          email: "staff@earlyai.corp",
          role: "hiring_team",
          canonicalRole: "hiring_team",
        },
      },
    });

    const handleSuccess = vi.fn();
    render(
      <AuthPortalView
        initialPortal="admin"
        initialMode="login"
        onSuccess={handleSuccess}
        onNavigateHome={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: /administrator sign in/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "staff@earlyai.corp" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "Password123!" } });
    fireEvent.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(screen.getByText(/administrator credentials required/i)).toBeInTheDocument();
      expect(handleSuccess).not.toHaveBeenCalled();
    });
  });

  it("7. Platform manager login on Admin portal succeeds and redirects to platform governance", async () => {
    vi.spyOn(authApi, "login").mockResolvedValueOnce({
      success: true,
      data: {
        user: {
          id: "admin-1",
          name: "Root Admin",
          email: "admin@earlyai.corp",
          role: "platform_manager",
          canonicalRole: "platform_manager",
        },
      },
    });

    const handleSuccess = vi.fn();
    render(
      <AuthPortalView
        initialPortal="admin"
        initialMode="login"
        onSuccess={handleSuccess}
        onNavigateHome={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "admin@earlyai.corp" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "AdminSecret123!" } });
    fireEvent.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ role: "platform_manager", canonicalRole: "platform_manager" })
      );
    });
  });

  it("8. In App workspace, authenticated candidate accessing recruiter overview receives 403 Forbidden", async () => {
    vi.spyOn(authApi, "fetchMe").mockResolvedValue({
      success: true,
      data: {
        user: {
          id: "cand-777",
          name: "Restricted Candidate",
          email: "cand@earlyai.corp",
          role: "candidate",
          canonicalRole: "candidate",
        },
      },
    });

    render(<App initialTab="overview" />);

    await waitFor(() => {
      expect(screen.getByText(/403 — unauthorized workspace access/i)).toBeInTheDocument();
      expect(screen.getByText(/candidate accounts can only access the candidate portal/i)).toBeInTheDocument();
    });
  });

  it("9. In App workspace, authenticated recruiter accessing platform ops receives 403 Forbidden", async () => {
    vi.spyOn(authApi, "fetchMe").mockResolvedValue({
      success: true,
      data: {
        user: {
          id: "recruiter-555",
          name: "Recruiter Only",
          email: "recruiter@earlyai.corp",
          role: "hiring_team",
          canonicalRole: "hiring_team",
        },
      },
    });

    render(<App initialTab="platform" />);

    await waitFor(() => {
      expect(screen.getByText(/403 — platform manager access required/i)).toBeInTheDocument();
      expect(screen.getByText(/only system administrators may view platform operations/i)).toBeInTheDocument();
    });
  });

  it("10. Password visibility control toggles password input type securely", async () => {
    render(
      <AuthPortalView
        initialPortal="candidate"
        initialMode="login"
        onSuccess={vi.fn()}
        onNavigateHome={vi.fn()}
      />
    );

    const passwordInput = screen.getByPlaceholderText(/enter your password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const toggleBtn = screen.getByRole("button", { name: /toggle visibility/i });
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe("text");

    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe("password");
  });
});

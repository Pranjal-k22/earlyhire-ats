import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { App } from "../app/App";
import * as authApi from "../api/authApi";

describe("Phase 8 — Workflow A: Recruiter Authentication & Session UI Verification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // Default mock for API health check
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

  it("1. renders unauthenticated state with Sign In and Register actions when logged out", async () => {
    vi.spyOn(authApi, "fetchMe").mockRejectedValue(new Error("Authentication required (HTTP 401)"));

    render(<App />);

    // Wait for auth check to finish
    await waitFor(() => {
      expect(screen.getByTestId("header-sign-in-button")).toBeInTheDocument();
      expect(screen.getByTestId("header-register-button")).toBeInTheDocument();
    });

    // Jane Doe hardcoded mockup should no longer be present
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
  });

  it("2. opens AuthModal in Login mode and allows toggling to Register mode", async () => {
    vi.spyOn(authApi, "fetchMe").mockRejectedValue(new Error("HTTP 401"));

    render(<App />);

    const signInBtn = await screen.findByTestId("header-sign-in-button");
    fireEvent.click(signInBtn);

    // Modal opens
    expect(screen.getByRole("heading", { name: /sign in to earlyai ats/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    // Toggle to Register mode
    const registerTab = screen.getByTestId("auth-tab-signup");
    fireEvent.click(registerTab);

    expect(screen.getByRole("heading", { name: /create (candidate|recruiter) account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();

    // Close dialog
    const closeBtn = screen.getByRole("button", { name: /close dialog/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /create (candidate|recruiter) account/i })).not.toBeInTheDocument();
    });
  });

  it("3. validates required fields and handles authentication failure with error feedback", async () => {
    vi.spyOn(authApi, "fetchMe").mockRejectedValue(new Error("HTTP 401"));
    vi.spyOn(authApi, "login").mockRejectedValue(new Error("Invalid email or password"));

    render(<App />);

    const signInBtn = await screen.findByTestId("header-sign-in-button");
    fireEvent.click(signInBtn);

    const emailInput = screen.getByLabelText(/work email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByTestId("login-submit-button");

    // Submit with invalid email
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.change(passwordInput, { target: { value: "short" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
    });

    // Provide syntactically valid credentials that fail server verification
    fireEvent.change(emailInput, { target: { value: "recruiter@earlyai.com" } });
    fireEvent.change(passwordInput, { target: { value: "WrongPassword123" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
    });
  });

  it("4. successfully logs in, loads user profile in header, and logs out securely", async () => {
    vi.spyOn(authApi, "fetchMe").mockRejectedValueOnce(new Error("HTTP 401"));
    vi.spyOn(authApi, "login").mockResolvedValueOnce({
      success: true,
      data: {
        user: {
          id: "recruiter-123",
          name: "Alice Recruiter",
          email: "alice@earlyai.com",
          role: "recruiter",
        },
      },
    });
    const logoutSpy = vi.spyOn(authApi, "logout").mockResolvedValueOnce({
      success: true,
      data: { loggedOut: true },
    });

    render(<App />);

    const signInBtn = await screen.findByTestId("header-sign-in-button");
    fireEvent.click(signInBtn);

    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: "alice@earlyai.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "Secret123!" } });
    fireEvent.click(screen.getByTestId("login-submit-button"));

    // User profile appears in header
    await waitFor(() => {
      expect(screen.getByText("Alice Recruiter")).toBeInTheDocument();
      expect(screen.getByText("recruiter")).toBeInTheDocument();
      expect(screen.getByText("AR")).toBeInTheDocument();
    });

    // Open User menu
    const menuBtn = screen.getByRole("button", { name: /user account menu/i });
    fireEvent.click(menuBtn);

    expect(screen.getByText("alice@earlyai.com")).toBeInTheDocument();
    const logoutBtn = screen.getByRole("button", { name: /log out/i });
    fireEvent.click(logoutBtn);

    // Logout was called and session reset
    expect(logoutSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByText("Alice Recruiter")).not.toBeInTheDocument();
      expect(screen.getByTestId("header-sign-in-button")).toBeInTheDocument();
    });
  });

  it("5. automatically loads active recruiter session on browser refresh via HttpOnly cookie", async () => {
    vi.spyOn(authApi, "fetchMe").mockResolvedValueOnce({
      success: true,
      data: {
        user: {
          id: "recruiter-456",
          name: "Bob Manager",
          email: "bob@earlyai.com",
          role: "hiring_manager",
        },
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Bob Manager")).toBeInTheDocument();
      expect(screen.getByText("hiring manager")).toBeInTheDocument();
      expect(screen.getByText("BM")).toBeInTheDocument();
    });

    // Sign in button is not displayed when session is active
    expect(screen.queryByTestId("header-sign-in-button")).not.toBeInTheDocument();
  });
});

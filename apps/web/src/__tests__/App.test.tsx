import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "../app/App";

describe("App Shell Component", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "ok", service: "earlyai-ats-api" }),
      })
    );
  });

  it("renders the brand logo and navigation items", async () => {
    render(<App />);

    expect(screen.getByText("EarlyAI ATS")).toBeInTheDocument();
    expect(screen.getByText("Recruiting Workspace")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Candidates")).toBeInTheDocument();
    expect(screen.getByText("Jobs")).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText(/Service: earlyai-ats-api/)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("renders recruitment metric stage cards", async () => {
    render(<App />);

    expect(screen.getByText("Applied")).toBeInTheDocument();
    expect(screen.getByText("Screening")).toBeInTheDocument();
    expect(screen.getByText("Interview")).toBeInTheDocument();
    expect(screen.getByText("Offer")).toBeInTheDocument();
    expect(screen.getByText("Hired")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText(/Service: earlyai-ats-api/)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });
});

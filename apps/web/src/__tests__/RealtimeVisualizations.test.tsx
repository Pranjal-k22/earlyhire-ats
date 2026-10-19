import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, renderHook } from "@testing-library/react";
import { JobPerformanceChart } from "../features/dashboard/JobPerformanceChart";
import { TopSkillsChart } from "../features/dashboard/TopSkillsChart";
import { ScoreDistributionChart } from "../features/dashboard/ScoreDistributionChart";
import { MonthlyApplicationsChart } from "../features/dashboard/MonthlyApplicationsChart";
import { RealtimeStatusIndicator } from "../features/dashboard/components/RealtimeStatusIndicator";
import { TrendIndicator } from "../features/dashboard/components/TrendIndicator";
import { useRealtimeAnalytics } from "../features/dashboard/useRealtimeAnalytics";
import { JobPerformanceItem, SkillItem, ScoreBucket, ApplicationTrendPoint } from "../types/analytics";

// Mock Recharts ResponsiveContainer to ensure JSDOM renders children
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

describe("Real-time Visualizations & Interactive Components Test Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = vi.fn();
    }
  });

  describe("JobPerformanceChart Component", () => {
    const mockJobs: JobPerformanceItem[] = [
      {
        jobId: "job-1",
        title: "Senior Fullstack Engineer",
        department: "Engineering",
        status: "Open",
        applicationsCount: 24,
        screeningCount: 16,
        interviewCount: 8,
        hiredCount: 2,
        avgScore: 88,
      },
      {
        jobId: "job-2",
        title: "Product Designer",
        department: "Design",
        status: "Open",
        applicationsCount: 12,
        screeningCount: 8,
        interviewCount: 4,
        hiredCount: 1,
        avgScore: 92,
      },
    ];

    it("renders job performance multi-metric comparison and toggles metric tabs", () => {
      const handleSelectJob = vi.fn();
      render(<JobPerformanceChart data={mockJobs} onSelectJob={handleSelectJob} />);

      expect(screen.getByText("Job Role Pipeline Performance")).toBeInTheDocument();
      expect(screen.getByText("Senior Fullstack Engineer")).toBeInTheDocument();
      expect(screen.getByText("Product Designer")).toBeInTheDocument();

      // Switch to Interviews metric tab
      const interviewBtn = screen.getByRole("button", { name: /^Interviews$/i });
      fireEvent.click(interviewBtn);
      expect(interviewBtn).toHaveClass("text-purple-700");

      // Switch to Hires metric tab
      const hiresBtn = screen.getByRole("button", { name: /^Hires$/i });
      fireEvent.click(hiresBtn);
      expect(hiresBtn).toHaveClass("text-purple-700");
    });

    it("renders accessible empty state when data is empty", () => {
      render(<JobPerformanceChart data={[]} />);
      expect(screen.getByText("No job performance recorded")).toBeInTheDocument();
    });
  });

  describe("TopSkillsChart Component", () => {
    const mockSkills: SkillItem[] = [
      { skill: "TypeScript", count: 18, percentage: 45 },
      { skill: "React", count: 14, percentage: 35 },
      { skill: "Node.js", count: 8, percentage: 20 },
    ];

    it("renders skills list and percentages correctly", () => {
      render(<TopSkillsChart skills={mockSkills} />);

      expect(screen.getByText("Top Skills Detected")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
      expect(screen.getByText("(18)")).toBeInTheDocument();
      expect(screen.getByText("React")).toBeInTheDocument();
    });

    it("renders empty state when no skills recorded", () => {
      render(<TopSkillsChart skills={[]} />);
      expect(screen.getByText("No skills recorded")).toBeInTheDocument();
    });
  });

  describe("ScoreDistributionChart Component", () => {
    const mockBuckets: ScoreBucket[] = [
      { range: "0-40", count: 2, percentage: 10 },
      { range: "41-60", count: 4, percentage: 20 },
      { range: "61-80", count: 8, percentage: 40 },
      { range: "81-100", count: 6, percentage: 30 },
    ];

    it("renders score brackets with badge breakdown", () => {
      render(<ScoreDistributionChart data={mockBuckets} />);

      expect(screen.getByText("ATS Score Distribution")).toBeInTheDocument();
      expect(screen.getByText("0-40:")).toBeInTheDocument();
      expect(screen.getByText("81-100:")).toBeInTheDocument();
      expect(screen.getByText("(10%)")).toBeInTheDocument();
      expect(screen.getByText("(30%)")).toBeInTheDocument();
    });

    it("renders empty state when scores are zero", () => {
      render(
        <ScoreDistributionChart
          data={[
            { range: "0-40", count: 0, percentage: 0 },
            { range: "41-60", count: 0, percentage: 0 },
          ]}
        />
      );
      expect(screen.getByText("No ATS scores evaluated")).toBeInTheDocument();
    });
  });

  describe("MonthlyApplicationsChart Component", () => {
    const mockTrends: ApplicationTrendPoint[] = [
      { date: "2026-10-01", label: "Oct 1", applications: 5, screenings: 3, interviews: 1, hires: 0 },
      { date: "2026-10-02", label: "Oct 2", applications: 8, screenings: 5, interviews: 2, hires: 1 },
    ];

    it("renders area chart and allows CSV export", () => {
      render(<MonthlyApplicationsChart data={mockTrends} />);

      expect(screen.getByText("Application Volume Trends")).toBeInTheDocument();
      const exportBtn = screen.getByRole("button", { name: "Export trend series as CSV" });
      expect(exportBtn).toBeInTheDocument();

      // Trigger export
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
      fireEvent.click(exportBtn);
      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it("renders empty state when no trends exist", () => {
      render(<MonthlyApplicationsChart data={[]} />);
      expect(screen.getByText("No trend data recorded")).toBeInTheDocument();
    });
  });

  describe("RealtimeStatusIndicator Component", () => {
    it("renders connected live status with green indicator", () => {
      render(
        <RealtimeStatusIndicator
          status="connected"
          lastUpdated="2026-10-19T12:00:00.000Z"
        />
      );

      expect(screen.getByTestId("realtime-status-connected")).toBeInTheDocument();
      expect(screen.getByText("Live Real-Time Active")).toBeInTheDocument();
    });

    it("renders reconnecting state with warning icon", () => {
      render(
        <RealtimeStatusIndicator
          status="reconnecting"
          lastUpdated={null}
        />
      );

      expect(screen.getByTestId("realtime-status-reconnecting")).toBeInTheDocument();
      expect(screen.getByText("Reconnecting...")).toBeInTheDocument();
    });

    it("renders offline state with fallback polling indicator", () => {
      render(
        <RealtimeStatusIndicator
          status="offline"
          lastUpdated={null}
        />
      );

      expect(screen.getByTestId("realtime-status-offline")).toBeInTheDocument();
      expect(screen.getByText("Offline (Polling fallback)")).toBeInTheDocument();
    });
  });

  describe("TrendIndicator Component", () => {
    it("renders positive trend with green styling and up arrow", () => {
      render(<TrendIndicator percentageChange={25.4} direction="up" />);
      const indicator = screen.getByTestId("trend-indicator");
      expect(indicator).toHaveTextContent("+25.4%");
      expect(indicator).toHaveClass("text-emerald-700");
    });

    it("renders negative trend with rose styling and down arrow", () => {
      render(<TrendIndicator percentageChange={-14.2} direction="down" />);
      const indicator = screen.getByTestId("trend-indicator");
      expect(indicator).toHaveTextContent("-14.2%");
      expect(indicator).toHaveClass("text-rose-700");
    });

    it("renders neutral 'No prior data to compare' badge for null values", () => {
      render(<TrendIndicator percentageChange={null} />);
      expect(screen.getByTestId("trend-indicator-neutral")).toHaveTextContent("No prior data to compare");
    });
  });

  describe("useRealtimeAnalytics Hook", () => {
    it("safely handles event source subscription and cleanup", () => {
      const handleInvalidate = vi.fn();
      const mockClose = vi.fn();

      class MockEventSource {
        static OPEN = 1;
        readyState = 1;
        onopen: (() => void) | null = null;
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        addEventListener = vi.fn();
        removeEventListener = vi.fn();
        close = mockClose;
      }

      vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);

      const { unmount } = renderHook(() =>
        useRealtimeAnalytics({
          onInvalidate: handleInvalidate,
          enabled: true,
          debounceMs: 50,
        })
      );

      unmount();
      expect(mockClose).toHaveBeenCalled();
    });
  });
});

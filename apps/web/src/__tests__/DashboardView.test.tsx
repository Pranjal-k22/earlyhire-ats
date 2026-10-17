import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { DashboardView } from "../features/dashboard/DashboardView";

import { DashboardOverviewData, FunnelData } from "../types/analytics";

// Mock Recharts ResponsiveContainer to ensure JSDOM renders child SVG charts
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

const mockOverviewData = {
  success: true,
  data: {
    period: {
      from: null,
      to: null,
      label: "All Time",
    },
    totals: {
      totalCandidates: 25,
      openPositions: 4,
      hiredCandidates: 6,
      rejectedCandidates: 3,
      activeApplications: 18,
    },
    applicationsByStage: {
      Applied: 5,
      Screening: 4,
      Interview: 3,
      Offer: 2,
      Hired: 6,
      Rejected: 3,
    },
    conversion: {
      screeningRate: 0.7222,
      interviewRate: 0.6154,
      offerAcceptanceRate: 0.8571,
      offerToHireRate: 0.8571,
    },
    sourcing: [
      { source: "LinkedIn", count: 10, percentage: 55.6 },
      { source: "Referral", count: 5, percentage: 27.8 },
      { source: "CareerPage", count: 3, percentage: 16.7 },
    ],
    averageTimeInStageMs: {
      Applied: 172800000, // 2 days
      Screening: 259200000, // 3 days
      Interview: 432000000, // 5 days
      Offer: 86400000, // 1 day
    },
    generatedAt: "2026-10-17T12:00:00.000Z",
  },
};

const mockFunnelData = {
  success: true,
  data: {
    period: {
      from: null,
      to: null,
      label: "All Time",
    },
    totalCohortApplications: 18,
    stages: [
      {
        stage: "Applied",
        count: 18,
        conversionRateFromPrevious: 1.0,
        dropoffRateFromPrevious: 0,
      },
      {
        stage: "Screening",
        count: 13,
        conversionRateFromPrevious: 0.7222,
        dropoffRateFromPrevious: 0.2778,
      },
      {
        stage: "Interview",
        count: 8,
        conversionRateFromPrevious: 0.6154,
        dropoffRateFromPrevious: 0.3846,
      },
      {
        stage: "Offer",
        count: 7,
        conversionRateFromPrevious: 0.875,
        dropoffRateFromPrevious: 0.125,
      },
      {
        stage: "Hired",
        count: 6,
        conversionRateFromPrevious: 0.8571,
        dropoffRateFromPrevious: 0.1429,
      },
    ],
    offerAcceptance: {
      offersExtended: 7,
      offersAccepted: 6,
      offersRejected: 1,
      pendingOffers: 0,
      acceptanceRate: 0.8571,
    },
    generatedAt: "2026-10-17T12:00:00.000Z",
  },
};

const mockEmptyOverviewData = {
  success: true,
  data: {
    period: {
      from: null,
      to: null,
      label: "All Time",
    },
    totals: {
      totalCandidates: 0,
      openPositions: 0,
      hiredCandidates: 0,
      rejectedCandidates: 0,
      activeApplications: 0,
    },
    applicationsByStage: {
      Applied: 0,
      Screening: 0,
      Interview: 0,
      Offer: 0,
      Hired: 0,
      Rejected: 0,
    },
    conversion: {
      screeningRate: null,
      interviewRate: null,
      offerAcceptanceRate: null,
      offerToHireRate: null,
    },
    sourcing: [],
    averageTimeInStageMs: {
      Applied: null,
      Screening: null,
      Interview: null,
      Offer: null,
    },
    generatedAt: "2026-10-17T12:00:00.000Z",
  },
};

const mockEmptyFunnelData = {
  success: true,
  data: {
    period: {
      from: null,
      to: null,
      label: "All Time",
    },
    totalCohortApplications: 0,
    stages: [
      {
        stage: "Applied",
        count: 0,
        conversionRateFromPrevious: null,
        dropoffRateFromPrevious: null,
      },
      {
        stage: "Screening",
        count: 0,
        conversionRateFromPrevious: null,
        dropoffRateFromPrevious: null,
      },
      {
        stage: "Interview",
        count: 0,
        conversionRateFromPrevious: null,
        dropoffRateFromPrevious: null,
      },
      {
        stage: "Offer",
        count: 0,
        conversionRateFromPrevious: null,
        dropoffRateFromPrevious: null,
      },
      {
        stage: "Hired",
        count: 0,
        conversionRateFromPrevious: null,
        dropoffRateFromPrevious: null,
      },
    ],
    offerAcceptance: {
      offersExtended: 0,
      offersAccepted: 0,
      offersRejected: 0,
      pendingOffers: 0,
      acceptanceRate: null,
    },
    generatedAt: "2026-10-17T12:00:00.000Z",
  },
};

describe("DashboardView Component — Phase 7 Recruitment Analytics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const setupMockFetch = (
    overviewResponse: { success: boolean; data: DashboardOverviewData } = mockOverviewData,
    funnelResponse: { success: boolean; data: FunnelData } = mockFunnelData
  ) => {
    return vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/analytics/overview")) {
        return Promise.resolve({
          ok: true,
          json: async () => overviewResponse,
        });
      }
      if (url.includes("/api/v1/analytics/funnel")) {
        return Promise.resolve({
          ok: true,
          json: async () => funnelResponse,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ status: "ok" }),
      });
    });
  };

  it("1. renders loading skeleton initially before API data resolves", async () => {
    // Delay resolution to capture loading skeleton
    let resolveOverview!: (value: unknown) => void;
    const overviewPromise = new Promise((resolve) => {
      resolveOverview = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/overview")) {
          return overviewPromise.then(() => ({
            ok: true,
            json: async () => mockOverviewData,
          }));
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockFunnelData,
        });
      })
    );

    render(<DashboardView />);

    expect(screen.getByTestId("dashboard-loading-skeleton")).toBeInTheDocument();

    // Now resolve fetch
    resolveOverview(true);

    await waitFor(() => {
      expect(screen.queryByTestId("dashboard-loading-skeleton")).not.toBeInTheDocument();
      expect(screen.getByTestId("dashboard-content")).toBeInTheDocument();
    });
  });

  it("2. successfully renders top KPI metric cards with server-supplied numbers", async () => {
    vi.stubGlobal("fetch", setupMockFetch());

    render(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByText("Total Active Candidates")).toBeInTheDocument();
    });

    // Verify 4 primary KPI cards have correct numbers via their scoped testIds
    const totalCandidatesCard = screen.getByTestId("metric-card-total-active-candidates");
    expect(totalCandidatesCard).toHaveTextContent("25");

    const openPositionsCard = screen.getByTestId("metric-card-open-job-positions");
    expect(openPositionsCard).toHaveTextContent("4");

    const hiredCard = screen.getByTestId("metric-card-hired-candidates");
    expect(hiredCard).toHaveTextContent("6");

    const rejectedCard = screen.getByTestId("metric-card-rejected-candidates");
    expect(rejectedCard).toHaveTextContent("3");
  });

  it("3. renders recruitment conversion highlights and percentage formatting", async () => {
    vi.stubGlobal("fetch", setupMockFetch());

    render(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByText("Screening Conversion")).toBeInTheDocument();
    });

    // 0.7222 * 100 = 72.2%
    expect(screen.getByText("72.2%")).toBeInTheDocument();
    // 0.6154 * 100 = 61.5%
    expect(screen.getByText("61.5%")).toBeInTheDocument();
    // 0.8571 * 100 = 85.7%
    expect(screen.getAllByText("85.7%").length).toBeGreaterThanOrEqual(1);
  });

  it("4. renders applications by stage distribution with counts and percentages", async () => {
    vi.stubGlobal("fetch", setupMockFetch());

    render(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByTestId("stage-distribution-chart")).toBeInTheDocument();
    });

    // Verify total active badge (5+4+3+2+6+3 = 23)
    expect(screen.getByText("23 Active Total")).toBeInTheDocument();
    expect(screen.getByText("Applications by Stage")).toBeInTheDocument();
  });

  it("5. renders recruitment funnel throughput with step progression and dropoffs", async () => {
    vi.stubGlobal("fetch", setupMockFetch());

    render(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByTestId("recruitment-funnel-chart")).toBeInTheDocument();
    });

    expect(screen.getByText("Cohort: 18 Apps")).toBeInTheDocument();
    expect(screen.getByText("1. Applied")).toBeInTheDocument();
    expect(screen.getByText("2. Screening")).toBeInTheDocument();
    expect(screen.getByText("3. Interview")).toBeInTheDocument();
    expect(screen.getByText("4. Offer")).toBeInTheDocument();
    expect(screen.getByText("5. Hired")).toBeInTheDocument();

    // Verify Offer Acceptance Banner
    expect(screen.getByText(/6 accepted \/ 7 resolved offers/)).toBeInTheDocument();
  });

  it("6. renders candidate sourcing channels and velocity durations", async () => {
    vi.stubGlobal("fetch", setupMockFetch());

    render(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByTestId("sourcing-distribution-card")).toBeInTheDocument();
      expect(screen.getByTestId("stage-duration-card")).toBeInTheDocument();
    });

    // Sourcing
    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByText("(55.6%)")).toBeInTheDocument();
    expect(screen.getByText("Referral")).toBeInTheDocument();

    // Stage Velocity (ms formatted into days/hours)
    // 172800000 ms = 2d
    expect(screen.getByText("2d")).toBeInTheDocument();
    // 259200000 ms = 3d
    expect(screen.getByText("3d")).toBeInTheDocument();
    // 432000000 ms = 5d
    expect(screen.getByText("5d")).toBeInTheDocument();
    // 86400000 ms = 1d
    expect(screen.getByText("1d")).toBeInTheDocument();
  });

  it("7. correctly handles empty dataset with valid zeros and '—' for undefined conversion rates", async () => {
    vi.stubGlobal("fetch", setupMockFetch(mockEmptyOverviewData, mockEmptyFunnelData));

    render(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-content")).toBeInTheDocument();
    });

    // Zero KPI values
    const zeroElements = screen.getAllByText("0");
    expect(zeroElements.length).toBeGreaterThanOrEqual(4);

    // Undefined conversions display em-dash "—" rather than a fabricated "0%"
    const dashElements = screen.getAllByText("—");
    expect(dashElements.length).toBeGreaterThanOrEqual(3);

    // Empty states for visualizations
    expect(
      screen.getByText("No active applications in this date range.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No cohort applications recorded for this period.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No sourcing data available for this date range.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No completed stage movements recorded yet.")
    ).toBeInTheDocument();
  });

  it("8. handles date range preset selection and refetches data", async () => {
    const fetchMock = setupMockFetch();
    vi.stubGlobal("fetch", fetchMock);

    render(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByText("Last 30 Days")).toBeInTheDocument();
    });

    // Click "Last 30 Days" preset
    fireEvent.click(screen.getByText("Last 30 Days"));

    await waitFor(() => {
      // Check that fetch was called with period=30d
      const calledWith30d = fetchMock.mock.calls.some((call) =>
        String(call[0]).includes("period=30d")
      );
      expect(calledWith30d).toBe(true);
    });
  });

  it("9. validates custom date ranges and prevents start date > end date", async () => {
    const fetchMock = setupMockFetch();
    vi.stubGlobal("fetch", fetchMock);

    render(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByLabelText("Filter from date")).toBeInTheDocument();
    });

    const fromInput = screen.getByLabelText("Filter from date");
    const toInput = screen.getByLabelText("Filter to date");
    const applyBtn = screen.getByRole("button", { name: /^Apply$/i });

    // Set invalid reversed range: from 2026-10-20, to 2026-10-10
    fireEvent.change(fromInput, { target: { value: "2026-10-20" } });
    fireEvent.change(toInput, { target: { value: "2026-10-10" } });
    fireEvent.click(applyBtn);

    // Should show validation error and NOT trigger fetch
    expect(
      screen.getByText("Start date cannot be after end date.")
    ).toBeInTheDocument();

    const invalidFetch = fetchMock.mock.calls.some(
      (call) =>
        String(call[0]).includes("from=2026-10-20") &&
        String(call[0]).includes("to=2026-10-10")
    );
    expect(invalidFetch).toBe(false);

    // Now correct to valid range
    fireEvent.change(fromInput, { target: { value: "2026-10-01" } });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      const validFetch = fetchMock.mock.calls.some(
        (call) =>
          String(call[0]).includes("from=2026-10-01") &&
          String(call[0]).includes("to=2026-10-10")
      );
      expect(validFetch).toBe(true);
    });
  });

  it("10. displays error banner on API failure and retries successfully", async () => {
    let shouldFail = true;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (shouldFail) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ message: "Database connection failed" }),
          });
        }
        if (url.includes("/overview")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockOverviewData,
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockFunnelData,
        });
      })
    );

    render(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByTestId("analytics-error-banner")).toBeInTheDocument();
      expect(screen.getByText("Database connection failed")).toBeInTheDocument();
    });

    // Next attempt succeeds
    shouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(screen.queryByTestId("analytics-error-banner")).not.toBeInTheDocument();
      expect(screen.getByTestId("dashboard-content")).toBeInTheDocument();
    });
  });
});

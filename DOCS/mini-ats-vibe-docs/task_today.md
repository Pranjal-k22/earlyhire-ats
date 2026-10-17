# Mini ATS — Task Today

> Replace this file's active task at the start of each focused work session. Keep one primary outcome per session. Do not use this file as a second PRD.

## Session metadata

- **Date:** 2026-10-17
- **Phase:** Phase 7 — Dashboard, Recruitment Analytics & Data-Driven KPIs
- **Time box:** 4 hours (Hours 28–32)
- **Status:** Phase 7 Completed & Verified (PASS).
- **Branch:** `feat/phase-7-analytics`.

## Current task

Implement recruitment analytics dashboard with real-time KPI overview cards, 6-stage application distribution, funnel throughput and conversion rates (Screening, Interview, Offer Acceptance), candidate sourcing breakdown, completed stage velocity durations, date-range filters (presets and custom UTC range), and comprehensive automated testing.

## Requirements

- [x] Phase 0 metric definitions & data integrity: documented explicit formulas in `Architecture.md` distinguishing distinct candidate KPIs from application stage counts.
- [x] Backend Analytics Data Layer:
  - Added indexes on `Application` (`{ currentStage: 1, status: 1 }`, `{ appliedAt: 1, status: 1 }`) and `InterviewStageHistory` (`{ fromStage: 1, toStage: 1 }`, `{ fromStage: 1, durationMsFromPreviousStage: 1 }`).
  - Created Zod validation schema `analyticsQuerySchema` validating `period` ("7d", "30d", "90d", "all"), `from`, `to`, with `from <= to` constraint and inclusive UTC end-of-day handling.
  - Implemented `getDashboardOverview` aggregating total active candidates, open jobs, distinct hired/rejected candidates, active application distribution by stage, screening conversion, interview conversion, offer acceptance (strictly excluding unresolved offers from denominator), candidate sourcing breakdown, and average completed stage duration in ms.
  - Implemented `getRecruitmentFunnel` calculating step-by-step funnel throughput and dropoff rates.
  - Provided backwards-compatible alias `GET /api/v1/dashboard/metrics`.
- [x] Frontend Analytics UI:
  - Installed `recharts` and created responsive, accessible visualization components using brand-blue and amber tokens.
  - Created `MetricCard` for primary KPI metrics with badge indicators and scoped test IDs.
  - Created `DateRangeSelector` with preset buttons ("7d", "30d", "90d", "all") and custom date inputs with client-side range validation.
  - Created `StageDistributionChart` with Recharts `BarChart` for 6 hiring stages with accessible summary metrics.
  - Created `FunnelChart` with progress bars, conversion & dropoff flags, and Offer Acceptance spotlight banner.
  - Created `SourcingChart` with origin channel progress bars and percentages.
  - Created `StageDurationCard` with human-readable duration formatting (days, hours, minutes).
  - Created `DashboardView` orchestrating data loading, loading skeletons, error banner with retry, and filter state.
  - Integrated `DashboardView` into `App.tsx` Overview tab along with pipeline quick-nav bar.
- [x] Automated Tests:
  - Backend: 15 integration tests in `apps/api/src/__tests__/analytics.test.ts` covering distinct candidate counts, stage distributions, cohort conversions, zero-denominators, date filtering, invalid inputs, unauthenticated 401s, and admin authorization.
  - Frontend: 10 tests in `apps/web/src/__tests__/DashboardView.test.tsx` covering skeletons, KPI rendering, Recharts data, empty dataset states ("—" for undefined conversions), preset selection, custom date validation, and API retry.
  - Regressions: All 7 backend test suites (126 tests) and all 6 frontend test suites (37 tests) pass with exit code 0 (total 163 passing tests).
- [x] Verification Gate:
  - `npm run lint`: PASSED (0 errors).
  - `npm run typecheck`: PASSED (0 errors across web and api workspaces).
  - `npm test`: PASSED (163/163 tests passed across 13 test suites).
  - `npm run build`: PASSED (clean production builds generated for web and api).

## Constraints / guardrails

- Strictly no AI-based analytics, candidate scoring, or third-party scheduling.
- Denominators with 0 values return `null` / render "—" (never fabricate a 0%).
- Unresolved pending offers are strictly excluded from the Offer Acceptance denominator.
- Distinct candidate IDs are counted for talent/people-level metrics (`hiredCandidates`, `rejectedCandidates`).
- Server-side MongoDB aggregations are used rather than in-memory JavaScript collection processing.

## Completion gate

```bash
npm run lint       # PASSED (exit code 0)
npm run typecheck  # PASSED (exit code 0 across web and api workspaces)
npm test           # PASSED (exit code 0, 163/163 tests passing across 13 test suites)
npm run build      # PASSED (exit code 0, production bundles generated)
```

## Session result

- **Outcome:** Phase 7 Recruitment Analytics & Dashboard end-to-end verified.
- **Files created/modified:**
  - Backend: `apps/api/src/models/application.model.ts`, `apps/api/src/models/stageHistory.model.ts`, `apps/api/src/schemas/analytics.schema.ts`, `apps/api/src/controllers/analytics.controller.ts`, `apps/api/src/routes/analytics.routes.ts`, `apps/api/src/app.ts`, `apps/api/src/__tests__/analytics.test.ts`.
  - Frontend: `apps/web/package.json`, `apps/web/src/types/analytics.ts`, `apps/web/src/api/analyticsApi.ts`, `apps/web/src/features/dashboard/MetricCard.tsx`, `apps/web/src/features/dashboard/DateRangeSelector.tsx`, `apps/web/src/features/dashboard/StageDistributionChart.tsx`, `apps/web/src/features/dashboard/FunnelChart.tsx`, `apps/web/src/features/dashboard/SourcingChart.tsx`, `apps/web/src/features/dashboard/StageDurationCard.tsx`, `apps/web/src/features/dashboard/DashboardView.tsx`, `apps/web/src/app/App.tsx`, `apps/web/src/__tests__/DashboardView.test.tsx`.
  - Documentation: `DOCS/mini-ats-vibe-docs/audit.md`, `DOCS/mini-ats-vibe-docs/testing.md`, `DOCS/mini-ats-vibe-docs/bugs.md`, `DOCS/mini-ats-vibe-docs/task_today.md`, `DOCS/mini-ats-vibe-docs/Architecture.md`, `DOCS/MANUAL_ACTIONS.md`.
- **Exit code:** 0 (All gates passed).

# Mini ATS — Task Today

> Replace this file's active task at the start of each focused work session. Keep one primary outcome per session. Do not use this file as a second PRD.

## Session metadata

- **Date:** 2026-10-17
- **Phase:** Phase 3 — Job Management (End-to-End Implementation)
- **Time box:** 4 hours (Hours 12–16)
- **Status:** Phase 3 Completed & Verified (PASS).
- **Branch:** `feat/phase-3-jobs`.

## Current task

Implement end-to-end job opening management covering Mongoose Job model, Zod validation schemas, REST API endpoints under `/api/v1/jobs` (create, list with pagination/search/status filters, getById, update, soft-archive deletion), role-based write protections, and a responsive React frontend interface with list views, detail modal, create/edit modal with validation error states, loading skeletons, and empty states.

## Requirements

- [x] Read `Architecture-essentials.md`, `Architecture.md`, `prd.md`, and design references.
- [x] Implement Mongoose `Job` schema with enums (`Open`, `Paused`, `Closed`, `Archived`), experience range, owner reference, compound indexes, and toJSON transforms (`apps/api/src/models/job.model.ts`).
- [x] Implement Zod validation schemas (`createJobSchema`, `updateJobSchema`, `jobQuerySchema`) with query coercion and case-insensitive status handling (`apps/api/src/schemas/job.schema.ts`).
- [x] Implement REST controllers (`createJob`, `getJobs`, `getJobById`, `updateJob`, `deleteJob`) enforcing soft-archive deletion and bounded pagination (`apps/api/src/controllers/job.controller.ts`).
- [x] Secure routes with `requireAuth` and `requireRole("admin", "recruiter")` for mutating operations (`apps/api/src/routes/job.routes.ts`).
- [x] Build frontend type definitions and API client (`apps/web/src/types/job.ts`, `apps/web/src/api/jobApi.ts`).
- [x] Implement UI components: `JobStatusBadge`, `JobFormModal` (React Hook Form + Zod), `JobDetailModal`, and `JobsView` (`apps/web/src/features/jobs/`).
- [x] Integrate Jobs management into main navigation tabs in `apps/web/src/app/App.tsx`.
- [x] Write 14 backend integration test scenarios covering CRUD, pagination, filtering, soft-archive, ObjectId validation, and RBAC permissions (`apps/api/src/__tests__/job.test.ts`).
- [x] Write 5 frontend component test scenarios verifying loading, populated, empty, error/retry states, and modal interactions (`apps/web/src/__tests__/JobsView.test.tsx`).
- [x] Update documentation (`audit.md`, `testing.md`, `bugs.md`, `task_today.md`, `MANUAL_ACTIONS.md`).

## Constraints / guardrails

- Strictly do not implement candidate CRUD, applications, pipeline stage transitions, dashboard analytics, or AI features in Phase 3.
- Never hard-delete job records (`DELETE /api/v1/jobs/:id` sets `archivedAt` and `status: "Archived"`).
- Never trust client-supplied creator IDs or roles.
- Exclude archived jobs by default from listings unless explicitly requested.

## Completion gate

Before marking this task complete, run every configured check:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Session result (fill in after work)

- **Outcome:** Phase 3 Job Management end-to-end implementation completed and verified.
- **Files created/modified:**
  - Backend: `apps/api/src/models/job.model.ts`, `apps/api/src/schemas/job.schema.ts`, `apps/api/src/controllers/job.controller.ts`, `apps/api/src/routes/job.routes.ts`, `apps/api/src/app.ts`, `apps/api/src/__tests__/job.test.ts`, `apps/api/package.json`.
  - Frontend: `apps/web/src/types/job.ts`, `apps/web/src/api/jobApi.ts`, `apps/web/src/features/jobs/JobStatusBadge.tsx`, `apps/web/src/features/jobs/JobFormModal.tsx`, `apps/web/src/features/jobs/JobDetailModal.tsx`, `apps/web/src/features/jobs/JobsView.tsx`, `apps/web/src/app/App.tsx`, `apps/web/src/__tests__/JobsView.test.tsx`, `apps/web/package.json`.
  - Documentation: `DOCS/mini-ats-vibe-docs/audit.md`, `DOCS/mini-ats-vibe-docs/testing.md`, `DOCS/mini-ats-vibe-docs/bugs.md`, `DOCS/mini-ats-vibe-docs/task_today.md`, `DOCS/MANUAL_ACTIONS.md`.
- **Commands run / exit codes:**
  - `npm run lint`: exit code 0 (0 errors, 0 warnings across monorepo)
  - `npm run typecheck`: exit code 0 (strict mode passes on both workspaces)
  - `npm test`: exit code 0 (41 tests passed across 5 test suites: `App.test.tsx` [2 passed], `JobsView.test.tsx` [5 passed], `health.test.ts` [2 passed], `auth.test.ts` [18 passed], `job.test.ts` [14 passed])
  - `npm run build`: exit code 0 (Vite client built `apps/web/dist`, `tsc` compiled `apps/api/dist`)
- **Tests:** 41 passed, 0 failed.
- **Blockers / decisions needed:** None.
- **Next task:** Begin Phase 4 — Candidate Management (Candidate CRUD, email normalization, resume URLs, search & filters).

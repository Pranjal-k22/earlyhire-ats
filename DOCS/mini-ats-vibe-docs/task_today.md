# Mini ATS — Task Today

> Replace this file's active task at the start of each focused work session. Keep one primary outcome per session. Do not use this file as a second PRD.

## Session metadata

- **Date:** 2026-10-17
- **Phase:** Phase 4 — Candidate Management (Backend, Frontend, Testing & Git Verification)
- **Time box:** 4 hours (Hours 16–20)
- **Status:** Phase 4 Completed & Verified (PASS).
- **Branch:** `feat/phase-4-candidates`.

## Current task

Implement end-to-end Candidate Management covering Mongoose Candidate schema, Zod validation schemas, REST API endpoints under `/api/v1/candidates` (create, list with pagination/search/source/date filters, getById, update, soft-archive deletion), role-based write protections, and a responsive React frontend interface with list views, profile detail modal, create/edit modal with validation error states, loading skeletons, and empty states.

## Requirements

- [x] Read `Architecture-essentials.md`, `Architecture.md`, `prd.md`, and design references.
- [x] Implement Mongoose `Candidate` schema with unique active email validation, phone, experienceYears, skills, resumeUrl, source enum, audit references (`createdBy`, `updatedBy`), compound indexes, and toJSON transforms (`apps/api/src/models/candidate.model.ts`).
- [x] Implement Zod validation schemas (`createCandidateSchema`, `updateCandidateSchema`, `candidateQuerySchema`) with casing normalization, phone format validation, and URL validation (`apps/api/src/schemas/candidate.schema.ts`).
- [x] Implement REST controllers (`createCandidate`, `getCandidates`, `getCandidateById`, `updateCandidate`, `deleteCandidate`) enforcing soft-archive deletion, 409 duplicate active email response, and bounded pagination (`apps/api/src/controllers/candidate.controller.ts`).
- [x] Secure routes with `requireAuth` and `requireRole("admin", "recruiter")` for mutating operations (`apps/api/src/routes/candidate.routes.ts`, mounted in `apps/api/src/app.ts`).
- [x] Build frontend type definitions and API client (`apps/web/src/types/candidate.ts`, `apps/web/src/api/candidateApi.ts`).
- [x] Implement UI components: `CandidateSourceBadge`, `CandidateFormModal` (React Hook Form + Zod), `CandidateDetailModal`, and `CandidatesView` (`apps/web/src/features/candidates/`).
- [x] Integrate Candidate directory into main navigation tabs in `apps/web/src/app/App.tsx`.
- [x] Write 22 backend integration test scenarios covering CRUD, pagination, name/email/skill search, source/date filtering, soft-archive, ObjectId validation, 409 duplicates, and RBAC permissions (`apps/api/src/__tests__/candidate.test.ts`).
- [x] Write 6 frontend component test scenarios verifying loading, populated, empty, error/retry states, detail view, and modal interactions (`apps/web/src/__tests__/CandidatesView.test.tsx`).
- [x] Update documentation (`audit.md`, `testing.md`, `bugs.md`, `task_today.md`, `MANUAL_ACTIONS.md`).

## Constraints / guardrails

- Strictly do not implement candidate-job application linking, pipeline stage transitions, dashboard analytics, or AI features in Phase 4.
- Candidate is an independent person record; do not place `jobId` or `currentStage` on the Candidate model.
- Never hard-delete candidate records (`DELETE /api/v1/candidates/:id` sets `archivedAt` timestamp).
- Never trust client-supplied creator IDs or roles.
- Exclude archived candidates by default from listings unless explicitly requested.

## Completion gate

Before marking this task complete, run every configured check:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Session result (fill in after work)

- **Outcome:** Phase 4 Candidate Management end-to-end implementation completed and verified.
- **Files created/modified:**
  - Backend: `apps/api/src/models/candidate.model.ts`, `apps/api/src/schemas/candidate.schema.ts`, `apps/api/src/controllers/candidate.controller.ts`, `apps/api/src/routes/candidate.routes.ts`, `apps/api/src/app.ts`, `apps/api/src/__tests__/candidate.test.ts`.
  - Frontend: `apps/web/src/types/candidate.ts`, `apps/web/src/api/candidateApi.ts`, `apps/web/src/features/candidates/CandidateSourceBadge.tsx`, `apps/web/src/features/candidates/CandidateFormModal.tsx`, `apps/web/src/features/candidates/CandidateDetailModal.tsx`, `apps/web/src/features/candidates/CandidatesView.tsx`, `apps/web/src/app/App.tsx`, `apps/web/src/__tests__/CandidatesView.test.tsx`.
  - Documentation: `DOCS/mini-ats-vibe-docs/audit.md`, `DOCS/mini-ats-vibe-docs/testing.md`, `DOCS/mini-ats-vibe-docs/bugs.md`, `DOCS/mini-ats-vibe-docs/task_today.md`, `DOCS/MANUAL_ACTIONS.md`.
- **Commands run / exit codes:**
  - `npm run lint`: exit code 0 (0 errors, 0 warnings across monorepo)
  - `npm run typecheck`: exit code 0 (strict mode passes on both workspaces)
  - `npm test`: exit code 0 (69 tests passed across 7 test suites: `App.test.tsx` [2 passed], `JobsView.test.tsx` [5 passed], `CandidatesView.test.tsx` [6 passed], `health.test.ts` [2 passed], `auth.test.ts` [18 passed], `job.test.ts` [14 passed], `candidate.test.ts` [22 passed])
  - `npm run build`: exit code 0 (Vite client built `apps/web/dist`, `tsc` compiled `apps/api/dist`)
- **Tests:** 69 passed, 0 failed.
- **Blockers / decisions needed:** None.
- **Next task:** Begin Phase 5 — Applications & Hiring Pipeline (Link Candidate to Job, stage transitions, immutable stage history).

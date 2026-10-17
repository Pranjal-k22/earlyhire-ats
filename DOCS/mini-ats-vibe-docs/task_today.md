# Mini ATS — Task Today

> Replace this file's active task at the start of each focused work session. Keep one primary outcome per session. Do not use this file as a second PRD.

## Session metadata

- **Date:** 2026-10-17
- **Phase:** Phase 5 — Applications, Hiring Pipeline & Stage History
- **Time box:** 4 hours (Hours 20–24)
- **Status:** Phase 5 Completed & Verified (PASS).
- **Branch:** `feat/phase-5-applications-pipeline`.

## Current task

Implement application management and the hiring pipeline workflow connecting Candidates and Jobs into applications, enforcing server-side state-machine transitions, preventing duplicate active applications via unique compound index, appending immutable stage-history audit records, and building a responsive 6-stage Kanban pipeline UI with stage advance/rejection controls.

## Requirements

- [x] Read `Architecture-essentials.md`, `Architecture.md`, `prd.md`, and design references.
- [x] Implement Mongoose `Application` schema with `candidateId`, `jobId`, `recruiterId`, `stage`/`currentStage`, `status`, `appliedAt`, `lastStageChangedAt`, `rejectedAt`, `hiredAt`, `source`, `version`, and unique compound index `{ candidateId: 1, jobId: 1 }` (`apps/api/src/models/application.model.ts`).
- [x] Implement Mongoose `InterviewStageHistory` schema tracking `applicationId`, `fromStage`, `toStage`, `actorId`, `changedAt`, `reason`, and `durationMsFromPreviousStage` (`apps/api/src/models/stageHistory.model.ts`).
- [x] Implement Zod validation schemas (`createApplicationSchema`, `stageTransitionSchema`, `updateApplicationSchema`, `applicationQuerySchema`) enforcing allowlisted fields and blocking stage mutation through generic update endpoint (`apps/api/src/schemas/application.schema.ts`).
- [x] Implement server-side state machine enforcing allowed forward transitions (`Applied` → `Screening` → `Interview` → `Offer` → `Hired`), rejection from any nonterminal stage, and blocking transitions from terminal stages (`Hired`, `Rejected`) with HTTP 422 `INVALID_STAGE_TRANSITION`.
- [x] Enforce database-level duplicate active application prevention returning HTTP 409 `DUPLICATE_APPLICATION`.
- [x] Enforce job status validation: applications can only be created for open jobs (`status === "Open"`); paused, closed, and archived jobs reject creation with HTTP 422 `JOB_NOT_OPEN`.
- [x] Implement REST controllers (`createApplication`, `getApplications`, `getApplicationById`, `transitionStage`, `getApplicationHistory`, `updateApplication`) with transaction support where replica set is available and safe fallback for single-node development (`apps/api/src/controllers/application.controller.ts`).
- [x] Secure routes with `requireAuth` and `requireRole("admin", "recruiter")` for mutating endpoints (`apps/api/src/routes/application.routes.ts`, mounted in `apps/api/src/app.ts`).
- [x] Build frontend TypeScript definitions and API client (`apps/web/src/types/application.ts`, `apps/web/src/api/applicationApi.ts`).
- [x] Implement frontend Kanban components: `StageBadge`, `ApplicationCard`, `RejectModal`, `ApplicationHistoryModal`, `ApplicationCreateModal`, and `PipelineView` (`apps/web/src/features/pipeline/`).
- [x] Integrate Pipeline into main sidebar navigation in `apps/web/src/app/App.tsx`.
- [x] Write 25 backend integration test scenarios covering all 24 required test scenarios in `apps/api/src/__tests__/application.test.ts`.
- [x] Write 7 frontend component test scenarios verifying loading, populated columns, empty state, stage advancement, rejection modal, creation modal, and error states in `apps/web/src/__tests__/PipelineView.test.tsx`.
- [x] Update documentation (`audit.md`, `testing.md`, `bugs.md`, `task_today.md`, `MANUAL_ACTIONS.md`).

## Constraints / guardrails

- Strictly do not implement dashboard analytics, recruiter notes/comments, calendar integrations, offer-letter generation, or AI candidate scoring in Phase 5.
- The stage belongs strictly to the Application, never to Candidate or Job.
- Clients must never bypass the stage machine by patching `currentStage` through the ordinary update endpoint.
- Clients must never control the transition's actor, previous stage, or timestamp.
- Initial stage for a newly created application is strictly `Applied` with an initial `fromStage: null` history record.

## Completion gate

Before marking this task complete, run every configured check:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Session result

- **Outcome:** Phase 5 Applications, Hiring Pipeline & Stage History end-to-end implementation completed and verified.
- **Files created/modified:**
  - Backend: `apps/api/src/models/application.model.ts`, `apps/api/src/models/stageHistory.model.ts`, `apps/api/src/schemas/application.schema.ts`, `apps/api/src/controllers/application.controller.ts`, `apps/api/src/routes/application.routes.ts`, `apps/api/src/app.ts`, `apps/api/src/__tests__/application.test.ts`.
  - Frontend: `apps/web/src/types/application.ts`, `apps/web/src/api/applicationApi.ts`, `apps/web/src/features/pipeline/StageBadge.tsx`, `apps/web/src/features/pipeline/ApplicationCard.tsx`, `apps/web/src/features/pipeline/RejectModal.tsx`, `apps/web/src/features/pipeline/ApplicationHistoryModal.tsx`, `apps/web/src/features/pipeline/ApplicationCreateModal.tsx`, `apps/web/src/features/pipeline/PipelineView.tsx`, `apps/web/src/app/App.tsx`, `apps/web/src/__tests__/PipelineView.test.tsx`.
  - Documentation: `DOCS/mini-ats-vibe-docs/audit.md`, `DOCS/mini-ats-vibe-docs/testing.md`, `DOCS/mini-ats-vibe-docs/bugs.md`, `DOCS/mini-ats-vibe-docs/task_today.md`, `DOCS/MANUAL_ACTIONS.md`.
- **Commands run / exit codes:**
  - `npm run lint`: exit code 0 (0 errors, 0 warnings across monorepo)
  - `npm run typecheck`: exit code 0 (strict mode passes on both workspaces)
  - `npm test`: exit code 0 (101 tests passed across 9 test suites: 20 web + 81 api)
  - `npm run build`: exit code 0 (Vite frontend built `apps/web/dist` in 8.32s, `tsc` compiled `apps/api/dist`)

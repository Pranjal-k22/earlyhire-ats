# Mini ATS — Task Today

> Replace this file's active task at the start of each focused work session. Keep one primary outcome per session. Do not use this file as a second PRD.

## Session metadata

- **Date:** 2026-10-17
- **Phase:** Phase 6 — Search, Advanced Filters & Recruiter Notes
- **Time box:** 4 hours (Hours 24–28)
- **Status:** Phase 6 Completed & Verified (PASS).
- **Branch:** `feat/phase-6-search-notes`.

## Current task

Implement candidate search and advanced filters, job search and status filters, application/pipeline filters, recruiter notes model and API with soft delete and author attribution from authenticated session, reconcile application uniqueness with partial unique index allowing re-application after withdrawal/archival, and implement frontend notes and filter controls with automated regression tests.

## Requirements

- [x] Pre-implementation audit: inspect candidate, job, application, and stage history schemas, query controllers, and UI references.
- [x] Application uniqueness reconciliation: implemented partial unique index `{ candidateId: 1, jobId: 1 }, { unique: true, partialFilterExpression: { status: "Active" } }` so duplicate active applications are blocked (HTTP 409 `DUPLICATE_APPLICATION`), while allowing reapplication after an application is Withdrawn or Archived.
- [x] Recruiter notes data model: created `Note` model (`candidateId`, `authorId`, `body`, `deletedAt`, `deletedBy`) with compound indexes on `{ candidateId: 1, createdAt: -1 }` and `{ authorId: 1, createdAt: -1 }` (`apps/api/src/models/note.model.ts`).
- [x] Recruiter notes Zod validation: created `createNoteSchema` rejecting empty/whitespace/script tags and bounded to 5000 chars, and `noteQuerySchema` (`apps/api/src/schemas/note.schema.ts`).
- [x] Recruiter notes REST API: implemented `createCandidateNote`, `getCandidateNotes` (excluding soft-deleted notes, ordered chronologically), and `deleteNote` enforcing authorization (note author or admin only) and soft-deletion (`apps/api/src/controllers/note.controller.ts`). Mounted nested `/api/v1/candidates/:candidateId/notes` and direct `/api/v1/notes/:noteId` routes.
- [x] Candidate search and filters: enhanced `/api/v1/candidates` with case-insensitive regex-escaped search across name/email/skills/currentTitle, filters for source, created date range, and experience range (`experienceMin`, `experienceMax`), bounded pagination and sort parameters.
- [x] Job search and filters: enhanced `/api/v1/jobs` with search across title/department/location, filters for status, employmentType, location, created date range, and includeArchived flag.
- [x] Application & pipeline filters: enhanced `/api/v1/applications` with stage filter, job filter, candidate search text filter, and applied date range (`appliedFrom`, `appliedTo`).
- [x] Frontend recruiter notes UI: created `CandidateNotesSection` with interactive notes list, author and date display, inline validation form, soft delete with confirmation, and safe plain-text rendering inside `CandidateDetailModal` (`apps/web/src/features/candidates/CandidateNotesSection.tsx`).
- [x] Frontend filter controls: added experience filter dropdown and clear-filters buttons to `CandidatesView` and `JobsView`.
- [x] Automated tests: 30 new backend integration tests in `apps/api/src/__tests__/searchAndNotes.test.ts` covering all required notes, candidate search, job filters, pipeline filters, duplicate active block, and reapplication allowed. 7 new frontend component tests in `apps/web/src/__tests__/NotesAndSearch.test.tsx`.
- [x] Verification gate: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` all pass with exit code 0.

## Constraints / guardrails

- Strictly no dashboard analytics or AI-powered search (reserved for Phase 7).
- Notes are candidate-level and immutable in body (audit trail preserved; no inline editing).
- Authors derive strictly from authenticated session (`req.user._id`); never trust client-supplied author IDs or timestamps.
- Note bodies render strictly as safe plain text in React, never raw/executable HTML.
- Duplicate active applications blocked via partial unique index; reapplication allowed only when previous application is Withdrawn or Archived.

## Completion gate

```bash
npm run lint       # PASSED (exit code 0)
npm run typecheck  # PASSED (exit code 0 across web and api workspaces)
npm test           # PASSED (exit code 0, 138/138 tests passing across 11 test suites)
npm run build      # PASSED (exit code 0, production bundles generated)
```

## Session result

- **Outcome:** Phase 6 Search, Advanced Filters & Recruiter Notes end-to-end implementation verified.
- **Files created/modified:**
  - Backend: `apps/api/src/models/note.model.ts`, `apps/api/src/models/application.model.ts`, `apps/api/src/schemas/note.schema.ts`, `apps/api/src/schemas/candidate.schema.ts`, `apps/api/src/schemas/job.schema.ts`, `apps/api/src/schemas/application.schema.ts`, `apps/api/src/controllers/note.controller.ts`, `apps/api/src/controllers/candidate.controller.ts`, `apps/api/src/controllers/job.controller.ts`, `apps/api/src/controllers/application.controller.ts`, `apps/api/src/routes/note.routes.ts`, `apps/api/src/routes/noteDirect.routes.ts`, `apps/api/src/routes/candidate.routes.ts`, `apps/api/src/app.ts`, `apps/api/src/__tests__/searchAndNotes.test.ts`.
  - Frontend: `apps/web/src/types/note.ts`, `apps/web/src/api/noteApi.ts`, `apps/web/src/api/candidateApi.ts`, `apps/web/src/api/jobApi.ts`, `apps/web/src/api/applicationApi.ts`, `apps/web/src/features/candidates/CandidateNotesSection.tsx`, `apps/web/src/features/candidates/CandidateDetailModal.tsx`, `apps/web/src/features/candidates/CandidatesView.tsx`, `apps/web/src/features/jobs/JobsView.tsx`, `apps/web/src/__tests__/NotesAndSearch.test.tsx`.
  - Documentation: `DOCS/mini-ats-vibe-docs/audit.md`, `DOCS/mini-ats-vibe-docs/testing.md`, `DOCS/mini-ats-vibe-docs/bugs.md`, `DOCS/mini-ats-vibe-docs/task_today.md`, `DOCS/MANUAL_ACTIONS.md`.
- **Exit code:** 0 (All gates passed).

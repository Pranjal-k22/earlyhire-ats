# Mini ATS — Task Today

> Replace this file's active task at the start of each focused work session. Keep one primary outcome per session. Do not use this file as a second PRD.

## Session metadata

- **Date:** 2026-10-17
- **Phase:** Phase 2 — MongoDB Integration, Authentication & Authorization
- **Time box:** 4 hours (Hours 8–12)
- **Status:** Phase 2 Completed & Verified (PASS).
- **Branch:** `feat/phase-2-auth`.

## Current task

Implement reliable MongoDB Atlas integration, User model, recruiter signup, password hashing with bcrypt, JWT HttpOnly cookie session management, and role-based authorization middleware. Do not implement application features beyond authentication.

## Requirements

- [x] Read `Architecture-essentials.md`, `Architecture.md`, and `prd.md`.
- [x] Implement reusable database connection module with credential scrubbing (`apps/api/src/config/db.ts`).
- [x] Implement User model with trimmed/lowercase email uniqueness, role enum, and bcrypt password hashing (`apps/api/src/models/user.model.ts`).
- [x] Implement signup, login, logout, and getMe endpoints under `/api/v1/auth`.
- [x] Ensure public signup strictly forces `recruiter` role only; ignore/reject client-supplied roles.
- [x] Configure HttpOnly session cookie (`SameSite: Lax`, `Secure: true` in production, 7-day maxAge).
- [x] Implement `requireAuth` and `requireRole` middleware (`admin`, `recruiter`, `hiring_manager`).
- [x] Write 18 automated integration test scenarios covering authentication, security, and authorization.
- [x] Ensure health check and existing scaffolding tests pass without regression.
- [x] Update documentation (`audit.md`, `testing.md`, `bugs.md`, `task_today.md`, `MANUAL_ACTIONS.md`).

## Constraints / guardrails

- Do not implement job management, candidate management, applications, pipeline, or dashboard features in this phase.
- Never store JWTs in localStorage or sessionStorage.
- Never store plaintext passwords or log credentials.
- Use validated environment variables only; keep secrets exclusively in `.env`.
- Do not weaken production cookie security to make local development work.

## Completion gate

Before marking this task complete, run every configured check:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Session result (fill in after work)

- **Outcome:** Phase 2 MongoDB Integration, Authentication & Authorization completed and verified.
- **Files changed:** `apps/api/src/config/env.ts`, `apps/api/src/config/db.ts`, `apps/api/src/models/user.model.ts`, `apps/api/src/utils/jwt.ts`, `apps/api/src/schemas/auth.schema.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/types/express.d.ts`, `apps/api/src/controllers/auth.controller.ts`, `apps/api/src/routes/auth.routes.ts`, `apps/api/src/app.ts`, `apps/api/src/server.ts`, `apps/api/src/__tests__/auth.test.ts`, `DOCS/mini-ats-vibe-docs/testing.md`, `DOCS/mini-ats-vibe-docs/audit.md`, `DOCS/mini-ats-vibe-docs/bugs.md`, `DOCS/mini-ats-vibe-docs/task_today.md`.
- **Commands run / exit codes:**
  - `npm run lint`: exit code 0 (clean across `web` and `api`)
  - `npm run typecheck`: exit code 0 (strict mode passes on both workspaces)
  - `npm test`: exit code 0 (22 tests passed across 3 test suites: `App.test.tsx` [2 passed], `health.test.ts` [2 passed], `auth.test.ts` [18 passed])
  - `npm run build`: exit code 0 (Vite client build in 16.31s, `tsc` backend compile)
  - Local backend execution & health check: exit code 0 (MongoDB connected, `GET /api/v1/health` returned HTTP 200 `{"status":"ok","service":"earlyai-ats-api"}`)
- **Tests:** 22 passed, 0 failed.
- **Blockers / decisions needed:** None. Atlas production provisioning tracked in ACT-06.
- **Next task:** Begin Phase 3 — Job Openings & Candidate Management (Hours 12–20).

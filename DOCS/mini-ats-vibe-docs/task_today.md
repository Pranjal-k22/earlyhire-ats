# Mini ATS — Task Today

> Replace this file's active task at the start of each focused work session. Keep one primary outcome per session. Do not use this file as a second PRD.

## Session metadata

- **Date:** 2026-10-17
- **Phase:** Phase 10 — Deployment Readiness & Cloud Release
- **Time box:** 2 hours
- **Status:** PASS (Local regression suite: 202/202 passing across 16 test suites [47 web, 155 api]; zero lint errors, zero lint warnings; zero TypeScript errors; production build clean; Atlas live cloud indexes and connectivity verified).
- **Branch:** `feat/phase-10-deployment-readiness`.

## Current task

Execute Phase 10 deployment readiness audit, configure Vercel and Render targets, establish cross-origin cookie and CSRF topologies, harmlessly inspect and verify MongoDB Atlas cloud indexes, and generate the production release plan and smoke-test checklist.

## Requirements

- [x] Gate 1: Git and worktree safety verified. Checked clean branch off `fbfca12`, created `feat/phase-10-deployment-readiness`. Confirmed `.env` and local secrets are excluded from Git.
- [x] Gate 2: Production configuration audit completed.
  - Verified `apps/api` binds to `env.HOST` (`0.0.0.0`) and `env.PORT` for Render container ingress.
  - Verified `apps/api/dist/server.js` production build and start command (`node dist/server.js`).
  - Verified `apps/web` production build with code splitting (`dist/index.html`, `dist/assets/`).
  - Added `apps/web/vercel.json` for client-side SPA routing (`/(.*)` -> `/index.html`).
  - Added `apps/web/src/api/baseUrl.ts` and `apps/web/src/vite-env.d.ts` supporting `VITE_API_URL` prefixing.
  - Verified production secrets validation in `env.ts` (fails fast on missing `MONGODB_URI` or weak `JWT_SECRET`).
  - Verified zero mock data in production application bundle.
- [x] Gate 3: MongoDB Atlas and cloud index verification completed.
  - Authenticated connection to Atlas cluster `cluster0.s8vxj7j.mongodb.net` and database `earlyhire-ats` verified.
  - Harmless index inspection verified all 6 collections: `applications`, `notes`, `stagehistories`, `candidates`, `jobs`, `users`.
  - ACT-09 verified: `applications` collection contains `candidateId_1_jobId_1` unique partial index (`partialFilter: {"status": "Active"}`).
  - ACT-10 verified: `applications` and `stagehistories` contain all required compound indexes for Phase 7 analytics.
- [x] Gate 4: Production authentication, cookies, CORS, and CSRF verified.
  - `apps/api/src/utils/jwt.ts`: `getAuthCookieOptions` sets `sameSite: "none"` and `secure: true` in production (configurable via `COOKIE_SAME_SITE`).
  - `apps/api/src/app.ts`: Dynamic CORS origin matching with `credentials: true` against explicit `CLIENT_URL` allowlist (rejects untrusted origins; no wildcards).
  - `apps/api/src/middleware/csrf.ts`: State-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) protected by `Origin` / `Referer` allowlist check.
  - Logout cookie clearing preserves identical security attributes (`httpOnly`, `sameSite`, `secure`, `path`).
- [x] Gate 5: Final local regression checks executed with actual outcomes:
  - `npm run lint`: PASSED (0 errors, 0 warnings across all workspaces).
  - `npm run typecheck`: PASSED (0 errors across all workspaces).
  - `npm test`: PASSED (202/202 passed across 16 test suites: 47 web, 155 api).
  - `npm run build`: PASSED (both web and api production artifacts compiled).
- [x] Gate 6: Deployment configuration and comprehensive smoke-test plan prepared for Vercel and Render.
- [x] Gate 7: Documentation updated across `DOCS/MANUAL_ACTIONS.md`, `DOCS/mini-ats-vibe-docs/audit.md`, `DOCS/mini-ats-vibe-docs/testing.md`, `DOCS/mini-ats-vibe-docs/task_today.md`, `DOCS/mini-ats-vibe-docs/bugs.md`, `DOCS/mini-ats-vibe-docs/implementation_plan.md`.
- [x] Gate 8: Stopping rule enforced. No cloud deployments triggered without explicit owner authorization.

## Completion gate

```bash
npm run lint       # PASSED (exit code 0; 0 errors, 0 warnings across monorepo)
npm run typecheck  # PASSED (exit code 0 across web and api workspaces)
npm test           # PASSED (exit code 0, 202/202 tests passing across 16 test suites)
npm run build      # PASSED (exit code 0, 0 chunk warnings; web bundle 232 kB, api dist/server.js)
```

## Session result

- **Outcome:** Phase 10 deployment readiness audit and cloud preparation complete on `feat/phase-10-deployment-readiness`.
- **Infrastructure Actions:**
  - `ACT-06`: DONE / VERIFIED (Live Atlas database connection, ping `{ ok: 1 }`).
  - `ACT-09`: DONE / VERIFIED (Atlas Application partial unique index inspected and confirmed active).
  - `ACT-10`: DONE / VERIFIED (Atlas Analytics compound indexes inspected and confirmed active).
  - `ACT-08`: SOURCE-VERIFIED / PENDING LIVE HOSTING TEST (Cross-domain cookies & CORS configured in code; live staging test required once deployed).
  - `ACT-11`: PENDING PREVIEW DEPLOYMENT (Physical mobile smoke testing pending deployed URL).
- **Deployment Readiness:** READY FOR OWNER REVIEW.

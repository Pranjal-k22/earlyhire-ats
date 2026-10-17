# Mini ATS — Testing Plan and QA Checklist

- **Purpose:** Define observable checks for the MVP and require evidence before calling a feature complete.
- **Product contract:** `prd.md`
- **Status at creation:** Test cases defined; no implementation tests have been run yet.

## 1. Required commands

The repository should provide these scripts. Run them from the repo root, or from each workspace if the project uses separate frontend/backend packages:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Recommended development workflow:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

If the project uses npm workspaces, root scripts should call the appropriate workspace scripts. Do not silently skip a failing command. If a script is missing, mark it **NOT CONFIGURED** and create a tracked follow-up task.

## 2. Testing strategy

- **Unit tests:** validators, stage-transition rules, metric calculations, formatting helpers.
- **API/integration tests:** auth, authorization, CRUD, search, filters, pagination, applications, stage history, notes, metrics.
- **Frontend tests:** key forms, loading/error states, protected routes, stage-change feedback, accessible controls.
- **End-to-end smoke tests:** sign in, create job, create candidate, apply to job, move stage, add note, check dashboard, log out.
- **Manual release checks:** responsive behavior, deployment configuration, seed data, cold start, demo credentials, screenshots.

Use a test database and synthetic candidates only. Tests must not run destructive seed operations against the production database.

## 3. Test cases

Mark an item `[x]` only after executing the check and recording evidence. “Implemented” is not the same as “passed.”

### A. Authentication and authorization

- [x] **AUTH-01 — Successful signup:** Valid email and allowed password create an account; response omits password/hash. Verified in `apps/api/src/__tests__/auth.test.ts` (Scenario 1).
- [x] **AUTH-02 — Duplicate signup:** Registering the same normalized email twice returns a 409 Conflict with code `EMAIL_EXISTS`. Verified in `auth.test.ts` (Scenario 4).
- [x] **AUTH-03 — Invalid email:** Malformed email is rejected with 422 `VALIDATION_ERROR`. Verified in `auth.test.ts` (Scenario 5).
- [x] **AUTH-04 — Weak password:** Passwords <8 chars or missing uppercase/numbers rejected with 422. Verified in `auth.test.ts` (Scenario 5).
- [x] **AUTH-05 — Successful login:** Correct credentials set the session cookie with HttpOnly, SameSite=Lax, and Path=/. Verified in `auth.test.ts` (Scenario 6).
- [x] **AUTH-06 — Wrong credentials:** Incorrect email/password returns generic 401 `INVALID_CREDENTIALS` without leaking account existence. Verified in `auth.test.ts` (Scenario 7).
- [x] **AUTH-07 — Logout:** Logout clears the session cookie (`maxAge` expired); subsequent requests return 401. Verified in `auth.test.ts` (Scenario 12).
- [x] **AUTH-08 — Anonymous access:** Protected endpoints reject requests without a valid session with 401 `UNAUTHENTICATED`. Verified in `auth.test.ts` (Scenario 10).
- [x] **AUTH-09 — Expired/tampered JWT:** Expired or invalid token is rejected with 401 `UNAUTHENTICATED`. Verified in `auth.test.ts` (Scenario 11).
- [x] **AUTH-10 — Role escalation:** Signup payload attempting `role: "admin"` cannot grant elevated access; strictly forced to `recruiter`. Verified in `auth.test.ts` (Scenario 13).
- [x] **AUTH-11 — Role authorization:** Recruiter/hiring manager cannot call admin-only endpoints; receives 403 `FORBIDDEN`. Verified in `auth.test.ts` (Scenario 15).
- [x] **AUTH-12 — Cookie/CORS behavior:** Browser request from configured frontend works with credentials; secure flags verified. Verified in `auth.test.ts` (Scenario 8).
- [ ] **AUTH-13 — Auth rate limiting:** Repeated login failures trigger rate limiter (Scheduled for rate limiting middleware enhancement).

### B. Jobs

- [x] **JOB-01 — Create valid job:** Authorized recruiter/admin creates a job and it appears in list/detail responses. Verified in `apps/api/src/__tests__/job.test.ts` (Scenario 1 & 5) and `apps/web/src/__tests__/JobsView.test.tsx`.
- [x] **JOB-02 — Required-field validation:** Missing title or other required fields return 422 `VALIDATION_ERROR` with detailed Zod issues. Verified in `job.test.ts` (Scenario 2).
- [x] **JOB-03 — Update job:** Editing job title/description/status persists and is visible after reload. Verified in `job.test.ts` (Scenario 7 & 10).
- [x] **JOB-04 — Status filtering:** Open/paused/closed/archived filters and regex search return the correct records. Verified in `job.test.ts` (Scenario 3, 4, 12) and `JobsView.test.tsx`.
- [x] **JOB-05 — Archive safety:** DELETE /api/v1/jobs/:id soft-archives with `archivedAt`, preventing destructive deletion, and excludes archived jobs by default from listings. Verified in `job.test.ts` (Scenario 11 & 12).
- [x] **JOB-06 — Unauthorized write:** Anonymous users receive 401 `UNAUTHENTICATED`; hiring managers receive 403 `FORBIDDEN` on POST/PATCH/DELETE. Verified in `job.test.ts` (Scenario 8 & 13).

### C. Candidates

- [x] **CAND-01 — Create valid candidate:** Required candidate data persists and is displayed correctly. Verified in `apps/api/src/__tests__/candidate.test.ts` (Scenario 1) & `apps/web/src/__tests__/CandidatesView.test.tsx` (Scenario 1).
- [x] **CAND-02 — Email normalization:** ` Candidate@Example.com ` is normalized to lowercase and trimmed before uniqueness checking. Verified in `candidate.test.ts` (Scenario 4).
- [x] **CAND-03 — Duplicate active email:** Duplicate active candidate email returns 409 `CANDIDATE_EMAIL_EXISTS`. Verified in `candidate.test.ts` (Scenario 5).
- [x] **CAND-04 — Update candidate:** Name, phone, skills, source, experience, and resume URL can be edited with validation. Verified in `candidate.test.ts` (Scenario 18).
- [x] **CAND-05 — Candidate details:** Detail view shows profile, contact info, skills tags, and audit references. Verified in `candidate.test.ts` (Scenario 15) & `CandidatesView.test.tsx` (Scenario 5).
- [x] **CAND-06 — Archive candidate:** Confirmation required; soft-archives with `archivedAt` timestamp without deleting records. Verified in `candidate.test.ts` (Scenario 21).
- [x] **CAND-07 — Resume URL validation:** Malformed or non-http/https URLs rejected with 422; valid URLs accepted. Verified in `candidate.test.ts` (Scenario 7).
- [x] **CAND-08 — Search by name/email:** Partial and case-insensitive search returns expected matches. Verified in `candidate.test.ts` (Scenario 9 & 10).
- [x] **CAND-09 — Search by skills/job title:** Search matches skill tags and title data without unsafe query construction. Verified in `candidate.test.ts` (Scenario 11).
- [x] **CAND-10 — Combined filters:** Source, date range (`createdFrom`/`createdTo`), and search combine correctly. Verified in `candidate.test.ts` (Scenario 12 & 13).
- [x] **CAND-11 — Pagination bounds:** Invalid page/limit handled; maximum limit of 100 enforced. Verified in `candidate.test.ts` (Scenario 14).
- [x] **CAND-12 — Empty results:** UI shows a clear empty state with informative text and add candidate CTA. Verified in `CandidatesView.test.tsx` (Scenario 2).

### D. Applications and pipeline

- [ ] **APP-01 — Create application:** Candidate can be linked to an open job; initial stage is `Applied`.
- [ ] **APP-02 — Duplicate application:** Second active application for the same candidate/job is rejected.
- [ ] **APP-03 — Closed job restriction:** New application to a closed/archived job is rejected.
- [ ] **PIPE-01 — Valid transition:** `Applied → Screening` updates current stage and creates exactly one history event.
- [ ] **PIPE-02 — Full valid flow:** `Applied → Screening → Interview → Offer → Hired` succeeds.
- [ ] **PIPE-03 — Rejection path:** Rejection from an allowed non-terminal stage succeeds and is recorded.
- [ ] **PIPE-04 — Invalid transition:** Skipping directly from `Applied → Offer` is rejected according to PRD transition rules.
- [ ] **PIPE-05 — Terminal stage:** A `Hired` or `Rejected` application cannot move to another stage.
- [ ] **PIPE-06 — Same-stage update:** Setting current stage to the existing stage does not create duplicate history.
- [ ] **PIPE-07 — History integrity:** Every stage entry contains actor, timestamp, from/to stage, and optional reason; old entries remain unchanged.
- [ ] **PIPE-08 — Stage history access:** Unauthorized users cannot retrieve restricted application data.
- [ ] **PIPE-09 — Concurrent move:** Concurrent stage-change requests do not silently produce contradictory current stage/history.

### E. Notes/comments

- [ ] **NOTE-01 — Add note:** Authorized user adds a non-empty note and sees author/time.
- [ ] **NOTE-02 — Empty/oversized note:** Empty or over-limit text is rejected.
- [ ] **NOTE-03 — Safe rendering:** HTML/script-like content is escaped and does not execute.
- [ ] **NOTE-04 — Delete permission:** Author can delete their note; another ordinary user cannot; Admin can delete any note.
- [ ] **NOTE-05 — Note persistence:** Notes remain after refresh and are linked to the correct candidate/application.

### F. Dashboard and metrics

- [ ] **DASH-01 — Total counts:** Candidate, open-job, hired, rejected, and stage counts match a known test fixture.
- [ ] **DASH-02 — Screening conversion:** Formula matches the definition in `prd.md` for a fixture with mixed stages/history.
- [ ] **DASH-03 — Interview conversion:** Numerator/denominator match the documented definition.
- [ ] **DASH-04 — Offer acceptance:** Hired applications that previously reached Offer are divided by all applications that reached Offer.
- [ ] **DASH-05 — Zero denominator:** Empty dataset/zero denominator returns a safe numeric zero and no `NaN`/`Infinity`.
- [ ] **DASH-06 — Archived records:** Archived records are included/excluded exactly as documented for each metric.
- [ ] **DASH-07 — Chart consistency:** Chart totals match the values returned by the dashboard API.
- [ ] **DASH-08 — Date boundary:** Date-range filtering behaves consistently with UTC storage and documented timezone display.

### G. UI, accessibility, and production smoke checks

- [ ] **UI-01 — Loading states:** Long requests show loading feedback and prevent accidental duplicate submissions.
- [ ] **UI-02 — API errors:** Network/validation/server errors are visible and recoverable; no stack trace is shown.
- [ ] **UI-03 — Protected routing:** Logged-out user is redirected to login and cannot access page data through API calls.
- [ ] **UI-04 — Responsive layout:** Login, list, forms, pipeline, and dashboard are usable at mobile and desktop widths.
- [ ] **UI-05 — Keyboard navigation:** Forms, menus, dialogs, tables, and stage controls can be used with keyboard and show visible focus.
- [ ] **UI-06 — Destructive confirmation:** Candidate/job archive actions require a confirm step.
- [ ] **OPS-01 — Seed script:** Seed creates the intended synthetic users/jobs/candidates/applications/history/notes in a disposable database and can be rerun safely or documents destructive behavior.
- [ ] **OPS-02 — Health endpoint:** Deployed health endpoint returns expected status without exposing environment variables.
- [ ] **OPS-03 — Production smoke:** Live signup/login, candidate/job creation, stage change, note creation, dashboard check, and logout work.
- [ ] **OPS-04 — Clean install:** Fresh clone + documented install commands produce a working local app.
- [ ] **OPS-05 — Secrets hygiene:** `.env` and real secret values are not tracked by Git.

## 4. Recommended automation commands

Use only scripts that actually exist in `package.json`. The following are the required project-level interface; implementation details can vary:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Optional end-to-end script once configured:

```bash
npm run test:e2e
```

## 5. Test report template

```markdown
### Test run — YYYY-MM-DD HH:mm UTC
- Commit:
- Environment: local / preview / production
- Dataset: synthetic test fixtures / demo seed
- `npm run lint`: PASS / FAIL / NOT CONFIGURED — exit code:
- `npm run typecheck`: PASS / FAIL / NOT CONFIGURED — exit code:
- `npm test`: PASS / FAIL / NOT CONFIGURED — exit code; passed/failed count:
- `npm run build`: PASS / FAIL / NOT CONFIGURED — exit code:
- Manual cases executed:
- Failures and linked bug IDs:
- Cases not run:
- Verified by:
```

## 6. Release gate

Do not call the MVP ready for submission unless all of the following are true:
- [ ] No open P0/P1 issues.
- [ ] Required critical paths pass: login/logout, job CRUD, candidate CRUD/search, application creation, stage transition/history, notes, dashboard metrics.
- [ ] Role authorization has tests for both allowed and denied cases.
- [ ] Lint, type-check, tests, and build have actual recorded results.
- [ ] The deployed app has been smoke-tested using the demo environment.
- [ ] README and deployed links are accurate; limitations are disclosed.

---

### Test run — 2026-10-17 18:15 UTC (Phase 5 Verification)
- **Commit:** `feat/phase-5-applications-pipeline` (ready for commit)
- **Environment:** Local test runner with isolated MongoDB database (`earlyai_ats_test`)
- **Dataset:** Synthetic test fixtures created and torn down in `beforeEach`
- **`npm run lint`:** PASS — exit code: 0 (0 errors, 0 warnings across monorepo)
- **`npm run typecheck`:** PASS — exit code: 0 (strict mode passed on `web` and `api`)
- **`npm test`:** PASS — exit code: 0; passed: 101 tests, failed: 0 across 9 test files:
  - `apps/web/src/__tests__/App.test.tsx`: 2 passed
  - `apps/web/src/__tests__/JobsView.test.tsx`: 5 passed
  - `apps/web/src/__tests__/CandidatesView.test.tsx`: 6 passed
  - `apps/web/src/__tests__/PipelineView.test.tsx`: 7 passed
  - `apps/api/src/__tests__/health.test.ts`: 2 passed
  - `apps/api/src/__tests__/auth.test.ts`: 18 passed
  - `apps/api/src/__tests__/job.test.ts`: 14 passed
  - `apps/api/src/__tests__/candidate.test.ts`: 22 passed
  - `apps/api/src/__tests__/application.test.ts`: 25 passed
- **`npm run build`:** PASS — exit code: 0 (Vite frontend built in 8.32s; `tsc` compiled backend)
- **Verified by:** Antigravity (AI Coding Assistant)


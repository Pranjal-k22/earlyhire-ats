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

- [ ] **AUTH-01 — Successful signup:** Valid email and allowed password create an account; response omits password/hash.
- [ ] **AUTH-02 — Duplicate signup:** Registering the same normalized email twice returns a validation/conflict error and does not create a second account.
- [ ] **AUTH-03 — Invalid email:** Malformed email is rejected with a field-level/client-understandable error.
- [ ] **AUTH-04 — Weak password:** Password below the configured minimum is rejected.
- [ ] **AUTH-05 — Successful login:** Correct credentials set the session cookie with required flags.
- [ ] **AUTH-06 — Wrong credentials:** Incorrect email/password returns a generic authentication error without disclosing which field is correct.
- [ ] **AUTH-07 — Logout:** Logout clears the cookie; subsequent protected API requests return 401.
- [ ] **AUTH-08 — Anonymous access:** Protected endpoints reject requests without a valid session.
- [ ] **AUTH-09 — Expired/tampered JWT:** Expired or invalid token is rejected; no protected data is returned.
- [ ] **AUTH-10 — Role escalation:** Signup/profile payload attempting `role: "admin"` cannot grant elevated access.
- [ ] **AUTH-11 — Role authorization:** Recruiter/hiring manager cannot call admin-only user-management operations.
- [ ] **AUTH-12 — Cookie/CORS behavior:** Browser request from the configured frontend works with credentials; unapproved origins are rejected.
- [ ] **AUTH-13 — Auth rate limiting:** Repeated login failures trigger the configured rate limiter without exposing secrets.

### B. Jobs

- [ ] **JOB-01 — Create valid job:** Authorized recruiter creates a job and it appears in list/detail responses.
- [ ] **JOB-02 — Required-field validation:** Missing title or other required field returns a clear 400 validation response.
- [ ] **JOB-03 — Update job:** Editing job title/description persists and is visible after reload.
- [ ] **JOB-04 — Status filtering:** Open/on-hold/closed/archived filters return the correct records.
- [ ] **JOB-05 — Archive safety:** Archiving a job with applications retains historical application visibility and prevents new applications until reopened.
- [ ] **JOB-06 — Unauthorized write:** Anonymous user cannot create, update, or archive jobs.

### C. Candidates

- [ ] **CAND-01 — Create valid candidate:** Required candidate data persists and is displayed correctly.
- [ ] **CAND-02 — Email normalization:** ` Candidate@Example.com ` is normalized consistently before uniqueness checking.
- [ ] **CAND-03 — Duplicate active email:** Duplicate active candidate email returns conflict/validation error.
- [ ] **CAND-04 — Update candidate:** Name, phone, skills, source, experience, and resume URL can be edited with validation.
- [ ] **CAND-05 — Candidate details:** Detail view shows profile, applications, notes, and stage history where permitted.
- [ ] **CAND-06 — Archive candidate:** Confirmation is required; historical application data is not accidentally removed.
- [ ] **CAND-07 — Resume URL validation:** Malformed or unsupported URLs are rejected; empty optional URL is accepted.
- [ ] **CAND-08 — Search by name/email:** Partial and case-insensitive search returns expected matches.
- [ ] **CAND-09 — Search by skills/job title:** Search matches skill and related job-title data without unsafe query construction.
- [ ] **CAND-10 — Combined filters:** Stage, job, source, date range, and search combine correctly.
- [ ] **CAND-11 — Pagination bounds:** Invalid page/limit is handled; maximum page size is enforced and sorting remains stable.
- [ ] **CAND-12 — Empty results:** UI shows a useful empty state and does not display stale records.

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

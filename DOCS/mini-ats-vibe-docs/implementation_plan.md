# Mini ATS — Implementation Plan (72 Hours)

- **Purpose:** A phased, checkbox-driven roadmap. Execute one phase at a time; do not ask an AI agent to build the whole application in one pass.
- **Authoritative product scope:** `prd.md`
- **Architecture and guardrails:** `Architecture.md`, `Architecture-essentials.md`, and `AGENTS.md` if present.
- **Time budget:** 72 elapsed project hours. Schedule breaks/sleep realistically; this is a time-box, not a requirement to work continuously.

## Global execution rules

1. Before every coding task, read `prd.md` and `Architecture-essentials.md`; inspect existing code before editing.
2. Read/update the relevant task in `task_today.md` before implementation.
3. Make the smallest coherent change that completes the phase. Do not mix unrelated refactors into feature work.
4. Run lint, type-check, relevant tests, and build as applicable. Record actual command results in `audit.md`.
5. If a required product decision is ambiguous, stop and ask the product owner. If it is a technical detail with a safe standard default, document the default rather than inventing a feature.
6. Never claim a check passed unless the command ran and returned success.
7. Commit only working, reviewable milestones. Use descriptive commit messages.

## Phase 0 — Product lock and repository setup (Hours 0–4)

- [ ] Read `prd.md`, `Architecture-essentials.md`, and current repository state.
- [ ] Confirm MVP scope, role permissions, stage transition rules, and metric formulas match the PRD.
- [ ] Create Git repository and `.gitignore` for Node, Vite, environment files, logs, coverage, and build output.
- [ ] Create root documentation files and `.env.example` containing placeholders only.
- [ ] Create a project board/checklist for the remaining phases.
- [ ] Choose and record package manager; use the same lockfile/package manager throughout.
- [ ] Draft minimal wireframes for Dashboard, Candidate list/detail/form, Pipeline, Jobs, Login/Signup.

**Deliverable:** Clean repository, confirmed scope, docs in root, and a route/page sketch. No product features are considered complete.

## Phase 1 — Project skeleton and shared conventions (Hours 4–8)

- [ ] Set up React + Vite + TypeScript frontend.
- [ ] Set up Node.js + Express + TypeScript backend (or JavaScript consistently if TypeScript backend is explicitly chosen; do not mix styles without reason).
- [ ] Add Tailwind CSS and basic app shell/navigation.
- [ ] Add API error format, request validation convention, environment validation, logging, and `/api/v1/health`.
- [ ] Add scripts: `lint`, `typecheck`, `test`, `build`, and a local development command.
- [ ] Verify frontend and API can start independently.

**Deliverable:** Both apps run locally; CI-quality commands exist, even if initial tests are small.

## Phase 2 — Database and authentication (Hours 8–12)

- [ ] Configure MongoDB Atlas connection through `MONGODB_URI` and fail clearly on missing production secrets.
- [ ] Implement User model and unique normalized email index.
- [ ] Implement signup, login, logout, and current-user endpoint.
- [ ] Hash passwords with bcrypt; never return password hashes.
- [ ] Set JWT only in HttpOnly cookie and configure exact-origin credentialed CORS and CSRF protections.
- [ ] Add `requireAuth` and `requireRole` middleware.
- [ ] Test invalid credentials, duplicate signup, logout, expired token, and role tampering.

**Deliverable:** Authentication works end-to-end and protected routes reject anonymous requests.

## Phase 3 — Jobs and candidates (Hours 12–20)

- [ ] Implement Job model, validation, CRUD/list endpoints, status filtering, and archive behavior.
- [ ] Implement Candidate model, validation, CRUD/list endpoints, archive behavior, resume URL validation, and email normalization.
- [ ] Add server-side search, filters, stable sorting, pagination, and query bounds.
- [ ] Add authorization checks and duplicate/invalid-data handling.
- [ ] Test each route with automated API tests or a checked-in request collection.

**Deliverable:** Jobs and candidates can be managed through verified API endpoints.

## Phase 4 — Applications, pipeline, stage history, and notes (Hours 20–24)

- [ ] Implement Application relation between Candidate and Job.
- [ ] Enforce a unique active candidate/job application pair.
- [ ] Create applications at `Applied`; implement server-side allowed-transition map.
- [ ] Record one immutable history row/document per actual stage transition with actor/time/reason.
- [ ] Implement stage history read endpoint.
- [ ] Implement candidate/application notes and ownership/admin delete permission.
- [ ] Test concurrent/duplicate stage requests where practical and ensure no duplicate same-stage history event.

**Deliverable:** The core recruitment workflow is usable via the API. At Hour 24, stop scope expansion and prioritize the end-to-end demo path.

## Phase 5 — Frontend foundation and authentication UI (Hours 24–30)

- [ ] Add client-side routing and protected route handling.
- [ ] Implement Login and Signup pages with React Hook Form + Zod.
- [ ] Implement shared API client with credentials enabled and typed error handling.
- [ ] Build responsive navigation, page shell, reusable form fields, loading skeleton, alert, empty state, and confirmation dialog.
- [ ] Verify session persistence after page refresh and redirect after logout.

**Deliverable:** A user can sign in and navigate to protected pages.

## Phase 6 — Candidate and job experiences (Hours 30–38)

- [ ] Build candidate table/list with server search, filters, page controls, and clear empty/loading/error states.
- [ ] Build candidate create/edit form and detail page.
- [ ] Build job list, job create/edit form, status controls, and archive confirmation.
- [ ] Add application creation (select candidate + open job) and duplicate-application feedback.
- [ ] Verify form fields and server validation stay consistent.

**Deliverable:** End-to-end candidate/job/application CRUD path from the UI.

## Phase 7 — Pipeline, notes, and dashboard (Hours 38–48)

- [ ] Build pipeline columns for all six stages with reliable manual stage-change controls.
- [ ] Add optional drag-and-drop only after manual movement and stage history are fully tested.
- [ ] Show application stage history and add/list/delete notes with correct permissions.
- [ ] Implement dashboard metric endpoint and connect metric cards to live results.
- [ ] Add Recharts stage distribution and at most one or two simple useful charts.
- [ ] Verify conversion formulas and zero-denominator behavior against test fixtures.

**Deliverable:** The principal Mini ATS workflow and dashboard are connected to real data.

## Phase 8 — Seed data and UX polish (Hours 48–54)

- [ ] Create deterministic seed script with three demo roles/users, five jobs, 30 synthetic candidates, applications across all stages, stage histories, and notes.
- [ ] Make seed script idempotent or clearly destructive only against a disposable local/demo database.
- [ ] Add mobile/tablet responsive behavior and keyboard focus styles.
- [ ] Check long names, no resume URL, empty lists, no open jobs, zero metrics, expired session, and API cold start.
- [ ] Remove placeholder numbers and dead controls.

**Deliverable:** Repeatable demo dataset and coherent responsive UI.

## Phase 9 — QA, security, and release candidate (Hours 54–62)

- [x] Complete the checklist in `testing.md` and automate high-risk tests (202 tests across 16 suites).
- [x] Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` in each applicable workspace (100% PASS, 0 warnings).
- [x] Check role authorization on every mutating API route (verified in `security.test.ts`).
- [x] Check CORS, cookie flags, CSRF mitigation, auth rate limits, body limits, input validation, and secret hygiene (hardened and verified).
- [x] Run dependency audit if available; review and resolve high/critical issues in direct dependencies (npm audit documented; dev/build reachability analyzed).
- [x] Perform a clean clone/install/start smoke test (verified health endpoint, build artifacts, and isolated test suites).
- [x] Log any remaining known issues in `bugs.md`; defer only issues that do not compromise security or core demo flows (BUG-007, BUG-008 closed).

**Deliverable:** Release candidate with evidence-based test status and known issues recorded.

## Phase 10 — Deployment (Hours 62–67)

- [ ] Create production MongoDB Atlas database/user with least-privilege access and network configuration.
- [ ] Deploy Express API to Render and configure production environment variables.
- [ ] Deploy React/Vite frontend to Vercel and set the API base URL.
- [ ] Configure exact frontend origin in CORS, cookie settings, and any CSRF origin checks.
- [ ] Run seed script against the intended demo database only.
- [ ] Verify `/api/v1/health`, login, CRUD, pipeline stage change, notes, and dashboard against the deployed services.
- [ ] Document any free-tier cold start limitation honestly.

**Deliverable:** Working frontend and API URLs connected to the demo database.

## Phase 11 — Submission and demo rehearsal (Hours 67–72)

- [ ] Finish `README.md` with setup steps, stack, features, architecture, environment variables, commands, limitations, and deployed URLs.
- [ ] Update `audit.md` with final command outputs and deployment smoke-test evidence.
- [ ] Ensure `testing.md` accurately marks what has and has not been run.
- [ ] Capture screenshots: dashboard, candidate list/search, candidate detail/history, pipeline, jobs, mobile view.
- [ ] Record a 2–3 minute walkthrough or prepare a live demo route.
- [ ] Verify demo credentials, reset/reseed procedure, GitHub repository visibility, and final commit.
- [ ] Prepare a short project summary and honest known-limitations statement.

**Deliverable:** Submission package is complete and the deployed demo has been rehearsed.

## Critical path if time is running out

Keep, in this order: (1) authentication, (2) jobs/candidates/applications CRUD, (3) manual stage changes with history, (4) candidate search/filter, (5) dashboard core counts, (6) seed data, (7) deployment, (8) README and screenshots. Defer drag-and-drop, average stage duration, fancy animations, and nonessential profile customization before compromising the core workflow or deployment.

## Phase completion template

For each phase, append a record to `audit.md` containing:
- Phase and commit hash
- Files changed
- Acceptance criteria checked
- Exact commands run and pass/fail output
- Manual scenarios tested
- Known issues and follow-ups
- Explicit statement of anything not verified

# Mini ATS — Architecture Essentials and Non-Negotiable Rules

This file is the highest-priority local engineering guardrail for humans and AI coding agents. Read it completely before changing code. `PRD.md` defines product behavior; `Architecture.md` defines implementation structure. If documents conflict, do not guess: report the conflict and ask the owner, while continuing unrelated work that is safe.

## 1. Product and scope guardrails

1. Build only the Mini ATS scope in `PRD.md`. Do not invent features, workflows, roles, permissions, metrics, or integrations.
2. Public signup creates a `Recruiter` only. An incoming `role: "Admin"` field must be ignored or rejected, never honored.
3. Use the approved stage enum exactly: `Applied`, `Screening`, `Interview`, `Offer`, `Hired`, `Rejected`.
4. Use the transition matrix in `PRD.md`. `Hired` and `Rejected` are terminal for normal flows. Never allow arbitrary stage jumps to make a UI test pass.
5. `Candidate`, `Job`, and `Application` are separate domain entities. Stage belongs to the application, because a candidate can apply for multiple jobs.
6. One candidate/job pair can have only one application in the MVP. Enforce it with a unique compound database index and map duplicate-key errors to a safe `409` response.
7. Archive candidates/jobs by default; do not cascade-delete applications/history when archiving related records.
8. Resume storage is URL-only for MVP. Do not add file upload, parsing, email delivery, AI scoring, or other out-of-scope features without explicit approval.
9. Dashboard figures must be calculated from database data according to PRD definitions. No hard-coded counts or demo-only logic in production services.
10. If a product requirement is unclear, identify the precise ambiguity and request owner input. Do not invent an unapproved interpretation. Continue unrelated work if safe.

## 2. Architecture guardrails

1. Approved stack: React + Vite + TypeScript + Tailwind CSS, Node.js + Express + TypeScript, MongoDB Atlas + Mongoose, JWT HttpOnly cookie + bcrypt, React Hook Form + Zod, Recharts, Vercel, Render, GitHub.
2. Do not switch to SQLite, PostgreSQL, Firebase, Supabase, Clerk, localStorage JWT, or another framework without explicit approval and updates to `PRD.md`/`Architecture.md`.
3. Follow the repository structure in `Architecture.md`. Keep route/controller/service/model responsibilities separate.
4. Keep React components small, cohesive, accessible, and reusable. Avoid giant page components, deeply nested ternaries, and duplicate API/data logic.
5. Keep business rules in backend service functions, not only in UI state, controllers, or client validation.
6. Use TypeScript strict mode. Avoid `any`; if unavoidable at a boundary, narrow it immediately and document why.
7. Validate all untrusted input at the API boundary with explicit schemas. Validate `params`, `query`, and `body` separately.
8. Never pass `req.body` or `req.query` directly to Mongoose update/filter methods. Build allowlisted objects field by field.
9. Use a shared JSON response/error contract and centralized Express error handler. Do not leak stack traces or MongoDB internals.
10. Avoid premature abstractions and new dependencies. Explain why any added runtime dependency is necessary.

## 3. Security and privacy guardrails

1. Never store auth JWTs in `localStorage` or `sessionStorage`. Session token lives in an HttpOnly cookie.
2. Never store plaintext passwords. Use bcrypt. Never return or log password hashes.
3. Never hard-code real API keys, passwords, JWT secrets, database URLs, private tokens, or credentials. Use `.env` locally and host secret settings in production.
4. Do not commit `.env`, `.env.*` files containing secrets, private resumes, real candidate PII, production database dumps, or browser/session traces containing secrets.
5. `.env.example` may contain names and safe placeholders only.
6. All protected routes require authentication. Every state-changing or sensitive operation also requires explicit server-side authorization. UI visibility is not access control.
7. Fail closed: unknown role, inactive user, invalid session, or uncertain authorization means deny access.
8. Use an exact CORS origin allowlist; never use `Access-Control-Allow-Origin: *` alongside credentials.
9. Use `HttpOnly`, `Secure` in production, explicit `SameSite`, expiration, and an appropriate CSRF mitigation strategy. Do not disable cookie security to work around deployment bugs.
10. Add rate limiting to signup/login and avoid account-enumerating error messages.
11. Escape user-provided text in search regexes. Never construct Mongo query operators from user input.
12. Render notes/descriptions as text; do not use unsafe HTML injection. If Markdown is supported, sanitize output with a vetted sanitizer.
13. Validate `resumeUrl` as HTTPS in production, and open it safely with `rel="noopener noreferrer"`.
14. Logs may include request IDs, endpoint, status, duration, and safe error codes. They must not include passwords, cookies, authorization headers, JWTs, or unnecessary candidate details.
15. Do not claim compliance certifications or legal compliance without explicit implementation and review.

## 4. Data integrity guardrails

1. Use normalized lowercase/trimmed emails and the documented unique indexes.
2. Add/verify compound index for unique `(candidateId, jobId)` application pair.
3. Verify candidate/job/user references exist and are allowed before creating/updating an application.
4. Stage transitions must use the approved transition matrix and detect stale updates through `expectedStage` and/or optimistic versioning.
5. Persist stage change and history event consistently. Prefer a MongoDB transaction when supported by the configured Atlas deployment. If unsupported, implement an explicitly documented consistency strategy—never silently leave mismatched state/history.
6. Stage history is append-only during ordinary workflows. A privileged correction creates another event; it does not rewrite the past.
7. Date values are UTC in storage and ISO 8601 in API responses. Do not rely on server-local timezone.
8. Metric calculations use PRD definitions; zero denominator returns zero; malformed/missing history does not become a fake zero-duration record.
9. Never destructively reset or seed a production database. Require explicit environment/URI safety checks for seed and cleanup tools.
10. Catch unique index and validation errors and translate them into stable application error codes.

## 5. API guardrails

1. Prefix endpoints with `/api/v1`.
2. Keep request and response shapes aligned with the contracts in `Architecture.md` and `docs/API.md`.
3. Use stable error codes such as `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `DUPLICATE_APPLICATION`, `STAGE_CONFLICT`, and `INTERNAL_ERROR`.
4. Bound pagination: default `limit=20`, maximum `100`.
5. Allowlist sort fields and query filters. Reject malformed ObjectIds and invalid date ranges early.
6. Use appropriate HTTP status codes: `201` for creation, `401` for unauthenticated, `403` for forbidden, `404` for missing, `409` for state conflicts, `422` for schema/semantic errors.
7. Do not make an API endpoint public solely to simplify frontend development.
8. Add/adjust API tests whenever a route, permission, payload, status code, or error contract changes.

## 6. Frontend guardrails

1. Use React Router and the shared API client; do not scatter raw `fetch()` calls throughout pages.
2. Include `credentials: "include"` for cookie-authenticated API calls.
3. Client-side Zod validation is for user experience; the API must validate again.
4. All data-driven pages need loading, empty, and error states.
5. Every form needs labels, inline errors, pending state, disabled duplicate submission, and visible server error handling.
6. Never show a success toast before the server confirms the operation.
7. After mutations, invalidate/refetch relevant TanStack Query data or update cache consistently; do not allow dashboard/list state to drift.
8. Keep keyboard focus visible and use semantic HTML. Icon-only buttons require accessible names.
9. Tables must adapt at mobile sizes; do not assume desktop width.
10. Charts need labels/legends or accessible text summaries; color must not be the only indicator of stage.
11. Never put secrets in `VITE_*` variables; they are public in the client bundle.
12. Avoid drag-and-drop as the only pipeline control. Retain a keyboard-accessible menu/select action.

## 7. Testing and completion guardrails

Before marking any task complete, run at minimum:
```bash
npm run lint
npm run typecheck
npm test
npm run build
```

- If a script does not exist, do not claim that it passed. Fix the package scripts or document the blocker and run the closest available checks.
- Add regression tests for bug fixes.
- Tests must use fictional fixtures and a dedicated test database.
- Never run destructive test/seed operations against production.
- Do not skip, delete, weaken, or mark a failing test as passing to conceal a regression.
- Do not disable TypeScript, lint rules, schema validation, auth middleware, or RBAC to make a build green without explicit approval.
- For each change, report commands run and results honestly, including failures and untested areas.
- For UI changes, inspect the changed screen at desktop and mobile widths if browser tooling is available.
- For API changes, test success, validation failure, unauthenticated, unauthorized, not-found, and conflict cases as appropriate.

## 8. AI agent workflow

1. Read `AGENTS.md`, this file, `PRD.md`, and relevant sections of `Architecture.md` before editing.
2. Inspect the existing repository and package scripts before generating code. Do not overwrite working code or docs blindly.
3. Write a short implementation plan with the exact files to touch and the acceptance criteria it addresses.
4. Implement the smallest end-to-end vertical slice first: schema → service → route/tests → UI → integration.
5. Prefer small, reviewable changes. Do not rename or restructure unrelated modules.
6. After changes, inspect the diff for secrets, scope creep, generated files, and inconsistent docs.
7. Run all required checks. Fix failures caused by the change before completion.
8. Update `PRD.md`, `Architecture.md`, `Architecture-essentials.md`, `AGENTS.md`, and API docs together when an approved contract changes.
9. In the final task report include: summary, files changed, commands run, pass/fail status, known limitations, and manual verification still needed.
10. If documents conflict or a product requirement truly blocks implementation, identify the conflict/ambiguity explicitly. Do not fabricate a requirement. Work on independent tasks while waiting for owner input.

## 9. Files and generated artifacts

- Do not commit `node_modules/`, `dist/`, coverage output, local databases, temporary logs, `.env`, or browser profiles.
- Do not edit package-lock by hand; use npm commands.
- Do not hand-edit generated OpenAPI clients, compiled output, or generated files unless the relevant source generator/configuration explicitly requires it.
- Keep seed data fictional and deterministic.
- Keep screenshots and videos in `docs/screenshots/` only when intentionally selected for the deliverable; remove secrets/PII from captures.

## 10. Conflict priority

1. Explicit project-owner instruction in the current task, provided it does not conflict with security requirements.
2. `PRD.md` for approved product behavior.
3. `Architecture-essentials.md` for non-negotiable implementation/security rules.
4. `Architecture.md` for technical structure and API/schema details.
5. Existing implementation.

If two requirements at the same priority conflict, do not choose silently. Explain the exact conflict and request a decision. Security guardrails cannot be overridden by an ordinary feature shortcut.

## 11. AI Recruitment Workflow Essentials

1. **Three Canonical Roles:** Server-enforced RBAC for `candidate`, `hiring_team`, and `platform_manager`. Legacy roles (`admin`, `recruiter`, `hiring_manager`) map to canonical categories transparently via `normalizeRole()`.
2. **Object-Level Authorization:** Candidates can only access their own profile, resumes, and reports via `requireSelfOrRole`. Never expose recruiter private notes to candidates.
3. **Private Resume Storage:** Resumes stored in private directory `uploads/resumes/` (strictly gitignored). Content-type verified by magic bytes (`%PDF`, `PK\x03\x04`, text); SHA-256 content hashing for deduplication.
4. **Prompt Isolation & Defense:** Resume text quarantined in `<resume_content>` XML tags with strict system instructions prohibiting prompt instructions from overriding rubrics.
5. **AI as Decision Support:** AI scores (0–100) are advisory matching indicators. Final advancement, offer, and rejection decisions remain strictly human-controlled.
6. **Provider Fallback:** Deterministic offline heuristic engine ensures zero failures when external Groq/Gemini API keys are unconfigured.
7. **Google Meet Integration:** Official Google Calendar API with `conferenceDataVersion=1`, conference status checking, and manual link fallback.
8. **Feedback Boundaries:** Internal evaluations and interviewer notes remain confidential until explicitly approved and released by authorized hiring-team members.

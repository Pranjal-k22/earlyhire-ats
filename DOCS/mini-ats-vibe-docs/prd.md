# Mini ATS — Product Requirements Document

- **Document status:** MVP baseline
- **Product:** Mini Applicant Tracking System (Mini ATS)
- **Target delivery:** 72 hours from project kickoff
- **Primary goal:** A reliable, attractive, deployed portfolio/assignment MVP with working demo data
- **Source of truth:** This file controls product scope. Architecture and implementation files describe how to deliver that scope; they must not silently expand it.

## 1. Product overview

### 1.1 One-line description
Mini ATS is a lightweight recruiting workspace for managing job openings, candidates, applications, hiring-stage progress, recruiter notes, and recruiting funnel metrics in one responsive web application.

### 1.2 Core problem
Small recruiting teams often track applicants across spreadsheets, email threads, and separate notes. This makes it difficult to find a candidate, understand the current stage, maintain a consistent history, and report basic hiring metrics.

### 1.3 Target audience
- **Recruiter:** Creates jobs and candidate records, links candidates to jobs, moves applications through the hiring pipeline, searches and filters records, and records notes.
- **Hiring Manager:** Reviews assigned/open hiring pipelines and candidate profiles, and contributes notes. The MVP does not include formal approvals or complex assignment workflows.
- **Admin:** Manages application access and can inspect/manage users and records for the demo workspace.

### 1.4 Success criteria
The MVP is successful when:
1. A user can sign up as a Recruiter, log in, and log out securely.
2. Authorized users can create and manage jobs, candidates, and applications.
3. An application can be moved across the defined hiring stages and its stage history persists.
4. Search, filters, pagination, candidate notes, and dashboard metrics work against database records.
5. The interface is usable on desktop and mobile, including loading, empty, and error states.
6. A clean deployment is available with demo data, source code, README, screenshots, and demo credentials.
7. Lint, type-check, tests, and production build pass before release.

## 2. MVP scope

### 2.1 In scope

#### Authentication and access
- Email/password sign-up and login.
- Password hashing with bcrypt; never store plaintext passwords.
- JWT session in a secure HttpOnly cookie; token must not be returned to browser JavaScript or saved to localStorage.
- Logout clears the session cookie.
- `GET /api/v1/auth/me` reports the authenticated user.
- Roles: `admin`, `recruiter`, `hiring_manager`.
- Public sign-up always creates a `recruiter`; the client cannot choose or elevate its role.
- Role-based authorization is enforced by the API, not only by hiding UI controls.

#### Jobs
- Create, list, view, edit, and archive job openings.
- Job fields: title, department, location, employment type, description, required skills, status, creator, timestamps.
- Status values: `open`, `on_hold`, `closed`, `archived`.
- An archived/closed job remains available in historical applications; it cannot receive new applications unless reopened.

#### Candidates
- Create, list, view, edit, search, filter, paginate, and archive candidates.
- Fields: full name, email, phone, location (optional), experience years, skills, resume URL (optional), source, profile summary/notes (optional), timestamps, archive state.
- Candidate email is normalized to lowercase and trimmed. It is unique within the workspace for active candidate records.
- Resume support is URL-based in the MVP. Direct binary file upload is not required.

#### Applications and hiring pipeline
- Link one candidate to one job through an Application record; the same candidate can apply to different jobs.
- A candidate-job pair must not have duplicate active applications.
- New applications start at `Applied`.
- Hiring stages: `Applied`, `Screening`, `Interview`, `Offer`, `Hired`, `Rejected`.
- Users with write permission can change an application's current stage manually.
- Every real stage change appends an immutable stage-history record with prior stage, new stage, actor, timestamp, and optional reason.
- Moving to the same stage does not create a duplicate history entry.
- `Hired` and `Rejected` are terminal for the MVP. Reopening a terminal application is not supported in the first release; create a new application if needed.
- Kanban/drag-and-drop is optional. A reliable stage-change menu/button is the required baseline.

#### Notes/comments
- Authorized users can add and list notes for a candidate or application.
- Each note records author and creation timestamp.
- Authors may delete their own notes; Admin may delete any note.
- Notes are plain text, length-limited, and rendered as text (never as trusted HTML).

#### Search, filters, and pagination
- Search candidates by name, email, phone, skill, and position/job title.
- Filters: hiring stage, job, candidate source, and created/applied date range.
- Search and filters can be combined and must be processed server-side.
- List endpoints use bounded page size and stable sorting.

#### Dashboard and charts
- Total active candidates.
- Candidate/application counts by current hiring stage.
- Total open jobs.
- Hired and rejected application counts.
- Screening conversion rate.
- Interview conversion rate.
- Offer acceptance rate.
- Simple charts using Recharts.
- Average time in a stage may be shown only if correctly derivable from stage history; it is a lower priority than the core counts and conversion calculations.

### 2.2 Out of scope — do not build in the 72-hour MVP
- Payroll, HRIS, employee onboarding, time tracking, or performance reviews.
- Offer-letter generation, e-signatures, or legal document workflows.
- Automated email/SMS campaigns, calendar integrations, interview scheduling, or notifications.
- AI resume ranking, automated screening, LLM agents, embeddings, or vector databases.
- Complex approval workflows, configurable pipelines, custom role builder, or per-tenant billing.
- Multi-tenant organization isolation, SSO, SCIM, enterprise audit exports, or advanced compliance management.
- Direct resume file storage/upload; use a validated HTTPS URL only.
- Real-time collaborative editing.
- Drag-and-drop if it threatens completion of core stage updates.
- Native mobile apps or offline mode.
- Any feature not listed in section 2.1 unless the product owner explicitly approves an amendment to this file.

## 3. User stories and acceptance criteria

### Authentication
- As a recruiter, I can register with a valid email and strong password so that my records are protected.
- As a user, I can log in and log out, and a logged-out user cannot call protected APIs.
- Given a session cookie, the API verifies it and returns only the associated user profile.
- A user cannot set their own role through sign-up or profile update.

### Jobs
- As an authorized recruiter, I can create and update a job with validated required fields.
- I can filter the job list by status and see open jobs quickly.
- A job with historical applications is archived rather than physically deleted.

### Candidates and applications
- As a recruiter, I can create a candidate and link the candidate to an open job.
- Candidate lists support combined search, filters, pagination, and useful empty states.
- An application belongs to exactly one candidate and one job and has exactly one current stage.
- A valid stage change updates the application and appends exactly one history record in the same logical operation.
- Duplicate active applications for the same candidate/job are rejected with a clear validation response.

### Notes
- An authorized user can add a note, see its author/time, and delete only notes they are allowed to delete.
- HTML-like note content is escaped and cannot execute in the browser.

### Dashboard
- Dashboard values are derived from stored records, not hard-coded demo values.
- Stage counts represent current application stage; conversion rates use documented denominator definitions.
- Empty datasets return numeric zero values rather than `NaN`, `Infinity`, or missing chart data.

## 4. Business rules and metric definitions

- **Candidate:** a person record. **Application:** a candidate's application to a specific job. **Stage:** belongs to an Application, not to the Candidate globally.
- Stage counts use non-archived applications and each application's current stage.
- **Screening conversion:** distinct applications that have ever entered `Screening` or later / all eligible applications created in the selected period. If the dashboard uses a current snapshot instead, label it clearly and use a single definition consistently.
- **Interview conversion:** distinct applications that have ever entered `Interview` or later / applications that have ever entered `Screening` or later.
- **Offer acceptance rate:** applications that reached `Hired` after entering `Offer` / applications that have ever entered `Offer`. If an application is rejected after Offer, it remains in the denominator.
- Display rates as percentages rounded to one decimal place. If the denominator is zero, return `0` and optionally expose a “no data” hint in the UI.
- A stage transition must be validated on the server. Allowed transitions are `Applied → Screening/Rejected`, `Screening → Interview/Rejected`, `Interview → Offer/Rejected`, `Offer → Hired/Rejected`. No transition out of `Hired` or `Rejected` is allowed in the MVP. Admins do not bypass this rule.
- Stage history is append-only through normal API operations. Do not silently rewrite old entries.
- Use UTC timestamps in storage; display them in the user's local timezone.

## 5. UX requirements
- Professional, calm recruiter-focused interface.
- Responsive layout for desktop, tablet, and mobile.
- Shared navigation for Dashboard, Candidates, Pipeline, Jobs, and Profile/Settings.
- Every data view handles loading, empty, success, and error states.
- Destructive/archive actions require confirmation.
- Forms show field-level validation and a top-level server error when appropriate.
- Use accessible labels, keyboard-operable controls, visible focus states, adequate color contrast, and non-color stage indicators.
- Do not display secrets, stack traces, raw database errors, or full JWTs in the UI.

## 6. Non-functional requirements and security
- TypeScript strict mode should be enabled for the frontend and shared API types where practical.
- Validate and normalize all request data on the server with Zod (or equivalent schema validation).
- Use parameterized/ODM-safe queries; never concatenate raw user input into database query operators.
- Add request body size limits, sensible pagination limits, and auth rate limiting for login/signup.
- Cookie configuration: `HttpOnly`, `Secure` in production, `SameSite=Lax` by default, and narrow path/domain settings. Configure CORS for the exact deployed frontend origin with credentials. Use a CSRF mitigation appropriate to the cookie/CORS deployment.
- Secrets exist only in environment variables and are excluded from Git.
- Do not log passwords, session tokens, resumes, or note content unnecessarily.
- Errors use a stable JSON shape and suitable HTTP status codes.
- API health endpoint reports service status without revealing secrets.
- Seed data must be synthetic and demo credentials must not be reused for real applicant data.

## 7. Delivery requirements
- Deployed frontend and API URLs.
- GitHub repository with source code.
- Root `README.md`, `prd.md`, `implementation_plan.md`, `audit.md`, `task_today.md`, `bugs.md`, and `testing.md`.
- `.env.example` with placeholder values only.
- Reproducible seed script and demo data spanning all hiring stages.
- Screenshots or a 2–3 minute demo video.
- Evidence that lint, type-check, tests, and build passed.

## 8. Definition of done
A feature is complete only when its API/UI behavior, validation, authorization, empty/error states, and tests are implemented; the required checks pass; and documentation is updated. “Code written” or “looks correct” is not sufficient evidence. Do not claim a deployment or test passed unless it was actually verified.

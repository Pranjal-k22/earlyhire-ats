# Mini ATS — Architecture and Technical Design

**Version:** 1.0  
**Related documents:** `PRD.md`, `Architecture-essentials.md`, `AGENTS.md`  
**Architecture principle:** use the simplest modular design that preserves security, testability, and data integrity for the MVP.

---

## 1. Technology decisions

| Layer | Chosen technology | Reason for this project |
|---|---|---|
| Frontend | React, Vite, TypeScript | Fast feedback loop, component ecosystem, static build for Vercel. |
| Styling | Tailwind CSS | Responsive utility classes; consistent UI with little custom CSS. |
| Routing | React Router | Client-side page navigation and protected route layout. |
| Server/cache state | TanStack Query (recommended) | Query caching, loading/error handling, invalidation after mutations. |
| Forms | React Hook Form + Zod | Efficient forms and clear client validation. Server validates independently. |
| API | Node.js + Express + TypeScript | Familiar REST API and modular middleware. |
| Database | MongoDB Atlas + Mongoose | Matches chosen project stack, managed free tier, flexible candidate profile fields. |
| Authentication | JWT in HttpOnly cookie; bcrypt password hashing | Browser session without exposing bearer token to JavaScript storage. |
| Charts | Recharts | React-friendly dashboard visuals. |
| Testing | Vitest + React Testing Library; Node test runner or Vitest + Supertest | Unit and API integration tests with TypeScript support. Use one consistent test runner per package. |
| API contract | OpenAPI document at `docs/openapi.yaml` (MVP recommended) | Lets reviewers inspect endpoints and makes client/server expectations explicit. |
| Frontend hosting | Vercel | Static React/Vite hosting and preview deployments. |
| Backend hosting | Render | Express web service. Free instances may sleep and have cold starts. |
| Source control | GitHub | Version control, pull requests, issue tracking, CI. |

### 1.1 Package management
Use npm workspaces from the repository root. Lock dependencies with `package-lock.json`. Avoid `*` version ranges. Commit the lockfile and use `npm ci` for CI/deploy builds.

### 1.2 Alternatives
- **SQLite:** useful for a purely local/single-process prototype, but not the selected default for a deployed multi-user app on a managed serverless/free web host.
- **PostgreSQL:** a strong relational option, especially for reporting-heavy relationships. Switching to it changes schema, queries, migrations, and data access, so it is not a drop-in change. Do not mix SQL examples into this MongoDB implementation.
- Choose one database before coding and keep this document synchronized with the implementation. For this project, MongoDB Atlas is the approved choice.

---

## 2. System architecture

```text
┌──────────────────────────────────────────────┐
│ Browser                                      │
│ React + Vite + TypeScript + Tailwind          │
│ React Router · Query cache · RHF/Zod          │
└──────────────────────┬───────────────────────┘
                       │ HTTPS / JSON / Cookie
                       ▼
┌──────────────────────────────────────────────┐
│ Express API (Render)                          │
│ Request ID → Helmet → CORS → Rate limit      │
│ → Auth cookie/JWT → RBAC → Validation        │
│ → Router → Controller → Service → Mongoose   │
└──────────────────────┬───────────────────────┘
                       │ TLS MongoDB connection
                       ▼
┌──────────────────────────────────────────────┐
│ MongoDB Atlas                                 │
│ users · candidates · jobs · applications      │
│ stageHistory · notes                          │
└──────────────────────────────────────────────┘

Vercel serves the compiled frontend. A same-origin /api proxy is preferred
when practical; otherwise configure secure cross-origin cookies and exact CORS.
```

### 2.1 Request flow
1. The user submits a form or opens a page in React.
2. The client validates basic field shape using Zod/RHF and sends a request to `/api/v1/...` with `credentials: "include"`.
3. Express assigns/propagates a request ID, applies security headers and CORS, then checks rate limits.
4. Protected routes validate the JWT cookie, load an active user, and enforce role permissions.
5. The request body/params/query are validated using explicit Zod schemas. Controllers translate validated input into service calls.
6. Services apply business rules and use Mongoose models to read/write records.
7. The service returns domain data; the controller responds with a consistent JSON envelope.
8. React updates the page/query cache. Dashboard charts render server-calculated metrics, not separately recomputed client estimates.

### 2.2 Layers and responsibilities
- **Routes:** HTTP method/path, middleware order, controller binding. No business logic.
- **Middleware:** authentication, authorization, validation, rate limiting, request ID, error handling.
- **Controllers:** parse validated request data and map service output to HTTP responses.
- **Services:** business rules, stage transitions, metric formulas, multi-document consistency decisions.
- **Models:** schema validation, indexes, timestamps, and persistence.
- **Frontend pages:** screen composition and user interactions.
- **Frontend components:** reusable visual elements; avoid API calls and business rules buried inside generic components.
- **Frontend API client:** common base URL, cookie credentials, typed response handling, and normalized errors.

---

## 3. Repository layout

```text
mini-ats/
├── AGENTS.md
├── PRD.md
├── Architecture.md
├── Architecture-essentials.md
├── README.md
├── package.json                 # npm workspace scripts
├── package-lock.json
├── .gitignore
├── .editorconfig
├── .env.example                # placeholders only; no real secrets
├── apps/
│   └── web/
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── index.html
│       └── src/
│           ├── app/             # router, providers, route guards
│           ├── api/             # typed HTTP client and endpoint functions
│           ├── components/      # small reusable UI components
│           ├── features/
│           │   ├── auth/
│           │   ├── dashboard/
│           │   ├── candidates/
│           │   ├── jobs/
│           │   ├── applications/
│           │   ├── pipeline/
│           │   └── notes/
│           ├── hooks/
│           ├── lib/             # formatting and client validation helpers
│           ├── types/
│           └── main.tsx
├── apps/
│   └── api/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── app.ts           # express app, middleware, routers
│           ├── server.ts        # startup and graceful shutdown
│           ├── config/          # env validation and DB connection
│           ├── middleware/      # auth, RBAC, validation, error handler
│           ├── modules/
│           │   ├── auth/
│           │   ├── users/
│           │   ├── candidates/
│           │   ├── jobs/
│           │   ├── applications/
│           │   ├── stage-history/
│           │   ├── notes/
│           │   └── dashboard/
│           ├── models/
│           ├── schemas/          # Zod request schemas
│           ├── services/
│           └── utils/
├── scripts/
│   ├── seed-demo.ts
│   └── check-env.ts
├── docs/
│   ├── API.md
│   ├── openapi.yaml
│   ├── DEPLOYMENT.md
│   └── screenshots/
└── tests/
    ├── fixtures/
    └── integration/
```

Do not create a second competing folder layout without updating this file first. A simpler layout is acceptable only if responsibilities remain obvious and the owner approves the adjustment.

---

## 4. Data model

Use Mongoose models with `timestamps: true`, JSON serialization that strips internal fields, and explicit indexes. Object references use MongoDB `ObjectId`. Dates are stored as BSON dates in UTC. Use schema `strict: "throw"` where it does not conflict with legitimate updates; do not silently persist undeclared fields.

### 4.1 User
Collection: `users`

| Field | Type | Required / default | Notes |
|---|---|---|---|
| `_id` | ObjectId | generated | Primary key |
| `name` | string | required | Trimmed; 2–100 chars |
| `email` | string | required | Lowercase, trimmed; unique index |
| `passwordHash` | string | required | bcrypt hash; never serialized |
| `role` | enum | default `Recruiter` | `Admin`, `Recruiter`, `HiringManager` |
| `isActive` | boolean | default `true` | Inactive users cannot authenticate |
| `lastLoginAt` | Date \| null | default `null` | Optional operational data |
| `createdAt`, `updatedAt` | Date | automatic | Mongoose timestamps |

Indexes: `{ email: 1 }` unique. Optional `{ role: 1, isActive: 1 }` for admin user listing.

### 4.2 Candidate
Collection: `candidates`

| Field | Type | Required / default | Notes |
|---|---|---|---|
| `_id` | ObjectId | generated | Primary key |
| `fullName` | string | required | Trimmed; 2–150 chars |
| `email` | string | required | Lowercase, trimmed |
| `phone` | string | optional | Normalize whitespace; validate reasonable format without overly restrictive country assumptions |
| `location` | string | optional | City/region text |
| `experienceYears` | number | default `0` | 0–60, finite, non-negative |
| `skills` | string[] | default `[]` | Trim/dedupe case-insensitively; bounded length/count |
| `currentTitle` | string | optional | Current or most recent title |
| `resumeUrl` | string \| null | default `null` | HTTPS in production; URL length bounded |
| `source` | enum/string | default `Other` | `Referral`, `LinkedIn`, `CompanyWebsite`, `JobBoard`, `Agency`, `Other` |
| `summary` | string | optional | Plain text; max length configured |
| `createdBy` | ObjectId ref User | required | Audit reference |
| `updatedBy` | ObjectId ref User | required | Audit reference |
| `archivedAt` | Date \| null | default `null` | Soft archive flag |
| `createdAt`, `updatedAt` | Date | automatic | |

Indexes: unique case-insensitive identity policy via a normalized `email` field and unique index `{ email: 1 }`; `{ archivedAt: 1, fullName: 1 }`; `{ skills: 1 }`; `{ source: 1, createdAt: -1 }`. If archived-email reuse is desired later, replace the uniqueness rule deliberately with a partial index and document reactivation behavior.

Search note: MongoDB regex search can be expensive. Normalize search input, escape regex metacharacters, cap search length, use anchored/limited strategies where possible, and consider Atlas Search only as a future enhancement. Never interpolate raw user text into an unrestricted regular expression.

### 4.3 Job
Collection: `jobs`

| Field | Type | Required / default | Notes |
|---|---|---|---|
| `_id` | ObjectId | generated | Primary key |
| `title` | string | required | 2–150 chars |
| `department` | string | optional | |
| `location` | string | optional | City/region or `Remote` |
| `employmentType` | enum | default `FullTime` | `FullTime`, `PartTime`, `Contract`, `Internship` |
| `description` | string | required | Plain text/Markdown; bounded size |
| `requirements` | string[] | default `[]` | Skills/requirements as text items |
| `status` | enum | default `Open` | `Open`, `Paused`, `Closed`, `Archived` |
| `ownerId` | ObjectId ref User | required | Responsible recruiter/admin |
| `openedAt` | Date | default now | |
| `closesAt` | Date \| null | default `null` | Must not predate openedAt for new records |
| `archivedAt` | Date \| null | default `null` | Soft archive flag |
| `createdAt`, `updatedAt` | Date | automatic | |

Indexes: `{ status: 1, archivedAt: 1, openedAt: -1 }`; `{ title: 1, status: 1 }`; `{ ownerId: 1, status: 1 }`.

### 4.4 Application
Collection: `applications`

| Field | Type | Required / default | Notes |
|---|---|---|---|
| `_id` | ObjectId | generated | Primary key |
| `candidateId` | ObjectId ref Candidate | required | Must reference an existing candidate |
| `jobId` | ObjectId ref Job | required | Must reference an existing job |
| `recruiterId` | ObjectId ref User | required | Assigned recruiter |
| `stage` | enum | default `Applied` | Canonical stage list from PRD |
| `status` | enum | default `Active` | `Active`, `Withdrawn`, `Archived` |
| `appliedAt` | Date | default now | Cohort/reporting date |
| `lastStageChangedAt` | Date | default now | Update atomically on transition |
| `rejectedAt` | Date \| null | default `null` | Set when moved to Rejected |
| `hiredAt` | Date \| null | default `null` | Set when moved to Hired |
| `source` | enum/string | optional | Snapshot of source for this application when useful; candidate source remains the main profile source |
| `createdBy` | ObjectId ref User | required | |
| `updatedBy` | ObjectId ref User | required | |
| `version` | number | default `0` | Increment on state-changing update; can also use Mongoose optimistic concurrency |
| `createdAt`, `updatedAt` | Date | automatic | |

Indexes: unique compound `{ candidateId: 1, jobId: 1 }`; `{ stage: 1, status: 1, appliedAt: -1 }`; `{ jobId: 1, stage: 1 }`; `{ recruiterId: 1, stage: 1 }`; `{ candidateId: 1, createdAt: -1 }`.

**Concurrency:** use optimistic concurrency (`version`) or a conditional update requiring the expected old stage. A stage transition must write the application and the corresponding history event in a MongoDB transaction when the deployment supports transactions. MongoDB Atlas shared/free deployments should be checked for transaction support; if transactions are unavailable in the target environment, do not pretend writes are atomic—use a safe single-document event/outbox design or explicitly validate the actual deployment and implement compensation/idempotency. Prefer transactions for replica-set Atlas deployments.

### 4.5 InterviewStageHistory
Collection: `stagehistories` (or `applicationstagehistories`; pick one exact collection name in code and use consistently)

| Field | Type | Required / default | Notes |
|---|---|---|---|
| `_id` | ObjectId | generated | Primary key |
| `applicationId` | ObjectId ref Application | required | Parent application |
| `fromStage` | enum \| null | initial event may be null | Null only for initial `Applied` event |
| `toStage` | enum | required | Stage entered |
| `actorId` | ObjectId ref User | required | User or controlled system identity for seed/bootstrap |
| `changedAt` | Date | default now | Event time in UTC |
| `reason` | string \| null | default null | Optional plain text reason, required for privileged terminal-stage correction |
| `durationMsFromPreviousStage` | number \| null | derived when transition occurs | Optional cached duration; source of truth remains event timestamps |
| `requestId` | string \| null | optional | Correlation identifier / transition idempotency aid |

Indexes: `{ applicationId: 1, changedAt: 1 }`; `{ actorId: 1, changedAt: -1 }`. History should be append-only in normal product code.

### 4.6 Note
Collection: `notes`

| Field | Type | Required / default | Notes |
|---|---|---|---|
| `_id` | ObjectId | generated | Primary key |
| `candidateId` | ObjectId ref Candidate | required | Notes are candidate-level in MVP |
| `authorId` | ObjectId ref User | required | |
| `body` | string | required | Plain text, trimmed, 1–5,000 chars |
| `deletedAt` | Date \| null | default `null` | Soft-delete note to preserve minimal history |
| `deletedBy` | ObjectId ref User \| null | default null | |
| `createdAt`, `updatedAt` | Date | automatic | `updatedAt` should not change for body in MVP because notes are immutable |

Indexes: `{ candidateId: 1, createdAt: -1 }`; `{ authorId: 1, createdAt: -1 }`.

### 4.7 Relationships (text ER diagram)

```text
User 1 ──────< Candidate.createdBy / updatedBy
User 1 ──────< Job.ownerId
User 1 ──────< Application.recruiterId / createdBy / updatedBy
User 1 ──────< InterviewStageHistory.actorId
User 1 ──────< Note.authorId

Candidate 1 ──────< Application >────── 1 Job
Application 1 ──────< InterviewStageHistory
Candidate 1 ──────< Note

Unique constraint: one application per (candidateId, jobId) in the MVP.
```

MongoDB references are not SQL foreign keys. Validate referenced IDs in services and add cleanup/archive policies. Mongoose `populate()` is a convenience, not an authorization boundary.

---

## 5. API conventions

### 5.1 Base path and content type
- Base path: `/api/v1`
- Requests/responses: `application/json`, except health and future upload endpoints.
- Authentication: HttpOnly cookie; client requests use `credentials: "include"`.
- Dates: ISO 8601 UTC strings in responses.
- IDs: MongoDB ObjectId represented as a 24-character hex string.

### 5.2 Standard response envelope
Success:
```json
{
  "success": true,
  "data": {},
  "meta": { "requestId": "req_example" }
}
```

Paginated list:
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  },
  "meta": { "requestId": "req_example" }
}
```

Error:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "fields": { "email": "Enter a valid email address." }
  },
  "meta": { "requestId": "req_example" }
}
```

Never return stack traces, database errors, passwords, password hashes, JWTs, cookie values, or internal environment data to clients.

### 5.3 Common status codes
- `200 OK`: successful read/update/action.
- `201 Created`: successful create.
- `204 No Content`: successful logout or deletion only if that endpoint's contract explicitly uses no body.
- `400 Bad Request`: malformed request or invalid ObjectId/path/query.
- `401 Unauthorized`: missing/invalid/expired session.
- `403 Forbidden`: authenticated user lacks permission or account is inactive.
- `404 Not Found`: resource missing or intentionally concealed by authorization policy.
- `409 Conflict`: duplicate candidate/job application, version/stage conflict, or uniqueness violation.
- `422 Unprocessable Entity`: semantic validation failure (choose 400 or 422 consistently; this blueprint uses 422 for field/schema errors).
- `429 Too Many Requests`: rate-limited.
- `500 Internal Server Error`: generic unexpected error.
- `503 Service Unavailable`: readiness/database unavailable, where appropriate.

### 5.4 Endpoint contract summary
All routes except signup, login, logout, and health are protected unless explicitly stated otherwise. Role requirements are enforced by the server.

#### Health

| Method / URL | Purpose | Auth | Request | Success |
|---|---|---|---|---|
| `GET /health/live` | Process liveness only | No | None | `200 {"status":"ok"}` |
| `GET /health/ready` | Readiness including DB connection | No, but expose minimal data only | None | `200` if ready; `503` if dependency unavailable |

#### Authentication

| Method / URL | Purpose | Auth | Request body | Success |
|---|---|---|---|---|
| `POST /api/v1/auth/signup` | Create Recruiter account | No; rate limited | `{ "name": "Asha Recruiter", "email": "asha@example.com", "password": "StrongPass!234" }` | `201 { success, data: { user: { id, name, email, role } } }`; sets session cookie |
| `POST /api/v1/auth/login` | Authenticate user | No; rate limited | `{ "email": "asha@example.com", "password": "..." }` | `200 { success, data: { user } }`; sets session cookie |
| `POST /api/v1/auth/logout` | End session | Session optional; always clears cookie | None | `200 { success: true, data: { loggedOut: true } }` |
| `GET /api/v1/auth/me` | Get current user | Yes | None | `200 { success, data: { user: { id, name, email, role } } }` |

Auth errors: `400/422 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS` (generic), `401 UNAUTHENTICATED`, `429 RATE_LIMITED`, `500 INTERNAL_ERROR`.

#### Users (Admin only except `/me`)

| Method / URL | Purpose | Request |
|---|---|---|
| `GET /api/v1/users?page=1&limit=20` | List users | Admin; paginated |
| `PATCH /api/v1/users/:id` | Change role or active state | `{ "role": "HiringManager", "isActive": true }`; Admin only. Allowlist fields; do not accept `passwordHash`. |

Errors include `401`, `403`, `404`, `409`, `422`.

#### Jobs

| Method / URL | Purpose | Request body / query | Auth and success |
|---|---|---|---|
| `POST /api/v1/jobs` | Create job | `{ "title":"Frontend Engineer", "department":"Engineering", "location":"Bengaluru / Hybrid", "employmentType":"FullTime", "description":"...", "requirements":["React","TypeScript"], "status":"Open", "closesAt":null }` | Admin/Recruiter; `201 {data:{job}}` |
| `GET /api/v1/jobs?page=1&limit=20&status=Open&search=frontend&sort=openedAt&order=desc` | List/search/filter jobs | Query params are allowlisted | Any authenticated role; `200` with pagination |
| `GET /api/v1/jobs/:id` | Get one job | None | Any authenticated role; `200 {data:{job}}` |
| `PATCH /api/v1/jobs/:id` | Update job | Any subset of editable job fields | Admin/Recruiter; `200 {data:{job}}` |
| `DELETE /api/v1/jobs/:id` | Archive job (soft delete) | None | Admin/Recruiter; `200 {data:{job}}`; linked applications remain |

Job errors include `400 INVALID_ID`, `401`, `403`, `404 JOB_NOT_FOUND`, `409 JOB_CONFLICT` where relevant, `422 VALIDATION_ERROR`.

#### Candidates

| Method / URL | Purpose | Request body / query | Auth and success |
|---|---|---|---|
| `POST /api/v1/candidates` | Create candidate | `{ "fullName":"Mira Shah", "email":"mira@example.com", "phone":"+91 98765 43210", "location":"Bhopal", "experienceYears":3, "skills":["React","TypeScript"], "currentTitle":"Frontend Developer", "resumeUrl":"https://example.com/resume/mira", "source":"Referral", "summary":"..." }` | Admin/Recruiter; `201 {data:{candidate}}` |
| `GET /api/v1/candidates?page=1&limit=20&search=mira&skill=React&source=Referral&createdFrom=2026-01-01&createdTo=2026-12-31&sort=createdAt&order=desc` | Search/filter candidates | Query params validated; `limit <= 100` | Authenticated roles; `200` paginated |
| `GET /api/v1/candidates/:id` | Candidate detail | None | Authenticated; `200 {data:{candidate}}` |
| `PATCH /api/v1/candidates/:id` | Edit candidate | Partial candidate fields | Admin/Recruiter; `200 {data:{candidate}}` |
| `DELETE /api/v1/candidates/:id` | Archive candidate | None | Admin/Recruiter; `200 {data:{candidate}}`; keep applications/history |

Errors include `409 CANDIDATE_EMAIL_EXISTS`, `400 INVALID_ID`, `401`, `403`, `404 CANDIDATE_NOT_FOUND`, `422 VALIDATION_ERROR`.

#### Applications and pipeline

| Method / URL | Purpose | Request body / query | Auth and success |
|---|---|---|---|
| `POST /api/v1/applications` | Apply a candidate to a job | `{ "candidateId":"<objectId>", "jobId":"<objectId>", "recruiterId":"<objectId>", "source":"Referral" }` | Admin/Recruiter; `201 {data:{application}}`; creates initial `Applied` history event |
| `GET /api/v1/applications?page=1&limit=20&stage=Interview&jobId=<id>&candidateId=<id>&recruiterId=<id>&status=Active&appliedFrom=2026-01-01&appliedTo=2026-12-31` | List/filter applications | Query fields allowlisted | Authenticated; `200` paginated |
| `GET /api/v1/applications/:id` | Get application and related summary | None | Authenticated; `200 {data:{application, candidate, job}}` |
| `PATCH /api/v1/applications/:id` | Update allowed application metadata/assignment | `{ "recruiterId":"<id>" }` or explicitly permitted fields | Admin/Recruiter; must not use this route to bypass transition rules |
| `POST /api/v1/applications/:id/stage` | Change stage with history | `{ "toStage":"Interview", "expectedStage":"Screening", "expectedVersion":2, "reason":"Technical screen passed" }` | Admin/Recruiter; Hiring Manager only per permission matrix; `200 {data:{application, historyEvent}}` |
| `GET /api/v1/applications/:id/stage-history` | Get ascending/descending history | Optional `order=asc|desc` | Authenticated; `200 {data:[historyEvent]}` |
| `POST /api/v1/applications/:id/terminal-correction` | Privileged correction/reopen if approved | `{ "toStage":"Interview", "reason":"Corrected mistaken disposition" }` | Admin only; required reason; creates history event. If not needed for MVP, omit endpoint and keep terminal states irreversible. |

Application errors include `409 DUPLICATE_APPLICATION`, `409 STAGE_CONFLICT`, `409 INVALID_STAGE_TRANSITION`, `400 INVALID_ID`, `401`, `403`, `404`, `422 VALIDATION_ERROR`.

#### Notes

| Method / URL | Purpose | Request body / query | Auth and success |
|---|---|---|---|
| `POST /api/v1/candidates/:id/notes` | Add candidate note | `{ "body":"Strong communication; schedule a follow-up." }` | Admin/Recruiter/Hiring Manager; `201 {data:{note}}` |
| `GET /api/v1/candidates/:id/notes?page=1&limit=20` | List notes | Pagination | Authenticated; `200` paginated, excluding soft-deleted notes |
| `DELETE /api/v1/notes/:noteId` | Soft-delete note | None | Author or Admin; `200 {data:{id,deletedAt}}` |

Errors include `401`, `403`, `404`, `422`.

#### Dashboard

| Method / URL | Purpose | Request | Auth and success |
|---|---|---|---|
| `GET /api/v1/dashboard/metrics?from=2026-01-01&to=2026-12-31` | Summary cards, stage counts, conversion rates, optional stage timing | Date range optional; validate `from <= to` | Authenticated; `200 { data: { totals, stageCounts, conversion, avgTimeInStageMs, generatedAt } }` |

Example payload:
```json
{
  "success": true,
  "data": {
    "totals": {
      "activeCandidates": 30,
      "openJobs": 5,
      "activeApplications": 28,
      "hiredApplications": 3,
      "rejectedApplications": 4
    },
    "stageCounts": {
      "Applied": 8,
      "Screening": 6,
      "Interview": 5,
      "Offer": 2,
      "Hired": 3,
      "Rejected": 4
    },
    "conversion": {
      "screeningRate": 0.72,
      "interviewRate": 0.55,
      "offerToHireRate": 0.5
    },
    "avgTimeInStageMs": null,
    "generatedAt": "2026-10-17T08:00:00.000Z"
  },
  "meta": { "requestId": "req_example" }
}
```

The example numbers are illustrative only. Do not hardcode them. Define whether dashboard stage counts include only `status: Active` applications; default: stage counts include all non-archived applications within the reporting cohort, and the UI labels the population. Historical Hired/Rejected counts include terminal outcomes even if their current status is later archived, unless the selected metric explicitly states otherwise.

### 5.5 Query parameter validation
- `page`: integer, minimum 1, default 1.
- `limit`: integer 1–100, default 20.
- `sort`: allowlisted field per endpoint.
- `order`: `asc` or `desc` only.
- Date range accepts ISO date/time; reject invalid dates and `from > to`.
- Never pass client-supplied objects/operators directly into a MongoDB query.

---

## 6. Authentication and authorization design

### 6.1 Signup/login
1. Validate email/password format.
2. Normalize email.
3. For signup, reject existing normalized email, hash password with bcrypt, create user with role `Recruiter` regardless of payload.
4. For login, fetch user by normalized email and compare bcrypt hash. Use a generic error for unknown email/wrong password.
5. Sign JWT with subject user ID, issued-at, expiration, and minimal claims. Do not embed mutable permissions as the only authority source; reload active user/role in auth middleware or use short TTL and revoke/rotation strategy.
6. Set cookie with `HttpOnly`, `Secure` in production, explicit `SameSite`, `Path=/`, expiration/max age, and no broad domain unless required.
7. On every protected request, verify signature/expiry and load active user. Enforce role using middleware/service policy.

### 6.2 Cookie/CORS deployment
Preferred: configure a same-origin `/api` reverse proxy so browser cookies remain first-party. If frontend and API are served on different origins:
- `fetch` uses `credentials: "include"`.
- API returns `Access-Control-Allow-Origin` set to the exact configured frontend origin, not `*`.
- API returns `Access-Control-Allow-Credentials: true`.
- Cookies generally require `SameSite=None; Secure` for cross-site requests. Modern browsers may restrict third-party cookies; validate in the browsers used for the live demo and use a same-origin proxy if cookie persistence fails.
- Consider CSRF protection for state-changing cookie-authenticated endpoints (Origin/Referer allowlist and/or CSRF token). SameSite alone should not be treated as the only defense for every deployment.
- Never reflect arbitrary origins.

### 6.3 RBAC implementation
Implement `authenticate` and explicit authorization helpers such as `requireRole("Admin")`, plus service-level policies for resource actions. Test direct API calls, not only UI visibility. Default deny when role or record ownership cannot be established.

---

## 7. Dashboard data definitions

Endpoint must return server-calculated metrics based on one agreed reporting cohort.
- `activeCandidates`: candidate documents where `archivedAt == null`.
- `openJobs`: jobs where `status == Open` and `archivedAt == null`.
- `activeApplications`: applications with `status == Active` within applied-date cohort.
- `hiredApplications`: applications that reached `Hired` within the cohort and are not duplicates; use stage/history as source of truth.
- `rejectedApplications`: applications that reached `Rejected` within the cohort.
- `stageCounts`: applications grouped by their current stage for the selected population; explicitly label this as “current stage distribution.”
- `screeningRate`: distinct cohort applications that reached Screening-or-later / total cohort applications.
- `interviewRate`: distinct cohort applications that reached Interview-or-later / distinct applications that reached Screening-or-later.
- `offerToHireRate`: applications that reached Hired / applications that reached Offer-or-later (label accordingly).
- Return rates as decimal fractions (`0.0–1.0`) or percentages consistently; recommended API decimal and UI percent formatting.
- Return `0` for a zero denominator.
- Stage-history event order is determined by `changedAt` and stable `_id` tie-breaker. Guard against malformed/missing histories.

---

## 8. Frontend pages and state behavior

### 8.1 Login / Signup
Components: text inputs, password input, show/hide password control, submit button, validation messages.
Actions: signup, login, navigate between forms.
States: submitting, validation error, authentication error, successful redirect. Do not say “email already registered” if that leaks data in a sensitive environment; choose the product's approved error copy.

### 8.2 Dashboard
Components: summary cards, stage-distribution bar/pie chart, conversion cards, recent applications list.
Actions: change date range, navigate to filtered lists.
States: skeleton/loading, empty dashboard, API error with retry, no-history metric disclaimer.

### 8.3 Candidate list
Components: server-side search box, source/date filters, table/cards, pagination, sort controls, add candidate action.
Actions: search, filter, sort, paginate, inspect, edit, archive.
States: no candidates, no search matches, initial loading, loading next page, recoverable failure.

### 8.4 Candidate form/detail
Fields: fullName, email, phone, location, experienceYears, skills, currentTitle, resumeUrl, source, summary.
Validation: required name/email; valid email; experience 0–60; skills constrained; URL HTTPS in production; text lengths bounded.
Detail page sections: profile, applications by job, stage history per application, notes.
States: create/edit submit, field-level validation, duplicate email conflict, missing/archived candidate, save error, unsaved changes confirmation if implemented.

### 8.5 Jobs list and job form
Components: status filters, job table/cards, open roles counter, create/edit form.
Validation: required title/description; known employment type/status; valid dates; closesAt not before openedAt.
States: no jobs, no open jobs, save/loading/error, archive confirmation, existing applications warning.

### 8.6 Applications list and pipeline board
Components: stage lanes, counts, application cards, candidate/job labels, stage action selector. Drag-and-drop is optional and must not be the only way to move an application.
Actions: open application, move stage, assign recruiter, reject with optional reason, inspect history.
Validation: stage matrix, terminal state restrictions, expected current stage/version.
States: empty stage lane, update pending, conflict warning with refresh action, invalid transition message, network retry.

### 8.7 Candidate notes
Components: note composer, note list, author/date metadata, delete action.
Validation: trimmed body between 1 and 5,000 characters.
States: no notes, add pending, add error, delete confirmation, permission error.

### 8.8 Profile/settings (optional P1)
Components: current user details, role read-only for non-Admin, logout button. Do not add password-reset flows unless email-delivery infrastructure is configured.

### 8.9 Shared UI conventions
- Use a shared app shell with responsive sidebar/navigation.
- At 360–767 px, replace wide tables with cards or controlled horizontal scrolling; keep key actions reachable.
- Keep actions and status labels consistent across list, detail, and pipeline views.
- Toasts supplement, not replace, inline form errors.
- Destructive actions require a clear confirmation and use archive semantics.
- Respect reduced-motion preferences; ensure chart labels/legends remain understandable without color alone.

---

## 9. Environment variables

### API (`apps/api/.env` for local development)
```dotenv
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/mini_ats
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-bytes
JWT_EXPIRES_IN=2h
COOKIE_NAME=mini_ats_session
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
FRONTEND_URL=http://localhost:5173
TRUST_PROXY=0
LOG_LEVEL=info
```

For production, set `NODE_ENV=production`, `COOKIE_SECURE=true`, and choose `COOKIE_SAME_SITE`/proxy design as detailed above. Never reuse the sample JWT secret. Validate all env vars at startup and fail fast with a safe message when required values are missing.

### Web (`apps/web/.env.local`)
```dotenv
VITE_API_BASE_URL=http://localhost:4000/api/v1
```
If using a Vercel same-origin proxy, set the frontend client to `/api/v1` and configure proxy rewrites/headers intentionally. Vite exposes variables prefixed with `VITE_` to the browser; never put secrets in them.

### Seed-only variables
```dotenv
SEED_ADMIN_NAME=Mini ATS Admin
SEED_ADMIN_EMAIL=admin@miniats.demo
SEED_ADMIN_PASSWORD=change-this-demo-password
```
Seed credentials are for demo/test only; do not reuse for a real organization.

---

## 10. Root npm commands

The root `package.json` should provide one reliable command surface for agents and reviewers. Exact workspace implementation may vary, but keep these command names stable:

```json
{
  "name": "mini-ats",
  "private": true,
  "workspaces": ["apps/web", "apps/api"],
  "scripts": {
    "dev": "concurrently -n api,web -c blue,green \"npm run dev -w apps/api\" \"npm run dev -w apps/web\"",
    "lint": "npm run lint -w apps/api && npm run lint -w apps/web",
    "typecheck": "npm run typecheck -w apps/api && npm run typecheck -w apps/web",
    "test": "npm run test -w apps/api && npm run test -w apps/web",
    "build": "npm run build -w apps/api && npm run build -w apps/web",
    "seed:demo": "npm run seed:demo -w apps/api"
  }
}
```

Install `concurrently` as a root dev dependency if using the script above. Each workspace must define the referenced `dev`, `lint`, `typecheck`, `test`, and `build` scripts. Do not leave scripts pointing to commands that do not exist. A command may be adjusted if the project uses a different test runner, but then update this document and AGENTS.md in the same change.

Recommended local sequence:
```bash
npm ci
cp apps/api/.env.example apps/api/.env
# Set a valid local MongoDB URI and strong local JWT secret.
npm run dev
```

Before marking any work complete:
```bash
npm run lint
npm run typecheck
npm test
npm run build
```

For API integration tests, use a dedicated test database and a URI guard. A test must never run destructive seed/reset operations when `NODE_ENV=production` or when the connection string identifies the production database.

---

## 11. Testing architecture

### Unit tests
- Stage transition matrix and terminal-state behavior.
- Metric formula helpers, especially zero denominator and stage-history ordering.
- Zod request schemas and email/URL normalization.
- Authorization policy helpers.

### API integration tests
- Signup/login/logout/me and cookie flags.
- CRUD and RBAC for candidates and jobs.
- Duplicate candidate and application prevention.
- Application creation creates initial history.
- Valid stage transition changes state and adds one event.
- Invalid/stale transition changes neither application nor history.
- Notes permissions and soft deletion.
- Search/filter/sort/pagination and query allowlists.
- Dashboard numbers match deterministic fixture data.

### Frontend tests
- Form validation and visible field errors.
- Protected-route behavior after `/auth/me` resolves.
- Loading/empty/error states.
- Candidate form and stage change interactions.
- Dashboard metrics render the server result and handle empty values.

### E2E smoke tests (recommended if time allows)
With Playwright: sign in using a seeded account, create a candidate, create/verify job, create application, move to Screening, check the history and dashboard, then sign out. Do not use real PII.

---

## 12. Deployment architecture and production checklist

### 12.1 MongoDB Atlas
1. Create a database project and a least-privilege database user.
2. Set network access appropriately. For production, prefer the provider's secure connection policy and avoid broad IP allowlists where not needed. If the hosting provider uses changing egress IPs, document the accepted temporary demo trade-off rather than assuming allowlisting is solved.
3. Copy the connection string to Render's secret environment configuration, not to source control.
4. Verify TLS, auth, database name, and index initialization.
5. Seed fictional demo data into the intended demo database only.

### 12.2 Render API
1. Connect GitHub repository and select `apps/api` as the service root or configure the workspace build commands from the repo root.
2. Install command: `npm ci` (root workspace) or the equivalent workspace-safe install.
3. Build command: `npm run build -w apps/api` (if root is build context).
4. Start command: run the compiled server, e.g. `npm run start -w apps/api`; do not run a development watcher in production.
5. Configure all production env vars and exact `FRONTEND_URL`.
6. Add health/readiness endpoints and verify them after deploy.
7. Inspect startup logs for connected database and index readiness; never log connection strings.
8. Test cold starts. Free web services may sleep; the first request can be slow. Explain this limitation in the demo README. Do not use unauthorized keep-alive pings to evade host policies; upgrade/change host if guaranteed uptime is required.

### 12.3 Vercel frontend
1. Import GitHub repo and select `apps/web` as root, or configure correct workspace build output from the root.
2. Install with the committed lockfile.
3. Build using `npm run build` in the web workspace; output is Vite's `dist` directory.
4. Set only public `VITE_` configuration values.
5. Configure the API base URL/rewrite strategy, HTTPS, and cookie credentials.
6. Test login/logout, refreshing a protected route, and API errors from the deployed domain in a real browser.

### 12.4 CORS and session release gate
- Exact origin allowlist; no wildcard with credentials.
- `credentials: true` on server CORS; `credentials: "include"` on client.
- Secure cookie in production and correct `SameSite` mode.
- If cross-site cookies fail, implement a same-origin Vercel proxy/rewrite and test; do not weaken cookie security as a shortcut.
- Add CSRF mitigation for cookie-authenticated mutations and test allowed/disallowed Origin behavior.

### 12.5 Final live checklist
- [ ] All production secrets exist only in host environment settings.
- [ ] API health and readiness are reachable.
- [ ] Database connection uses TLS and least-privilege user.
- [ ] No production seed/reset route is publicly accessible.
- [ ] Signup cannot assign Admin role.
- [ ] Login throttling and cookie configuration verified.
- [ ] Direct unauthorized API calls blocked.
- [ ] Stage history and dashboard metrics verified against seeded records.
- [ ] Browser console/network logs contain no uncaught error or secret.
- [ ] Demo credentials are labelled public and disposable.
- [ ] README includes actual deployment links and known limitations.

---

## 13. Operational limits and future scaling

MVP does not promise high availability, multi-region redundancy, audited compliance, or enterprise performance. Keep API instances stateless, use managed MongoDB, cap list sizes, add indexes, and log request IDs and operational failures. Future enhancements may include file storage (S3-compatible), email/calendar integrations, resume parsing, CSV import/export, organization-level tenancy, event-driven notifications, advanced analytics, audit-log export, and stronger session revocation.

Any future enhancement must first be written into `PRD.md`; architecture changes must be recorded in this file and non-negotiable rules kept in `Architecture-essentials.md`.

---

## 14. Recruitment Analytics & KPI Definitions (Phase 7)

### 14.1 Metric Semantics & Integrity Rules
The data model strictly separates Candidate (individual entity) from Application (workflow instance for a specific job). A single candidate can have multiple applications with different outcomes. To prevent contradictory counts, the following semantics are applied:

1. **Total Active Candidates:**
   - Formula: `Candidate.countDocuments({ archivedAt: null })`
   - Scope: Complete registered active talent pool, excluding soft-deleted candidates.
2. **Open Positions:**
   - Formula: `Job.countDocuments({ status: "Open", archivedAt: null })`
   - Scope: Job requisitions currently active and accepting applications.
3. **Hired Candidates:**
   - Formula: Distinct candidate IDs from applications whose `currentStage === "Hired"` within the active cohort (`status` not in `["Archived", "Withdrawn"]`).
   - Guarantees: Candidates with multiple concurrent applications are counted once in people-level hiring totals.
4. **Rejected Candidates:**
   - Formula: Distinct candidate IDs from applications whose `currentStage === "Rejected"` within the active cohort.
5. **Applications by Stage:**
   - Grouping: Active applications (`status` not in `["Archived", "Withdrawn"]`) grouped by `currentStage`:
     `Applied`, `Screening`, `Interview`, `Offer`, `Hired`, `Rejected`.
   - Label: Displayed as "Applications by Stage" to indicate record counts rather than distinct people counts.
6. **Screening Conversion Rate:**
   - Cohort: Applications created (`appliedAt`) within the selected date range.
   - Formula: `reachedScreening / totalCohortApplications`
   - Zero denominator: Returns `null` (displayed as `—` in UI; never fabricated as `0%`).
7. **Interview Conversion Rate:**
   - Formula: `reachedInterview / reachedScreening`
   - Zero denominator: Returns `null` (displayed as `—`).
8. **Offer Acceptance Rate:**
   - Formula: `hiredFromOffer / (hiredFromOffer + rejectedFromOffer)`
   - Derived strictly from resolved transitions in `InterviewStageHistory`:
     - Numerator: Applications that transitioned from `Offer` to `Hired`.
     - Denominator: Applications that transitioned from `Offer` to `Hired` plus applications that transitioned from `Offer` to `Rejected`.
     - Denominator exclusion: Applications currently sitting in `Offer` (unresolved / pending decisions) are strictly excluded from the denominator.
   - Zero denominator: Returns `null` when no offers have reached a terminal outcome.
9. **Average Time in Stage (ms):**
   - Derived from `durationMsFromPreviousStage` on completed `InterviewStageHistory` transitions.
   - Pending visits in current stages are excluded from completed transition averages.
10. **Candidate Sourcing Distribution:**
    - Breakdown of origin channels (`source` on Application or Candidate: e.g. LinkedIn, Referral, CareerPage) with counts and percentages across the active cohort.

### 14.2 Date Filter Behavior
- **Filtered Entity:** Application creation date (`appliedAt`).
- **Range Presets:**
  - `7d`: Applications created in the past 7 days (UTC).
  - `30d`: Applications created in the past 30 days (UTC).
  - `90d`: Applications created in the past 90 days (UTC).
  - `all`: All active applications regardless of date.
- **Custom Range:** Validated `from` and `to` ISO date strings (`YYYY-MM-DD`). End date `to` is inclusive through `23:59:59.999 UTC`. Invalid inputs or reversed ranges (`from > to`) are rejected with HTTP 422 `VALIDATION_ERROR`.

### 14.3 Analytics API Endpoints
- `GET /api/v1/analytics/overview` (Overview KPIs, stage distribution, conversion rates, sourcing, durations).
- `GET /api/v1/analytics/funnel` (Detailed funnel step progression and dropoff rates).
- `GET /api/v1/dashboard/metrics` (Backward-compatible alias for overview).
- Protected with `requireAuth` (401 `UNAUTHENTICATED`).


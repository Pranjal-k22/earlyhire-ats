# EarlyAI ATS — AI-Powered End-to-End Recruitment Workflow
## Architecture, Data Model, RBAC, and Integration Specification

### 1. Executive Summary & Product Vision

EarlyAI ATS evolves from a recruiter-only tracking system into an **end-to-end AI-assisted recruitment platform** connecting three primary stakeholders:
1. **Candidate / User**: Candidate self-service, resume management, ATS match score analysis, job discovery, application tracking, interview access, and released feedback.
2. **Hiring Team**: Multi-stage hiring pipeline, resume & ATS assessment evaluation, stage-specific AI briefing, interview scheduling with Google Meet, structured rubric scoring, and feedback release.
3. **Platform Manager**: User role administration, system audit logs, AI provider configuration, token usage & latency analytics, and integration health supervision.

The design strictly adheres to:
- **Human-Controlled Decision Making**: AI acts exclusively as decision support. No automated rejection or hiring.
- **Robust Security & Privacy**: Strict server-enforced RBAC, object-level access controls, credential protection, prompt injection resistance, and private storage for resume documents.
- **Resilient AI Provider Abstraction**: Multi-provider support (Google Gemini & Groq), configurable models, rate limiting, token usage tracking, and bounded retries.
- **Real Calendar & Meet Integration**: Google Calendar API integration with `conferenceDataVersion=1` for authentic Google Meet links, with structured manual/pending fallback.
- **Full Backward Compatibility**: Preserves all existing models, 202 automated tests, and recruiter workflows without regression.

---

### 2. Role-Based Access Control (RBAC) & Migration Strategy

#### 2.1 Canonical Roles & Permission Matrix

| Resource / Action | Candidate (`candidate`) | Hiring Team (`hiring_team`) | Platform Manager (`platform_manager`) |
| :--- | :---: | :---: | :---: |
| **Self Registration / Login / Session** | ✅ | ✅ | ✅ |
| **Manage Own Profile & Account** | ✅ | ✅ | ✅ |
| **Upload / Delete Own Resume** | ✅ | ❌ | ❌ |
| **Run Self-Service ATS Analysis on Own Resume** | ✅ | ❌ | ❌ |
| **Browse Published Jobs & Apply** | ✅ | ❌ | ❌ |
| **View Own Applications & Status** | ✅ | ❌ | ❌ |
| **Withdraw Own Application** | ✅ | ❌ | ❌ |
| **View Own Scheduled Interviews & Meet Links** | ✅ | ❌ | ❌ |
| **View Released Feedback on Own Applications** | ✅ | ❌ | ❌ |
| **View / Manage Jobs (CRUD, Publish, Archive)** | ❌ | ✅ | ✅ |
| **View Applicants for Assigned/Permitted Jobs** | ❌ | ✅ | ✅ |
| **View Candidate Resumes & Internal ATS Reports** | ❌ | ✅ | ✅ |
| **Transition Application Stages** | ❌ | ✅ | ✅ |
| **Enter Private Recruiter Notes** | ❌ | ✅ | ✅ |
| **Schedule Google Meet Interviews** | ❌ | ✅ | ✅ |
| **Submit Structured Rubric Feedback** | ❌ | ✅ | ✅ |
| **Approve & Release Feedback to Candidate** | ❌ | ✅ | ✅ |
| **View Hiring Funnel Analytics** | ❌ | ✅ | ✅ |
| **User Role Assignment & Account Administration** | ❌ | ❌ | ✅ |
| **View Platform-Wide AI Usage & Token Metrics** | ❌ | ❌ | ✅ |
| **Inspect System Audit Logs & Integration Health** | ❌ | ❌ | ✅ |

#### 2.2 Backward Compatibility & Role Normalization

To preserve 100% compatibility with the existing 155 API tests and deployed database records:
```typescript
export const CANONICAL_ROLES = ["candidate", "hiring_team", "platform_manager"] as const;
export const LEGACY_ROLES = ["admin", "recruiter", "hiring_manager"] as const;
export const ALL_ROLES = [...CANONICAL_ROLES, ...LEGACY_ROLES] as const;

export type CanonicalRole = (typeof CANONICAL_ROLES)[number];
export type UserRole = (typeof ALL_ROLES)[number];

export const normalizeRole = (role: UserRole): CanonicalRole => {
  switch (role) {
    case "admin":
    case "platform_manager":
      return "platform_manager";
    case "recruiter":
    case "hiring_manager":
    case "hiring_team":
      return "hiring_team";
    case "candidate":
    default:
      return "candidate";
  }
};
```
- In `requireRole(...roles)`: Roles are normalized so that existing users (`admin`, `recruiter`, `hiring_manager`) seamlessly retain their expected access.
- In Public Registration: The registration endpoint strictly defaults to role `candidate`. Registration **never** allows assigning `platform_manager` or `admin`.
- Idempotent Migration Script: `npm run migrate:roles -- --dry-run` and `npm run migrate:roles -- --execute` to allow database administrators to update existing records when authorized.

---

### 3. Domain Model Architecture

#### 3.1 New & Extended Mongoose Schemas

1. **`ResumeFile` (`resumes` collection)**
   - `userId`: `ObjectId` (ref: `User`, owner)
   - `fileName`: string (sanitized)
   - `originalName`: string
   - `mimeType`: string (`application/pdf`, etc.)
   - `sizeBytes`: number
   - `fileHash`: string (SHA-256 for deduplication)
   - `storagePath`: string (private relative storage, never in public web root)
   - `extractedText`: string (sanitized text content)
   - `parsingStatus`: `"pending" | "completed" | "failed"`
   - `parsingError`: string | null
   - `isArchived`: boolean (soft deletion)
   - `createdAt`, `updatedAt`: Date

2. **`AtsAnalysis` (`ats_analyses` collection)**
   - `resumeId`: `ObjectId` (ref: `ResumeFile`)
   - `jobId`: `ObjectId` (ref: `Job`)
   - `candidateId`: `ObjectId` (ref: `User`)
   - `applicationId`: `ObjectId | null` (set when attached to an application)
   - `overallScore`: number (0–100)
   - `categoryScores`: `{ skills: number, experience: number, education: number, formatting: number }`
   - `evidencedSkills`: `string[]` (skills evidenced in resume with source quotes)
   - `missingSkills`: `string[]` (skills not evidenced in resume)
   - `experienceMatches`: `string[]`
   - `suggestions`: `string[]` (actionable improvement tips)
   - `interviewTopics`: `string[]` (recommended technical/behavioral probes)
   - `confidence`: `"high" | "medium" | "low"`
   - `provider`: string (`"gemini"` or `"groq"`)
   - `model`: string
   - `promptVersion`: string
   - `createdAt`: Date

3. **`Interview` (`interviews` collection)**
   - `applicationId`: `ObjectId` (ref: `Application`)
   - `candidateId`: `ObjectId` (ref: `User`)
   - `jobId`: `ObjectId` (ref: `Job`)
   - `organizerId`: `ObjectId` (ref: `User`)
   - `interviewers`: `ObjectId[]` (ref: `User`)
   - `title`: string
   - `stage`: HiringStage
   - `startTime`: Date
   - `endTime`: Date
   - `timezone`: string
   - `status`: `"scheduled" | "completed" | "rescheduled" | "cancelled"`
   - `meetUrl`: string (Google Meet join link)
   - `googleCalendarEventId`: string | null
   - `meetingType`: `"google_meet" | "manual"`
   - `cancellationReason`: string | null
   - `createdAt`, `updatedAt`: Date

4. **`InterviewFeedback` (`interview_feedbacks` collection)**
   - `interviewId`: `ObjectId` (ref: `Interview`)
   - `applicationId`: `ObjectId` (ref: `Application`)
   - `interviewerId`: `ObjectId` (ref: `User`)
   - `rubricRatings`: `[{ criterion: string, score: number, comments: string }]`
   - `overallRecommendation`: `"strong_hire" | "hire" | "neutral" | "no_hire" | "strong_no_hire"`
   - `confidentialNotes`: string (internal only)
   - `candidateFacingFeedback`: string | null (draft for candidate release)
   - `isReleasedToCandidate`: boolean
   - `releasedAt`: Date | null
   - `releasedBy`: `ObjectId | null` (ref: `User`)
   - `createdAt`, `updatedAt`: Date

5. **`ApplicationStageReview` (`stage_reviews` collection)**
   - `applicationId`: `ObjectId` (ref: `Application`)
   - `stage`: HiringStage
   - `reviewStatus`: `"pending" | "in_progress" | "completed" | "failed"`
   - `summary`: string
   - `strengths`: `string[]`
   - `redFlags`: `string[]`
   - `recommendedQuestions`: `string[]`
   - `provider`: string
   - `model`: string
   - `createdAt`: Date

6. **`Notification` (`notifications` collection)**
   - `recipientId`: `ObjectId` (ref: `User`)
   - `type`: `"application_submitted" | "stage_updated" | "interview_scheduled" | "feedback_released" | "ats_ready"`
   - `title`: string
   - `message`: string
   - `link`: string | null
   - `isRead`: boolean
   - `idempotencyKey`: string (unique sparse index)
   - `createdAt`: Date

7. **`AIUsageRecord` (`ai_usage_records` collection)**
   - `provider`: `"gemini" | "groq"`
   - `model`: string
   - `operation`: `"ats_analysis" | "stage_review" | "interview_brief"`
   - `promptTokens`: number
   - `completionTokens`: number
   - `totalTokens`: number
   - `latencyMs`: number
   - `status`: `"success" | "error"`
   - `errorCode`: string | null
   - `userId`: `ObjectId | null`
   - `createdAt`: Date

8. **`AuditEvent` (`audit_events` collection)**
   - `actorId`: `ObjectId`
   - `actorRole`: string
   - `action`: string (e.g., `ROLE_MODIFIED`, `INTERVIEW_SCHEDULED`, `FEEDBACK_RELEASED`)
   - `targetType`: string
   - `targetId`: string
   - `details`: `Record<string, unknown>`
   - `ipAddress`: string
   - `createdAt`: Date

---

### 4. API Endpoints Specification

#### 4.1 Authentication & User Profiles
- `POST /api/v1/auth/signup` — Public registration (defaults to `candidate`, enforces password rules).
- `POST /api/v1/auth/login` — Authentication session creation (sets HttpOnly cookie).
- `POST /api/v1/auth/logout` — Session revocation (clears cookie).
- `GET /api/v1/auth/me` — Restores session and returns user profile + normalized role.
- `GET /api/v1/profile` — Candidate profile management (profile info, skills, experience).
- `PUT /api/v1/profile` — Update candidate profile (protected fields like `role` blocked).

#### 4.2 Resume & ATS Analysis
- `POST /api/v1/resumes/upload` — Upload PDF/text resume (content verification, text parsing, secure storage).
- `GET /api/v1/resumes/my` — Candidate lists their own resumes.
- `GET /api/v1/resumes/:id/text` — Candidate views their own parsed text; hiring team views for applicant.
- `DELETE /api/v1/resumes/:id` — Soft-delete resume subject to retention policy.
- `POST /api/v1/ats/analyze` — Candidate self-service ATS analysis (resume vs job without applying).
- `GET /api/v1/ats/reports/:id` — Retrieve structured ATS report (ownership verified).

#### 4.3 Candidate Job Application & Tracking
- `POST /api/v1/candidate/applications` — Candidate applies to an open job (active-application duplicate rule enforced, resume snapshot captured, ATS review enqueued).
- `GET /api/v1/candidate/applications` — Candidate lists their own applications and visible stage history.
- `POST /api/v1/candidate/applications/:id/withdraw` — Candidate withdraws their own application.

#### 4.4 Hiring Team Workflow & Stage AI Reviews
- `GET /api/v1/applications/:id/ats` — Hiring team views application-specific ATS analysis.
- `GET /api/v1/applications/:id/stage-review` — Hiring team generates or views stage-specific AI briefing (screening probes, interview questions).
- `PATCH /api/v1/applications/:id/stage` — Human transitions stage (audit event logged, stage history recorded).

#### 4.5 Interview Scheduling & Google Meet
- `POST /api/v1/interviews` — Schedule interview (Google Calendar event creation with `conferenceDataVersion=1`, Meet URL generated, notifications created).
- `GET /api/v1/interviews/:id` — View interview details & Meet link (candidate or interviewer only).
- `PATCH /api/v1/interviews/:id/reschedule` — Reschedule interview (Google Calendar updated).
- `POST /api/v1/interviews/:id/cancel` — Cancel interview (Google Calendar cancelled).

#### 4.6 Structured Feedback & Candidate Release
- `POST /api/v1/interviews/:id/feedback` — Interviewer submits structured feedback.
- `GET /api/v1/interviews/:id/feedback` — Hiring team views all interviewer submissions.
- `POST /api/v1/interviews/:id/feedback/release` — Hiring team approves and releases selected feedback to candidate.

#### 4.7 Notifications
- `GET /api/v1/notifications` — List authenticated user's notifications (paginated, unread count).
- `PATCH /api/v1/notifications/:id/read` — Mark notification as read.
- `POST /api/v1/notifications/read-all` — Mark all as read.

#### 4.8 Platform Manager Administration
- `GET /api/v1/platform/users` — List platform users with filter by role.
- `PATCH /api/v1/platform/users/:id/role` — Update user role (cannot grant platform_manager unless requester is platform_manager).
- `GET /api/v1/platform/ai/metrics` — View AI provider usage, token counts, error rates, and latency.
- `GET /api/v1/platform/audit-logs` — View system security audit logs.
- `GET /api/v1/platform/health` — Integration status (Database, Gemini, Groq, Google Calendar).

---

### 5. AI Provider Architecture (Gemini & Groq)

1. **Provider Abstraction (`IAIProvider`)**:
   - `analyzeResume(resumeText, jobDescription, rubric): Promise<AtsAnalysisResult>`
   - `generateStageReview(stage, resumeText, jobDescription, notes): Promise<StageReviewResult>`
   - `summarizeFeedback(feedbacks, rubric): Promise<FeedbackSummaryResult>`
2. **Resilience & Safety**:
   - Schema enforcement via Zod (`safeParse` with retries on malformed JSON).
   - Exponential backoff with jitter on HTTP 429 / 503.
   - Prompt Injection Defense: Resume and candidate notes are delimited with strict XML tags (`<candidate_resume_data>`) and system instructions command the model to treat input strictly as passive text, never executing instructions within the candidate text.
   - Token & Latency Auditing: Each request logs prompt tokens, completion tokens, duration, and provider to `AIUsageRecord`.

---

### 6. Phased Implementation Roadmap

- [x] **Phase A**: Gate 0 Preflight, architecture & data models, and feature branch setup.
- [ ] **Phase B**: Canonical RBAC, candidate identity, role normalization, candidate profile self-service.
- [ ] **Phase C**: Secure resume upload, content type inspection, text parsing, candidate ATS self-analyzer.
- [ ] **Phase D**: AI provider engine (Gemini & Groq), application-triggered analysis, hiring-team report views.
- [ ] **Phase E**: Stage-specific AI reviews, interviewer rubric evaluation, and candidate feedback release controls.
- [ ] **Phase F**: Interview scheduling, Google Calendar/Meet integration, in-app notification center.
- [ ] **Phase G**: Platform manager administration dashboard, AI metrics, and audit log viewer.
- [ ] **Phase H**: End-to-end integration, UI polish, responsive Kanban refinements.
- [ ] **Phase I**: Final regression verification (`lint`, `typecheck`, `test`, `build`), documentation updates, and git checkpoint commit.

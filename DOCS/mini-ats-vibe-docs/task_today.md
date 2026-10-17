# Mini ATS — Task Today

> Replace this file's active task at the start of each focused work session. Keep one primary outcome per session. Do not use this file as a second PRD.

## Session metadata

- **Date:** 2026-10-17
- **Phase:** Feature Phase A–I — AI-Powered End-to-End Recruitment Workflow
- **Time box:** Full implementation session
- **Status:** PASS (Local regression suite: 219/219 passing across 19 test suites [47 web, 172 api]; zero ESLint errors, zero ESLint warnings; zero TypeScript errors; production build clean; Atlas live cloud connectivity verified).
- **Branch:** `feat/ai-candidate-recruitment-workflow`.

## Current task

Evolve EarlyAI ATS into an end-to-end AI-assisted recruitment platform supporting:
1. Three canonical roles (`candidate`, `hiring_team`, `platform_manager`) with backward-compatible role mapping.
2. Candidate self-service profile, secure resume upload with magic-byte validation, and SHA-256 deduplication.
3. Structured AI ATS analysis (0–100 match score, rubric breakdown, skill evidence, missing criteria, prompt injection guardrails).
4. Multi-provider AI engine (Groq, Gemini, and offline deterministic fallback).
5. Stage-specific AI reviews (Screening probes & Interview briefs) with human decision controls.
6. Google Calendar/Meet integration (`conferenceDataVersion=1`) with manual link fallback.
7. Structured interview evaluation separating confidential internal notes from candidate-releasable feedback.
8. In-app notifications with unread tracking for candidates and hiring teams.
9. Platform Manager dashboard for user role administration, AI usage telemetry, and integration health.
10. Enhanced Kanban board layout preventing card clipping and nested horizontal scrollbars.

## Requirements & Phase Gates

- [x] **Feature Phase A (Architecture & Audit):** Completed architecture design and data modeling in `DOCS/mini-ats-vibe-docs/ai_recruitment_workflow_design.md`.
- [x] **Feature Phase B (Canonical RBAC & Profile):**
  - Updated User model with `normalizeRole()`, candidate profile fields (`headline`, `phone`, `bio`, `skills`, `resumeId`).
  - Added `requireRole` middleware with canonical mapping and `requireSelfOrRole` for object-level authorization.
  - Implemented `profile.routes.ts` and `profile.controller.ts` (`GET/PUT /api/v1/profile`).
  - Created idempotent migration script `migrateRoles.ts` with dry-run preview and execute modes.
  - Added 8 integration tests in `rbac.test.ts` (100% passing).
- [x] **Feature Phase C (Secure Resume Upload & Magic-Byte Parsing):**
  - Private filesystem storage in `uploads/resumes/` (strictly excluded from Git).
  - Magic-byte validation (`%PDF`, `PK\x03\x04`, text), SHA-256 content hash, text sanitization and bounding (50k chars).
  - Implemented `resume.routes.ts` and `resume.controller.ts` (upload, download stream, soft delete).
- [x] **Feature Phase D (AI Provider Engine & ATS Analyzer):**
  - Provider abstraction supporting Groq, Gemini, and offline deterministic fallback.
  - Rate limiting, bounded exponential backoff on HTTP 429, telemetry tracking in `AIUsageRecord`.
  - Prompt injection isolation using XML boundary tags and strict system rules.
  - Deterministic ATS analysis caching keyed by SHA-256 hash.
  - Added 5 integration tests in `resumeAndAts.test.ts` (100% passing).
- [x] **Feature Phase E & F (Recruitment Workflow, Interviews, Meet & Feedback):**
  - Stage-specific AI reviews (`stageReview.model.ts`, `stageReview.controller.ts`, `stageReview.routes.ts`).
  - Google Calendar & Meet integration (`conferenceDataVersion=1`, `googleCalendarService.ts`, `interview.controller.ts`).
  - Structured interview feedback with confidential notes vs candidate-releasable feedback (`interviewFeedback.model.ts`, `feedback.controller.ts`).
  - In-app notification center (`notification.model.ts`, `notification.controller.ts`, `notification.routes.ts`).
  - Added 4 integration tests in `workflowAndPlatform.test.ts` (100% passing).
- [x] **Feature Phase G (Platform Manager Dashboard & Auditability):**
  - User role administration endpoints (`GET/PUT /api/v1/platform/users`).
  - AI usage metrics aggregation (`GET /api/v1/platform/ai-metrics`).
  - System integration health checks (`GET /api/v1/platform/health/integrations`).
- [x] **Feature Phase H (Frontend UX & Kanban Integration):**
  - Created web API clients for profile, resume, ats, interview, feedback, stageReview, notification, and platform.
  - Implemented `CandidatePortalView.tsx` with profile completeness, resume upload, ATS analysis report, interview schedules, and notifications.
  - Implemented `PlatformPortalView.tsx` with user role management, AI telemetry charts, and integration health status.
  - Updated `ApplicationCard.tsx` with action buttons for AI Review, Schedule Meet, and Feedback.
  - Updated `PipelineView.tsx` with roomy horizontal scrolling container (`min-w-[1520px]`, `w-[245px]` per column) eliminating card clipping, and mounted `StageReviewDrawer`, `ScheduleInterviewModal`, and `InterviewFeedbackModal`.
  - Updated `App.tsx` with dynamic role-based navigation and `<NotificationsDropdown />`.
- [x] **Feature Phase I (Verification & Documentation):**
  - All test suites passing (219/219 tests across monorepo).
  - ESLint 0 errors, 0 warnings.
  - TypeScript 0 errors.
  - Production builds passing for both `apps/web` and `apps/api`.

## Completion gate

```bash
npm run lint       # PASSED (exit code 0; 0 errors, 0 warnings across monorepo)
npm run typecheck  # PASSED (exit code 0 across web and api workspaces)
npm test           # PASSED (exit code 0; 219/219 tests passing across 19 suites: 47 web, 172 api)
npm run build      # PASSED (exit code 0; web bundle compiled in 1m 32s, api dist/server.js)
```

## Session result

- **Outcome:** Feature Phases A through I complete on `feat/ai-candidate-recruitment-workflow`.
- **Infrastructure Actions:**
  - `ACT-06`: DONE / VERIFIED (Live Atlas database connection, ping `{ ok: 1 }`).
  - `ACT-09`: DONE / VERIFIED (Atlas Application partial unique index confirmed active).
  - `ACT-10`: DONE / VERIFIED (Atlas Analytics compound indexes confirmed active).
  - `ACT-12`: CREATED (Google Cloud OAuth 2.0 & Calendar API production credentials).
  - `ACT-13`: CREATED (Production AI Provider credentials for Groq / Gemini; heuristic fallback active).
  - `ACT-14`: CREATED (Canonical role migration execution script `npm run migrate:roles -- --execute`).

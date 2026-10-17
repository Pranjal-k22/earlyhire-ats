# EarlyAI ATS — Manual Actions & Human-Only Tasks Log

This file tracks all manual actions, architecture decisions, and external infrastructure provisioning required by the project owner / human engineer. Every action is uniquely identified and updated as the project progresses.

---

## Action Register

### ACT-01: Git Repository Initialization & Remote Configuration
- **Action ID:** ACT-01
- **Description:** Initialize local Git repository and connect GitHub remote repository.
- **Reason:** Version control and remote tracking are mandatory prerequisites for the implementation workflow and CI/CD pipelines.
- **Required Account / Service:** Git CLI / GitHub account (`Pranjal-k22`)
- **Exact Steps:**
  1. Run `git init` in `c:\WEB DEVELOPMENT\Early-ATS`.
  2. Set default branch to `main`: `git branch -M main`.
  3. Add remote URL: `git remote add origin https://github.com/Pranjal-k22/earlyhire-ats.git`.
  4. Verify remote access safely using `git ls-remote origin`.
- **Status:** `DONE`
- **Verification Evidence / Method:**
  - `git status` confirms: `On branch main`.
  - `git remote -v` confirms: `origin https://github.com/Pranjal-k22/earlyhire-ats.git (fetch & push)`.
  - `git ls-remote origin` exited with code `0`.

---

### ACT-02: Product & Repository Naming Reconciliation
- **Action ID:** ACT-02
- **Description:** Confirm official branding across product name, repository, and package metadata.
- **Reason:** Naming alignment across user interface, repository, and package configs.
- **Required Account / Service:** Project Owner
- **Exact Steps:**
  1. Product name approved as: `EarlyAI ATS`.
  2. Root npm package and GitHub repository approved as: `earlyhire-ats`.
  3. Local directory maintained: `C:\WEB DEVELOPMENT\Early-ATS`.
- **Status:** `DONE`
- **Verification Evidence / Method:** Approved by project owner in Phase 0 decision directive on 2026-10-17.

---

### ACT-03: Product Scope Lock (Figma UI Kit vs PRD)
- **Action ID:** ACT-03
- **Description:** Formally approve scope boundaries resolving the 5 contradictions between the Figma UI references (`DOCS/ui-ux/`) and `prd.md`.
- **Reason:** Prevent scope creep from Gritstone Onboarding prototype mockups.
- **Required Account / Service:** Project Owner / Product Manager
- **Exact Steps:**
  1. Exclude employee onboarding workflows.
  2. Exclude AI candidate scoring and ranking.
  3. Exclude payslip uploads and binary file storage (resume is HTTPS URL only).
  4. Exclude meeting calendars and scheduling integrations.
  5. Exclude Google OAuth (use email/password with bcrypt and JWT HttpOnly cookies).
  6. Use Figma design references solely for visual tokens, typography, and layout inspiration.
- **Status:** `DONE`
- **Verification Evidence / Method:** Approved by project owner in Phase 0 decision directive on 2026-10-17.

---

### ACT-04: Prompt Kit Instructions Acquisition
- **Action ID:** ACT-04
- **Description:** Provide Phase 0 instructions from prompt kit.
- **Reason:** File `phase-prompts/PHASE_00_REPOSITORY_AUDIT.md` was missing from local directories.
- **Required Account / Service:** Project Owner
- **Exact Steps:** Project owner provided the full Phase 0 prompt and instructions directly in conversation.
- **Status:** `DONE`
- **Verification Evidence / Method:** Received and executed on 2026-10-17.

---

### ACT-05: Backend Stack & Monorepo Structure Confirmation
- **Action ID:** ACT-05
- **Description:** Confirm `Node.js + Express + TypeScript` backend and npm workspaces structure.
- **Reason:** Enforce end-to-end TypeScript strict mode.
- **Required Account / Service:** Project Owner / Tech Lead
- **Exact Steps:**
  1. Workspaces configured: `apps/web` (React + Vite + TypeScript) and `apps/api` (Node.js + Express + TypeScript).
  2. Root quality scripts verified: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- **Status:** `DONE`
- **Verification Evidence / Method:** Approved by project owner; scaffolded and verified passing in Phase 1.

---

### ACT-06: MongoDB Atlas Cluster & Database Provisioning (Phase 2)
- **Action ID:** ACT-06
- **Description:** Create MongoDB Atlas free tier cluster, database user, and connection string for Phase 2.
- **Reason:** Persistent storage for Users, Jobs, Candidates, Applications, StageHistory, and Notes.
- **Required Account / Service:** MongoDB Atlas account
- **Exact Steps:**
  1. Log in to MongoDB Atlas and create an M0 Free Tier cluster.
  2. Create a database user with read/write privileges to `earlyai_ats`.
  3. Configure IP Access List (allow `0.0.0.0/0` for development and hosted environments).
  4. Obtain connection string URI: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/earlyai_ats?retryWrites=true&w=majority`.
  5. Generate a secure random JWT secret: `openssl rand -hex 32`.
  6. Place credentials in local `.env` (never commit to Git).
- **Status:** `DONE / VERIFIED` (Connected successfully to MongoDB Atlas database `earlyhire-ats`)
- **Verification Evidence / Method:** Tested live on 2026-10-17. Sanitized URI `mongodb+srv://***:***@cluster0.s8vxj7j.mongodb.net/earlyhire-ats?retryWrites=true&w=majority` connects successfully over TLS, authenticates database user, executes harmless `admin().ping()` returning `{"ok": 1}`, and lists collections in target database (`[ 'users' ]`). Graceful disconnect verified.
- **Human Action Completed:** Database user configured in Atlas Console and updated in `.env` with explicit `earlyhire-ats` database target.

---

### ACT-07: Production Hosting Accounts & Deployment Setup (Phase 10)
- **Action ID:** ACT-07
- **Description:** Set up Vercel (frontend) and Render (backend) deployment targets for Phase 10.
- **Reason:** Production delivery requirement per PRD §7 and implementation plan §10.
- **Required Account / Service:** Vercel account, Render account, GitHub repository
- **Exact Steps:**
  1. Create a new Web Service on Render connected to `Pranjal-k22/earlyhire-ats`.
  2. Configure build command `npm run build` and start command `npm run start --workspace=apps/api`.
  3. Set production environment variables (`MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_ORIGIN`).
  4. Create a new Project on Vercel connected to `Pranjal-k22/earlyhire-ats` pointing to `apps/web`.
  5. Set Vercel environment variable `VITE_API_URL` to the Render service URL.
  6. Verify HTTPS cookies, exact CORS origin matching, and cold-start health checks.
- **Status:** `PENDING` (Required for Phase 10)
- **Verification Evidence / Method:** Deployed `/api/v1/health` returning `200 OK` and live frontend authentication flow.

---

### ACT-08: Production Cross-Origin Cookie-Domain & CSRF Architecture (Phase 10)
- **Action ID:** ACT-08
- **Description:** Establish the production cross-origin cookie domain and CSRF strategy between Vercel frontend and Render backend.
- **Reason:** In production, modern browsers (Chrome Privacy Sandbox, Apple Safari ITP) restrict third-party cross-site cookies (`SameSite=None`) when the frontend domain (e.g., `*.vercel.app`) and backend domain (e.g., `*.onrender.com`) have different effective top-level domains.
- **Required Account / Service:** DNS Registrar / Cloudflare / Vercel & Render Domain Settings
- **Implementation Status:** `SOURCE-VERIFIED / PENDING LIVE HOSTING TEST`
  - In `apps/api/src/utils/jwt.ts`: `getAuthCookieOptions` sets `sameSite: "none"` and `secure: true` in production (overridable via `COOKIE_SAME_SITE`).
  - In `apps/api/src/app.ts`: Dynamic CORS origin matching with `credentials: true` against explicit `CLIENT_URL` allowlist (rejects untrusted origins; no wildcards).
  - In `apps/api/src/middleware/csrf.ts`: State-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) require matching `Origin`/`Referer` headers.
  - In `apps/web/src/api/baseUrl.ts`: Client endpoints dynamically prefix `VITE_API_URL` or fallback to relative paths for Vercel proxying.
- **Live Verification Pending:** Full end-to-end cookie persistence must be validated on deployed HTTPS domains once the project owner creates the hosting instances.

---

### ACT-09: MongoDB Atlas Partial Unique Index Verification (Phase 10)
- **Action ID:** ACT-09
- **Description:** Verify the Application partial unique index `{ candidateId: 1, jobId: 1 }, { unique: true, partialFilterExpression: { status: "Active" } }` on the remote MongoDB Atlas cluster.
- **Reason:** Reconciled duplicate application policy prohibits concurrent duplicate active applications while permitting re-application after withdrawal or archival.
- **Required Account / Service:** MongoDB Atlas Database Admin
- **Status:** `DONE / VERIFIED` (Verified directly on remote MongoDB Atlas cluster `earlyhire-ats`)
- **Verification Evidence / Method:** Inspected live on 2026-10-17 via authenticated inspection. Collection `applications` contains index `candidateId_1_jobId_1` with key `{"candidateId": 1, "jobId": 1}`, `unique: true`, and `partialFilterExpression: {"status": "Active"}`.
- **Manual Action Required:** None. Index is verified and active on the cloud cluster.

---

### ACT-10: MongoDB Atlas Analytics Compound Indexes Verification (Phase 10)
- **Action ID:** ACT-10
- **Description:** Verify the compound indexes supporting Phase 7 recruitment analytics aggregations on the remote MongoDB Atlas cluster.
- **Reason:** Ensuring performant aggregation execution for stage-grouping, date cohorts, and duration velocity.
- **Required Account / Service:** MongoDB Atlas Database Admin
- **Status:** `DONE / VERIFIED` (Verified directly on remote MongoDB Atlas cluster `earlyhire-ats`)
- **Verification Evidence / Method:** Inspected live on 2026-10-17 via authenticated inspection.
  - Collection `applications`: `currentStage_1_status_1`, `appliedAt_1_status_1`, `stage_1_status_1_appliedAt_-1`, `jobId_1_stage_1`, `recruiterId_1_stage_1`, `candidateId_1_createdAt_-1` confirmed present.
  - Collection `stagehistories`: `fromStage_1_toStage_1`, `fromStage_1_durationMsFromPreviousStage_1`, `applicationId_1_changedAt_1`, `actorId_1_changedAt_-1` confirmed present.
- **Manual Action Required:** None. Compound indexes are verified and active on the cloud cluster.

---

### ACT-11: Phase 8 UI Integration & Responsive Staging Verification (Phase 10)
- **Action ID:** ACT-11
- **Description:** Verify the responsive navigation drawer, modal dialogs, and HttpOnly session cookies in a live cross-domain staging deployment (Vercel preview + Render staging).
- **Reason:** In local test environments, cookie storage is simulated and JSDOM runs in headless virtual DOM. While automated tests prove functional correctness, real browser verification on physical devices (mobile iOS Safari, mobile Android Chrome, desktop Firefox/Safari/Chrome) must be conducted once preview deployments are live in Phase 10.
- **Required Account / Service:** Frontend & QA Engineers (Physical mobile devices and cross-browser testing tools)
- **Exact Steps:**
  1. Deploy feature/preview build to staging hosting environment.
  2. Test recruiter registration and login on mobile Safari and Chrome.
  3. Verify the hamburger navigation drawer opens smoothly, links navigate correctly, and backdrop dismisses drawer.
  4. Test job search, candidate creation, pipeline stage progression, and dashboard KPI charts.
  5. Verify HttpOnly cookies persist across page reloads without third-party cookie blocking flags.
- **Status:** `PENDING` (Verified locally via automated test suites and JSDOM; physical device verification required upon deployment)
- **Verification Evidence / Method:** Manual QA smoke testing checklist completed during Phase 10 release staging.

---

### ACT-12: Google Cloud Platform OAuth 2.0 & Calendar API Integration
- **Action ID:** ACT-12
- **Description:** Configure Google Cloud Console project, enable Google Calendar API, and configure OAuth 2.0 client credentials for automated Google Meet link creation.
- **Reason:** The interview scheduling engine uses Google Calendar API with `conferenceDataVersion=1` to generate official Google Meet conference links with conference status tracking.
- **Required Account / Service:** Google Cloud Platform Console (Workspace or GCP Admin)
- **Exact Steps:**
  1. Open [Google Cloud Console](https://console.cloud.google.com/) and create or select project `EarlyAI-ATS`.
  2. Navigate to **APIs & Services > Library**, search for **Google Calendar API**, and click **Enable**.
  3. Navigate to **APIs & Services > Credentials** and click **Create Credentials > OAuth client ID**.
  4. Select **Web application** and configure Authorized redirect URIs:
     - Local dev: `http://localhost:5000/api/v1/auth/google/callback`
     - Staging: `https://earlyhire-ats-api.onrender.com/api/v1/auth/google/callback`
  5. Add required environment variables to root `.env` or Render environment settings:
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `GOOGLE_REDIRECT_URI`
     - `GOOGLE_REFRESH_TOKEN` (for service-level scheduling account)
- **Fallback / Development Behavior:** If Google credentials are not configured, the platform automatically saves the proposed interview schedule in `pending_configuration` state and allows hiring-team members to supply a manual meeting link or join URL. The UI displays an explicit indicator that automated Google Meet generation is pending configuration.
- **Status:** `PENDING CREDENTIALS` (Service logic, schema, routes, and manual fallback verified locally with 100% test pass).

---

### ACT-13: Production AI Provider Credentials & Quota Monitoring
- **Action ID:** ACT-13
- **Description:** Provision API keys for Groq and/or Google Gemini and configure production model selections.
- **Reason:** The AI ATS analysis and stage review engine routes prompts to high-throughput, low-cost LLM endpoints (`llama-3.3-70b-versatile` / `llama-3.1-8b-instant` on Groq, or `gemini-2.5-flash` / `gemini-1.5-flash` on Google Gemini) with bounded retries and token tracking.
- **Required Account / Service:** [Groq Cloud Console](https://console.groq.com/) and/or [Google AI Studio](https://aistudio.google.com/)
- **Exact Steps:**
  1. For Groq:
     - Generate an API key from Groq Console.
     - Set `GROQ_API_KEY` in environment.
     - Optional: Set `GROQ_MODEL=llama-3.3-70b-versatile` (default).
  2. For Gemini:
     - Generate an API key from Google AI Studio.
     - Set `GEMINI_API_KEY` in environment.
     - Optional: Set `GEMINI_MODEL=gemini-2.5-flash` (default).
  3. Configure provider selection:
     - `AI_PROVIDER=groq` or `AI_PROVIDER=gemini` or `AI_PROVIDER=fallback`.
     - Optional: `AI_FALLBACK_PROVIDER=fallback`.
- **Fallback / Development Behavior:** If no external API keys are configured, the backend automatically falls back to `FallbackAiProvider` — a zero-failure, deterministic heuristic engine that extracts skills, computes rubric-grounded match scores (0–100), generates screening probe questions, and creates interview brief rubrics. Zero tests or local workflows fail when offline.
- **Status:** `PENDING CREDENTIALS` (Provider router, telemetry model, rate limiting, and fallback verified locally with 100% test pass).

---

### ACT-14: Canonical RBAC User Role Migration
- **Action ID:** ACT-14
- **Description:** Execute the idempotent role migration script to map legacy roles to canonical roles:
  - `admin` -> `platform_manager`
  - `recruiter` -> `hiring_team`
  - `hiring_manager` -> `hiring_team`
  - `candidate` -> `candidate`
- **Reason:** Ensuring server-side consistency with the new three primary role categories while maintaining 100% backward compatibility via `normalizeRole()` middleware.
- **Required Account / Service:** Database Administrator / Server CLI
- **Exact Steps:**
  1. Dry-run preview: Run `npm run migrate:roles -- --preview` (or run without flags). This reads existing user records and prints planned role migrations without writing to the database.
  2. Execute migration: Run `npm run migrate:roles -- --execute`. This updates user documents with their canonical role.
- **Status:** `READY TO EXECUTE` (Migration script implemented in `apps/api/src/scripts/migrateRoles.ts` and verified with integration tests in `rbac.test.ts`).

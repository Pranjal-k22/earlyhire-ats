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
- **Status:** `PENDING` (Local integration verified with isolated test database; required before cloud deployment in Phase 10)
- **Verification Evidence / Method:** Local database connectivity verified with 22/22 automated integration tests passing. Cloud Atlas connection string required for Render deployment.

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

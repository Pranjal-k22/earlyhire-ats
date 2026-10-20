# EarlyAI ATS — Intelligent Applicant Tracking System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000.svg?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0%2B-47A248.svg?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-Automated%20Suites-brightgreen.svg?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Storage](https://img.shields.io/badge/Storage-Local%20%7C%20Cloudflare%20R2-orange.svg?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/r2/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

> **EarlyAI ATS** is an enterprise-grade, full-stack Applicant Tracking System engineered for high-velocity recruiting teams and ambitious candidates. Built on a clean npm workspaces monorepo (`apps/web` + `apps/api`), it integrates visual Kanban pipeline management, multi-provider AI resume scoring, immutable audit snapshots, automated Google Meet scheduling, real-time Server-Sent Events (SSE), and dual-driver storage (Local & Cloudflare R2) — backed by rigorous security boundaries and 100% offline fallback capabilities.

---

## 📑 Table of Contents

- [Key Capabilities](#-key-capabilities)
- [Role-Based Portals](#-role-based-portals)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Repository Structure](#-repository-structure)
- [Getting Started & Local Execution](#-getting-started--local-execution)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Installation & Setup](#2-installation--setup)
  - [3. Environment Configuration](#3-environment-configuration)
  - [4. Start MongoDB Database](#4-start-mongodb-database)
  - [5. Run Development Servers](#5-run-development-servers)
  - [6. Verify Service Health](#6-verify-service-health)
  - [7. Seed Demo Data & Bootstrap Admin](#7-seed-demo-data--bootstrap-admin)
- [First-Time Walkthrough & User Journeys](#-first-time-walkthrough--user-journeys)
  - [Candidate Journey](#1-candidate-journey)
  - [Recruiter & Hiring Team Journey](#2-recruiter--hiring-team-journey)
  - [Platform Manager Journey](#3-platform-manager-journey)
- [AI Engine & 4-Part Scoring Rubric](#-ai-engine--4-part-scoring-rubric)
  - [Scoring Weight Distribution](#scoring-weight-distribution)
  - [Multi-Provider Routing & Offline Fallback](#multi-provider-routing--offline-fallback)
  - [Anti-Prompt Injection Security](#anti-prompt-injection-security)
  - [Immutable Application Snapshots](#immutable-application-snapshots)
- [Storage Architecture (Local & Cloudflare R2)](#-storage-architecture-local--cloudflare-r2)
- [Real-Time Analytics & SSE Notifications](#-real-time-analytics--sse-notifications)
- [Security & Data Integrity Guardrails](#-security--data-integrity-guardrails)
- [Comprehensive API Reference](#-comprehensive-api-reference)
- [Monorepo Commands Reference](#-monorepo-commands-reference)
- [Quality Assurance & Verification](#-quality-assurance--verification)
- [Production Deployment Guide](#-production-deployment-guide)
- [Troubleshooting & FAQ](#-troubleshooting--faq)
- [License](#-license)

---

## 🌟 Key Capabilities

- **👥 3 Purpose-Built Portals:** Dedicated role-governed workspaces for **Candidates**, **Hiring Teams (Recruiters & Managers)**, and **Platform Managers**.
- **🤖 Grounded Multi-Model AI Engine:** Cloud AI inference powered by **Groq** (`qwen/qwen3.8-27b`) and **Google Gemini** (`gemini-flash-latest`), with zero-dependency deterministic heuristic fallback for 100% offline uptime guarantee.
- **📊 4-Part Weighted Scoring Rubric (`rubric-v2.0`):**
  - **Skills Match:** 40%
  - **Experience Relevance:** 30%
  - **Education & Credentials:** 15%
  - **Role & Domain Alignment:** 15%
- **🔒 Security by Design:**
  - Token-authenticated sessions delivered via secure `HttpOnly`, `SameSite` cookies (XSS-proof).
  - Server-side Role-Based Access Control (RBAC) and Broken Object-Level Authorization (BOLA) protections.
  - `<resume_content>` XML quarantine blocks isolating untrusted resumes from LLM prompt injections.
  - Binary magic-byte inspection (`%PDF`, `PK\x03\x04`), SHA-256 deduplication, and obfuscated UUID file storage.
  - In-memory sliding-window IP rate limiting and recursive NoSQL operator sanitization (`sanitizeMongo`).
- **📑 Immutable Application Snapshots:** When an applicant submits, their complete ATS match breakdown and analysis report are immutably snapshotted into the application record, preserving audit integrity even if the candidate later edits or deletes their resume.
- **🚀 Visual Kanban Pipeline:** Drag-and-drop hiring stages (`Applied` ➔ `Screening` ➔ `Interview` ➔ `Offer` ➔ `Hired` / `Rejected`) enforcing legal state transitions and an append-only stage history audit trail.
- **📅 Google Calendar & Meet Integration:** Automated interview scheduling with direct Google Meet conference links, OAuth 2.0 authorization, and AES-256-GCM token encryption.
- **💼 End-to-End Offer Management:** Full offer letter lifecycle with compensation, equity, start dates, supervisor approvals, and candidate response handling.
- **🔔 Real-Time SSE & Dual Notifications:** Real-time Server-Sent Events (SSE) streaming mutation alerts (`application.*`, `job.*`, `ats.*`, `interview.*`) with 20-second heartbeat, plus optional transactional SMTP email.
- **📈 Real-Time Analytics Suite:** MongoDB aggregation pipelines rendering cohort funnel throughput, time-to-hire, score distributions, top applicant skills, and one-click cohort CSV exports via Recharts.
- **☁️ Dual Storage Drivers:** Toggle seamlessly between private local disk storage (`uploads/resumes`) for local development and Cloudflare R2 / AWS S3 for production object storage.

---

## 👥 Role-Based Portals

EarlyAI ATS features tailored workflows configured through role-aware navigation and client/server route guards:

| Portal | Target Persona | Key Workflows & Features |
| :--- | :--- | :--- |
| **Candidate Portal**<br>`/#candidate` | Job Seekers & Applicants | • Profile and contact details management<br>• PDF resume upload with selectable digital text verification<br>• Real-time ATS match scoring against active job requisitions<br>• 1-Click job application with immutable ATS snapshot lock<br>• Application status tracking and scheduled interview calendar<br>• Released interview feedback review<br>• Candidate personal analytics (`/api/v1/analytics/candidate`) |
| **Recruiter & Hiring Team Portal**<br>`/#login-recruiter`<br>`/overview`, `/pipeline`, `/jobs`, `/candidates` | Recruiters & Hiring Managers | • Interactive recruitment Kanban pipeline with drag-and-drop stage progression<br>• Strict stage transition state machine enforcement & append-only history<br>• Job requisition lifecycle (create, edit, archive, salary ranges)<br>• Candidate directory with instant search, stage filtering, and resume preview drawer<br>• 4-Part ATS scorecard review and matched/missing keyword audit<br>• Interview scheduling with Google Meet links (Google Calendar API)<br>• Confidential evaluator notes and controlled feedback release<br>• Offer creation, approval, extension, and tracking<br>• Funnel analytics, time-to-hire, and stage distribution charts |
| **Platform Manager Portal**<br>`/#platform`<br>`/login/admin` | System Administrators | • System environment telemetry and active service health<br>• Real-time AI provider routing, latency monitoring, and fallback status<br>• User governance, role auditing, and privilege escalation guards (protects last admin)<br>• Diagnostic benchmarks and parser telemetry |

---

## 🏗 System Architecture

The following diagram illustrates the monorepo architecture, edge layers, security pipeline, domain controllers, AI scoring engine, dual storage drivers, and data persistence:

```mermaid
flowchart TD
    subgraph Client [Client Tier — apps/web (React 18 + Vite 6)]
        UI[Tailwind CSS & Lucide Icons]
        State[React Hook Form + Zod]
        Charts[Recharts Visualization Engine]
        Cookie[HttpOnly Session Cookie]
        SSEClient[SSE Real-time Event Listener]
    end

    subgraph Security [API Gateway & Security Middleware — apps/api]
        CORS[CORS with Strict Allowlist]
        Helmet[Helmet Security Headers]
        RateLimit[Sliding Window Rate Limiter]
        MongoSanitize[Recursive NoSQL Operator Sanitizer]
        AuthGuard[requireAuth & JWT Verification]
        RoleGuard[requireRole & BOLA Ownership Checks]
    end

    subgraph Controllers [Application Controllers]
        AuthCtrl[Auth & Profile Controller]
        ResumeCtrl[Resume Storage Controller]
        AtsCtrl[ATS Scoring Controller]
        JobCtrl[Job Requisition Controller]
        AppCtrl[Application & Pipeline Controller]
        CandCtrl[Candidate Controller]
        InterviewCtrl[Interview & Google Meet Controller]
        OfferCtrl[Offer Management Controller]
        NotifCtrl[Notification & SSE Controller]
        PlatformCtrl[Platform Telemetry Controller]
        AnalyticsCtrl[MongoDB Aggregation Analytics]
    end

    subgraph Storage [Dual-Driver Document Storage]
        Multer[Multer Memory Buffer — 5MB Limit]
        MagicByte[Magic Byte Inspector — %PDF]
        DiskStorage[(Local Disk — uploads/resumes)]
        R2Storage[(Cloudflare R2 / AWS S3 Object Storage)]
        PDFParser[pdf-parse v2 Text Extractor]
    end

    subgraph AI [Scoring & Intelligence Engine]
        AtsEngine[AtsScoringService — 40/30/15/15 Rubric]
        AIRouter[AI Router & Fallback Coordinator]
        Ollama[Ollama — qwen2.5:7b]
        Gemini[Google Gemini 2.5 Flash]
        Groq[Groq — Llama 3.3 70B]
        Deterministic[Deterministic Grounded Heuristic Engine]
    end

    subgraph Database [MongoDB Cluster]
        Users[(users)]
        Candidates[(candidates)]
        Jobs[(jobs)]
        Resumes[(resumefiles)]
        Analyses[(atsanalyses)]
        Applications[(applications — embedded atsSnapshot)]
        StageHistory[(interviewstagehistories)]
        Interviews[(interviews)]
        Feedback[(interviewfeedbacks)]
        Offers[(offers)]
        Notifications[(notifications)]
    end

    UI -->|HTTP Requests with Credentials| CORS
    CORS --> Helmet --> RateLimit --> MongoSanitize --> AuthGuard --> RoleGuard

    RoleGuard --> AuthCtrl & ResumeCtrl & AtsCtrl & JobCtrl & AppCtrl & CandCtrl & InterviewCtrl & OfferCtrl & NotifCtrl & PlatformCtrl & AnalyticsCtrl

    ResumeCtrl --> Multer --> MagicByte
    MagicByte -->|RESUME_STORAGE_DRIVER=local| DiskStorage
    MagicByte -->|RESUME_STORAGE_DRIVER=r2| R2Storage
    MagicByte --> PDFParser --> Resumes

    AtsCtrl --> AtsEngine
    AtsEngine --> AIRouter
    AIRouter -.-> Ollama & Gemini & Groq
    AIRouter -->|Fallback on timeout/error| Deterministic
    AIRouter --> Analyses

    AppCtrl -->|Apply for Job| AtsEngine
    AtsEngine -->|Immutable Snapshot| Applications
    AppCtrl --> StageHistory

    InterviewCtrl -->|OAuth 2.0 AES-256-GCM| Interviews
    NotifCtrl -->|Server-Sent Events| SSEClient
    AnalyticsCtrl --> Charts

    AuthCtrl --> Users
    CandCtrl --> Candidates
    JobCtrl --> Jobs
    OfferCtrl --> Offers
```

---

## 🛠 Technology Stack

### Frontend (`apps/web`)
- **Core:** React 18.3, TypeScript 5.7, Vite 6.1
- **Routing:** React Router DOM 6.28
- **Styling & UI:** Tailwind CSS 3.4, PostCSS, Autoprefixer, Lucide React icons
- **Form Management:** React Hook Form 7.90 + Zod 3.25
- **Data Visualization:** Recharts 3.10 (Area, Bar, Donut/Pie charts)
- **Testing:** Vitest 3.0 + React Testing Library + jsdom

### Backend (`apps/api`)
- **Runtime & Framework:** Node.js 20+ (tested up to Node 24), Express 4.21, TypeScript 5.7
- **Execution & Transpilation:** `tsx` hot-reloading for development, `tsc` for production builds
- **Database & ODM:** MongoDB 7.0+ with Mongoose 9.11 (schema validations, compound indexes, session transactions)
- **Authentication & Security:** JSON Web Tokens (JWT) stored in secure `HttpOnly`, `SameSite` cookies, `bcryptjs`, Helmet 8.0, custom sliding-window rate limiting, custom NoSQL operator sanitizer
- **File Handling & Parsing:** Multer 2.4, `pdf-parse` v2.4 (selectable digital text extraction and scanned PDF detection)
- **Cloud Object Storage:** `@aws-sdk/client-s3` (for Cloudflare R2 / AWS S3 compatibility)
- **Integrations:** Google Calendar API (OAuth 2.0 with AES-256-GCM encryption), SMTP / SendGrid for transactional email
- **Testing:** Vitest 3.0 + Supertest 7.0

### AI & Scoring Engine
- **Local Inference:** Ollama running `qwen2.5:7b` (zero API keys, private, free)
- **Cloud Models:** Google Gemini (`gemini-2.5-flash`), Groq (`llama-3.3-70b-versatile`)
- **Deterministic Heuristic Engine:** Zero-dependency fallback parsing skills, experience, education, and domain matching with mathematical scoring (`rubric-v2.0`)

---

## 📁 Repository Structure

```text
Early-ATS/
├── apps/
│   ├── web/                              # React 18 + Vite Frontend Application
│   │   ├── src/
│   │   │   ├── api/                      # Typed API client, base URL resolution, and endpoints
│   │   │   ├── app/                      # Root App component, layout, and routing
│   │   │   ├── assets/                   # Static branding and media assets
│   │   │   ├── features/                 # Modular feature-sliced UI views
│   │   │   │   ├── auth/                 # Sign In, Sign Up, and Role portal modals
│   │   │   │   ├── candidate/            # Candidate Portal (Resume upload, matching, applications)
│   │   │   │   ├── candidates/           # Recruiter Candidate Directory & profile modals
│   │   │   │   ├── dashboard/            # Recruitment metrics, Recharts analytics & CSV export
│   │   │   │   ├── jobs/                 # Job requisition management & creation modals
│   │   │   │   ├── landing/              # Public marketing landing page
│   │   │   │   ├── notifications/        # Real-time SSE notification center
│   │   │   │   ├── offers/               # Offer management & candidate response views
│   │   │   │   ├── pipeline/             # Drag-and-drop Kanban hiring board & ATS drawer
│   │   │   │   └── platform/             # Platform Manager telemetry & AI router controls
│   │   │   ├── index.css                 # Tailwind design tokens and custom animations
│   │   │   └── types/                    # Frontend TypeScript interfaces and role definitions
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── api/                              # Express 4 + TypeScript Backend Application
│       ├── src/
│       │   ├── config/                   # Zod environment schema, DB connector, constants
│       │   ├── controllers/              # Domain request handlers (Auth, Jobs, Apps, ATS, etc.)
│       │   ├── middleware/               # Auth, RBAC, Rate-limiter, MongoSanitize, Errors
│       │   ├── models/                   # Mongoose schemas (User, Job, Candidate, Application, etc.)
│       │   ├── routes/                   # 17 Express route declarations mounted at /api/v1
│       │   ├── schemas/                  # Zod validation schemas for incoming requests
│       │   ├── scripts/                  # Operational CLI scripts:
│       │   │   ├── bootstrapPlatformManager.ts # Audited Platform Manager provisioning
│       │   │   ├── liveR2SmokeTest.ts          # Live Cloudflare R2 object storage verification
│       │   │   ├── migrateRoles.ts             # Canonical role migration utility
│       │   │   ├── seedDemoData.ts             # Idempotent demo dataset seeder
│       │   │   └── verifyScreeningE2E.ts       # End-to-end ATS screening test
│       │   ├── services/                 # Core business services
│       │   │   ├── ai/                   # Ollama, Gemini, Groq, and deterministic engines
│       │   │   ├── analytics/            # MongoDB aggregation pipelines for metrics
│       │   │   ├── calendar/             # Google Calendar & Meet integration
│       │   │   ├── notifications/        # Real-time SSE hub & SMTP email dispatcher
│       │   │   ├── atsScoring.ts         # 4-Part weighted scoring logic (rubric-v2.0)
│       │   │   ├── offerService.ts       # Offer letter lifecycle management
│       │   │   └── resumeStorage.ts      # Local disk & Cloudflare R2 storage drivers
│       │   ├── types/                    # Backend types, role enums, and Express extensions
│       │   ├── app.ts                    # Express application builder and middleware wiring
│       │   └── server.ts                 # HTTP server bootstrap and graceful shutdown
│       ├── uploads/                      # Private local storage for resumes (gitignored)
│       └── package.json
│
├── docker-compose.test.yml               # MongoDB test container configuration
├── .env.example                          # Comprehensive environment configuration template
├── package.json                          # Monorepo root configuration with workspace scripts
└── README.md                             # Project documentation
```

---

## 🚀 Getting Started & Local Execution

Follow these steps to set up, configure, and run EarlyAI ATS locally on your machine.

---

### 1. Prerequisites

Verify that the required tools are installed:

| Tool | Minimum Version | Recommended | Check Command | Purpose |
| :--- | :---: | :---: | :--- | :--- |
| **Node.js** | `v20.0.0` | `v20+` or `v22+` | `node -v` | JavaScript runtime engine |
| **npm** | `v10.0.0` | `v10+` | `npm -v` | Monorepo workspace package manager |
| **MongoDB** | `v7.0+` | `v7.0+` | `mongod --version` | Database (local service, Docker, or Atlas) |
| **Git** | `v2.30+` | Latest | `git --version` | Version control system |
| **Ollama** | Optional | Latest | `ollama -v` | Local LLM inference (zero external cost) |

---

### 2. Installation & Setup

#### Step 1: Clone the Repository
```bash
git clone https://github.com/Pranjal-k22/earlyhire-ats.git
cd earlyhire-ats
```

#### Step 2: Install Monorepo Dependencies
Install all workspace dependencies across `apps/web` and `apps/api` with a single command from the root:
```bash
npm install
```

---

### 3. Environment Configuration

Copy the template configuration file into an active `.env` file in the project root:

- **Linux / macOS:**
  ```bash
  cp .env.example .env
  ```
- **Windows (PowerShell):**
  ```powershell
  Copy-Item .env.example .env
  ```
- **Windows (Command Prompt):**
  ```cmd
  copy .env.example .env
  ```

#### Key Environment Variables

Open `.env` and configure your settings:

```ini
# ==============================================================================
# Backend Configuration (apps/api)
# ==============================================================================
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/earlyai_ats_dev
JWT_SECRET=replace_with_a_secure_random_32_byte_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# ==============================================================================
# Frontend Configuration (apps/web)
# ==============================================================================
VITE_API_URL=http://localhost:5000/api/v1

# ==============================================================================
# AI Provider Configuration (Options: groq | gemini | mock | ollama)
# ==============================================================================
AI_PROVIDER=groq
AI_FALLBACK_PROVIDER=gemini

# Cloud AI Providers for ATS Score Checking
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-flash-latest
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=qwen/qwen3.8-27b

# ==============================================================================
# Resume Storage Configuration (Options: local | r2)
# ==============================================================================
RESUME_STORAGE_DRIVER=local
RESUME_STORAGE_DIR=uploads/resumes

# Cloudflare R2 (Only required if RESUME_STORAGE_DRIVER=r2)
R2_ACCOUNT_ID=
R2_ENDPOINT=
R2_BUCKET_NAME=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=

# ==============================================================================
# Google Calendar & Meet Integration (Optional)
# ==============================================================================
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5000/api/v1/auth/google/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=
GOOGLE_CALENDAR_REFRESH_TOKEN=

# ==============================================================================
# Transactional Email (Optional)
# ==============================================================================
EMAIL_ENABLED=false
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="EarlyAI ATS <no-reply@earlyhire.ai>"
```

> [!TIP]
> **No API Keys or Ollama Installed?**
> No problem! If Ollama is not running and no cloud API keys are provided, the system automatically falls back to its built-in **Deterministic Grounded Heuristic Engine** (`rubric-v2.0`). You get 100% working resume parsing, skill matching, and 4-part scoring with zero external dependencies.

---

### 4. Start MongoDB Database

Choose **one** of the following options:

#### Option A: Using Docker (Fastest for local testing)
```bash
docker compose -f docker-compose.test.yml up -d
```
*(To stop container later: `docker compose -f docker-compose.test.yml down`)*

#### Option B: Native Local MongoDB
- **macOS (Homebrew):** `brew services start mongodb-community@7.0`
- **Linux (systemd):** `sudo systemctl start mongod`
- **Windows:** Ensure the **MongoDB** service is running in `services.msc` or run `mongod --dbpath <data-dir>`.

#### Option C: MongoDB Atlas (Cloud)
In `.env`, set `MONGODB_URI` to your Atlas connection string:
```ini
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/earlyai_ats_dev?retryWrites=true&w=majority
```

---

### 5. Run Development Servers

You can start both frontend and backend concurrently or independently:

#### Method 1: Concurrent Launch (Recommended)
From the root directory:
```bash
npm run dev
```
- **Backend API:** Listens on `http://localhost:5000`
- **Frontend SPA:** Serves on `http://localhost:5173`

#### Method 2: Split Terminals
- **Terminal 1 (Backend):**
  ```bash
  npm run dev:api
  ```
- **Terminal 2 (Frontend):**
  ```bash
  npm run dev:web
  ```

---

### 6. Verify Service Health

Confirm that both services are up:

1. **Backend Health Check:**
   ```bash
   curl http://localhost:5000/api/v1/health
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "service": "earlyai-ats-api",
     "timestamp": "2026-10-20T00:00:00.000Z"
   }
   ```

2. **Frontend UI:**
   Navigate to **`http://localhost:5173`** in your browser. You will see the EarlyAI ATS landing page.

---

### 7. Seed Demo Data & Bootstrap Admin

EarlyAI ATS includes two operational CLI utilities for instant, realistic testing:

#### A. Seed Demo Dataset (Recruiters, Candidates, Jobs & Applications)
Run the idempotent demo seeder script:
```bash
npm run seed:demo -- --execute
```
This populates a realistic, interconnected recruiting dataset:
- **2 Recruiters:**
  - `ananya.sharma@earlyhire.test` / `EarlyATS2026!Demo` (Engineering Specialist)
  - `rohan.mehta@earlyhire.test` / `EarlyATS2026!Demo` (Data & AI Lead)
- **5 Candidates:**
  - `aditi.verma@earlyhire.test` / `EarlyATS2026!Demo`
  - `arjun.patel@earlyhire.test` / `EarlyATS2026!Demo`
  - `sneha.iyer@earlyhire.test` / `EarlyATS2026!Demo`
  - `kabir.singh@earlyhire.test` / `EarlyATS2026!Demo`
  - `meera.nair@earlyhire.test` / `EarlyATS2026!Demo`
- **10 Job Requisitions** (Frontend, Backend, AI/ML, DevOps, Product, QA)
- **18 Linked Applications** with realistic ATS snapshots, stage histories, and feedback
- **6 Interview Records** (Google Meet links, completed and upcoming)

#### B. Bootstrap Platform Manager Account
To provision a platform administrator securely:
```bash
npm run bootstrap:platform-manager -- --execute --name "Admin User" --email "admin@earlyhire.test"
```
*(Enter your password securely when prompted, or set `BOOTSTRAP_PLATFORM_MANAGER_PASSWORD="YourPassword123!"`)*

---

## 🧭 First-Time Walkthrough & User Journeys

Explore EarlyAI ATS through its three core persona journeys:

```text
       ┌────────────────────────────────────────────────────────┐
       │             EarlyAI ATS — http://localhost:5173         │
       └───────────────────────────┬────────────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
   🎓 Candidate Portal       💼 Recruiter Portal      ⚙️ Platform Portal
    /#candidate               /#login-recruiter        /#platform
    • Upload Resume           • Manage Jobs            • AI Health Telemetry
    • Get ATS Match Score     • Kanban Pipeline        • User & Role Audits
    • 1-Click Apply           • Schedule Interviews    • Provider Routing
    • Track Status            • Extend Offers          • System Metrics
```

### 1. Candidate Journey
1. Open **`http://localhost:5173/#candidate`** (or click **Candidate Portal** in the navigation header).
2. Log in with a seeded candidate account (e.g. `aditi.verma@earlyhire.test` / `EarlyATS2026!Demo`) or click **Sign Up** to create a new profile.
3. Upload a sample resume in PDF format (`.pdf`). The system verifies binary magic bytes and extracts selectable text.
4. Browse available jobs on your dashboard and click **Analyze Match** to run the 4-part ATS scoring engine.
5. Click **Apply Now** to submit your application. An immutable snapshot of your match score and rubric report is embedded in your application record.
6. Track your application status, view scheduled interviews, and inspect released interviewer feedback.

### 2. Recruiter & Hiring Team Journey
1. Open **`http://localhost:5173/#login-recruiter`** (or click **Recruiter Login**).
2. Log in with a seeded recruiter account (e.g. `ananya.sharma@earlyhire.test` / `EarlyATS2026!Demo`).
3. Navigate to **Jobs** (`/jobs`) and click **Create Job** to post a new opening with required skills, qualifications, department, and salary ranges.
4. Navigate to **Pipeline** (`/pipeline`) to view applicants on the interactive Kanban board. Drag candidate cards across stages:
   `Applied` ➔ `Screening` ➔ `Interview` ➔ `Offer` ➔ `Hired`
5. Open any candidate card to inspect the full 4-part ATS scorecard, write internal evaluator notes, schedule interview rounds with Google Meet links, and extend formal offers.
6. Visit **Overview / Analytics** (`/overview`) to review funnel conversion rates, stage velocity, average time-to-hire, and download cohort CSV reports.

### 3. Platform Manager Journey
1. Open **`http://localhost:5173/#platform`** (or `/login/admin`).
2. Log in with your bootstrapped administrator credentials (`admin@earlyhire.test`).
3. Monitor real-time AI provider connectivity, ping latencies, and fallback indicators.
4. Audit registered platform users, modify role assignments with escalation safeguards (protecting the last remaining platform manager), and inspect system health.

---

## 🤖 AI Engine & 4-Part Scoring Rubric

EarlyAI ATS features a grounded multi-provider AI pipeline orchestrated by `AIRouter`:

```text
Incoming Resume & Job Description
              │
              ▼
   ┌──────────────────────┐
   │ Prompt Sanitizer     │ ── Quarantines resume text inside <resume_content> XML
   └──────────────────────┘
              │
              ▼
   ┌──────────────────────┐
   │ Provider Dispatcher  │
   └──────────────────────┘
      │        │        │
      ▼        ▼        ▼
   [Ollama] [Gemini]  [Groq]
      │        │        │
      └────────┴────────┘
              │ (If connection fails, times out, or is unconfigured)
              ▼
   ┌──────────────────────────────────────────┐
   │ Grounded Deterministic Heuristic Engine  │ ── Zero external dependencies
   │ (Skills 40%, Exp 30%, Edu 15%, Rel 15%)  │
   └──────────────────────────────────────────┘
```

### Scoring Weight Distribution

The ATS scoring engine computes candidate-to-job matching strictly according to a 4-part weighted rubric (`rubric-v2.0`):

| Component | Weight | Criteria Evaluated |
| :--- | :---: | :--- |
| **Skills Match** | **40%** | Exact and semantic keyword matching between resume skills and job requirements |
| **Experience Relevance** | **30%** | Years of relevant professional experience, seniority progression, and domain depth |
| **Education & Credentials** | **15%** | Relevant degrees, academic background, certifications, and technical accreditations |
| **Role & Domain Alignment** | **15%** | Industry context, tooling ecosystem fit, and scope alignment with job specifications |
| **Total Score** | **100%** | Comprehensive match percentage displayed across scorecards and Kanban boards |

### Multi-Provider Routing & Resilient Fallback

1. **Groq Cloud (Ultra-fast, Recommended):** Set `AI_PROVIDER=groq`, `GROQ_API_KEY=your_key`, `GROQ_MODEL=qwen/qwen3.8-27b`.
2. **Google Gemini:** Set `AI_PROVIDER=gemini` (or `AI_FALLBACK_PROVIDER=gemini`), `GEMINI_API_KEY=your_key`, `GEMINI_MODEL=gemini-flash-latest`.
3. **Deterministic Heuristic Engine:** Triggered automatically if cloud AI providers are unreachable or rate-limited. Evaluates token overlap, extracted years of experience, and degrees using grounded mathematical scoring — preventing application crashes or fabricated outputs.

### Anti-Prompt Injection Security

Candidate resumes are treated as untrusted user input. EarlyAI ATS:
- Isolates extracted resume text inside `<resume_content>` XML quarantine blocks.
- Uses strict system prompts instructing the LLM that any directives, instructions, or role overrides found inside the resume text must be strictly ignored.
- Prevents candidate resumes from manipulating rubric weights, altering score outputs, or executing prompt injections.

### Immutable Application Snapshots

When a candidate applies to an opening, an immutable `atsSnapshot` is created:
- Captures overall score, 4-part breakdown, matched keywords, missing keywords, strengths, gaps, provider, model, and rubric version.
- Persisted directly into the MongoDB `Application` record.
- If the candidate later updates or deletes their resume, the recruiter's historical evaluation record remains 100% intact and auditable.

---

## ☁️ Storage Architecture (Local & Cloudflare R2)

EarlyAI ATS provides an abstracted storage layer (`ResumeStorageService`) supporting two operational modes:

### 1. Local Filesystem (`RESUME_STORAGE_DRIVER=local`)
- Default mode for local development and unit tests.
- Resumes are stored on disk at `apps/api/uploads/resumes/`.
- Files are saved using UUID-obfuscated filenames (`${uuid}.pdf`).
- Physical disk paths are stripped from API outputs to prevent internal path disclosure.

### 2. Cloudflare R2 / AWS S3 (`RESUME_STORAGE_DRIVER=r2`)
- Recommended mode for containerized and production deployments (Vercel, Render, AWS, Railway).
- Built using `@aws-sdk/client-s3` targeting Cloudflare R2's S3-compatible private endpoint.
- Resumes are streamed securely through authenticated backend proxy endpoints with BOLA ownership checks.
- Test your R2 configuration with the live smoke test script:
  ```bash
  npm run test:r2-smoke
  ```

---

## 📊 Real-Time Analytics & SSE Notifications

EarlyAI ATS features an analytics and real-time event pipeline:

### Authoritative Aggregation Pipelines
All analytics endpoints compute real metrics directly from MongoDB via Mongoose aggregation pipelines:
- **Hiring Overview (`/api/v1/analytics/overview`):** Total applications, stage distributions, period-over-period trends, average Time-to-Hire (days from application to hire), and job-by-job comparison.
- **Funnel Throughput (`/api/v1/analytics/funnel`):** Conversion rates across all pipeline stages (`Applied` ➔ `Screening` ➔ `Interview` ➔ `Offer` ➔ `Hired`) and offer acceptance ratios.
- **Candidate Analytics (`/api/v1/analytics/candidate`):** Strictly isolated personal metrics for candidates (active applications, interviews scheduled, average ATS score).

### Interactive Recharts Components
- **`MonthlyApplicationsChart`:** Responsive `AreaChart` with gradient fill, date hover tooltips, and independent CSV series export.
- **`TopSkillsChart`:** Responsive `PieChart` / Donut chart displaying applicant skill frequencies with click-to-filter capability.
- **`JobPerformanceChart`:** Multi-metric `BarChart` comparing requisitions across applications, interviews, and hires.
- **`ScoreDistributionChart`:** `BarChart` segmenting ATS scores across standard `0-40`, `41-60`, `61-80`, `81-100` brackets.
- **`StageDistributionChart`:** Canonical 6-stage pipeline bar distribution with percentage tags.
- **`RealtimeStatusIndicator`:** Live SSE status pill with pulsing indicator, connection state (`connected`, `connecting`, `reconnecting`, `offline`), and manual refresh.
- **Full Cohort CSV Export:** One-click download of the complete active dashboard dataset.

### Server-Sent Events (SSE)
- Endpoint: `GET /api/v1/analytics/events`
- Streams real-time notifications for application submissions, stage advances, interview schedules, and offer updates.
- Emits a 20-second keep-alive heartbeat (`:keep-alive`) preventing intermediate proxy timeouts.

---

## 🔒 Security & Data Integrity Guardrails

1. **HttpOnly Cookie Authentication:** JWT tokens are stored in secure `HttpOnly`, `SameSite` cookies. Tokens cannot be read by client-side JavaScript, eliminating XSS token theft.
2. **Broken Object-Level Authorization (BOLA) Defenses:** Candidates can strictly only access, view, and delete their own profiles, resumes, and applications. Attempting to download another candidate's document returns `403 Forbidden`.
3. **Recursive NoSQL Injection Sanitization:** Custom `sanitizeMongo` middleware recursively strips keys containing `$` operators or periods from request bodies, query strings, and route parameters.
4. **Binary Magic-Byte Inspection:** Resumes are validated against actual file header signatures (`%PDF` / `0x25 0x50 0x44 0x46`) rather than trusting file extensions or MIME types. Scanned PDFs with zero selectable text streams are detected and flagged.
5. **Rate Limiting:** Sliding-window in-memory IP rate limiter protecting sensitive authentication and scoring endpoints from brute-force attacks.
6. **Encrypted OAuth Tokens:** Recruiter Google OAuth refresh tokens are encrypted at rest in MongoDB using AES-256-GCM with authenticated tags (`GOOGLE_TOKEN_ENCRYPTION_KEY`).
7. **Append-Only Stage Audit History:** Every stage transition logs the initiator ID, previous stage, new stage, internal notes, and UTC timestamp.
8. **Last Administrator Protection:** The platform management controller programmatically prevents revoking the role of the final remaining platform manager.

---

## 📡 Comprehensive API Reference

All backend endpoints are prefixed with `/api/v1`. Authentication is validated via `HttpOnly` cookie.

### 🔐 Authentication & Profile (`/api/v1/auth`, `/api/v1/profile`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/signup` | Public | Register new user (`candidate` or `recruiter`) |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user & issue HttpOnly session cookie |
| `POST` | `/api/v1/auth/logout` | Authenticated | Clear session cookie and invalidate session |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieve authenticated user profile and assigned role |
| `GET` | `/api/v1/profile` | Authenticated | Fetch current user's profile details |
| `PUT` | `/api/v1/profile` | Authenticated | Update profile (name, headline, phone, bio, skills) |

### 📄 Resumes & Documents (`/api/v1/resumes`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/resumes/upload` | Authenticated | Upload resume PDF (magic-byte check, text extraction) |
| `GET` | `/api/v1/resumes/my` | Authenticated | List all active resumes for current candidate |
| `GET` | `/api/v1/resumes/:id/download` | Owner / Hiring Team | Stream private resume PDF with BOLA protection |
| `DELETE`| `/api/v1/resumes/:id` | Owner Only | Soft-delete resume metadata and unlink file from storage |

### ⚡ ATS Analysis & Matching (`/api/v1/ats`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/ats/analyze` | Authenticated | Trigger 4-part ATS evaluation for a resume against a job |
| `GET` | `/api/v1/ats/my` | Authenticated | Retrieve all ATS analyses generated by current user |
| `GET` | `/api/v1/ats/:id` | Owner / Hiring Team | View detailed score report, keywords, and recommendations |
| `GET` | `/api/v1/ats/application/:id`| Owner / Hiring Team | View the immutable ATS snapshot linked to an application |

### 💼 Job Requisitions (`/api/v1/jobs`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/jobs` | Authenticated | List open job requisitions (supports search, department filter) |
| `GET` | `/api/v1/jobs/:id` | Authenticated | Retrieve complete job details, requirements, and salary |
| `POST` | `/api/v1/jobs` | Hiring Team / Admin | Create a new job requisition |
| `PATCH`| `/api/v1/jobs/:id` | Hiring Team / Admin | Update job status, requirements, or salary ranges |
| `DELETE`| `/api/v1/jobs/:id` | Hiring Team / Admin | Soft-archive a job requisition |

### 📋 Applications & Pipeline (`/api/v1/applications`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/applications/apply` | Authenticated | Apply to a job with resume; embeds immutable ATS snapshot |
| `GET` | `/api/v1/applications` | Role-filtered | View applications (candidates see self; recruiters see all) |
| `GET` | `/api/v1/applications/:id` | Owner / Hiring Team | Retrieve detailed application status and stage history |
| `PATCH`| `/api/v1/applications/:id/stage` | Hiring Team / Admin | Advance application stage with state machine validation |

### 👥 Candidates & Confidential Notes (`/api/v1/candidates`, `/api/v1/notes`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/candidates` | Hiring Team / Admin | List candidates with stage filters and pagination |
| `GET` | `/api/v1/candidates/:id` | Hiring Team / Admin | Fetch complete candidate profile and application history |
| `POST` | `/api/v1/candidates/:id/notes` | Hiring Team / Admin | Record internal, confidential interviewer note |
| `GET` | `/api/v1/candidates/:id/notes` | Hiring Team / Admin | List internal notes (forbidden to candidates) |
| `DELETE`| `/api/v1/notes/:noteId` | Hiring Team / Admin | Delete an internal evaluator note |

### 📅 Interviews & Feedback (`/api/v1/interviews`, `/api/v1/feedback`, `/api/v1/stage-reviews`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/interviews/schedule` | Hiring Team | Schedule interview with automated Google Meet link |
| `GET` | `/api/v1/interviews/my` | Authenticated | List upcoming and past interviews for authenticated user |
| `POST` | `/api/v1/feedback/submit` | Hiring Team | Submit interview evaluation and rubric rating |
| `GET` | `/api/v1/feedback/application/:id`| Role-filtered | View feedback (candidates see released feedback only) |
| `POST` | `/api/v1/stage-reviews/approve` | Hiring Team / Admin | Release approved interview feedback to candidate |

### 🤝 Offer Management (`/api/v1/offers`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/offers` | Hiring Team / Admin | Create a new formal offer letter |
| `GET` | `/api/v1/offers/my` | Authenticated | List offers extended to the current candidate |
| `GET` | `/api/v1/offers/application/:applicationId` | Owner / Hiring Team | Retrieve offer linked to a specific application |
| `PATCH`| `/api/v1/offers/:id/approve` | Hiring Team / Admin | Manager approval for pending offer letter |
| `PATCH`| `/api/v1/offers/:id/extend` | Hiring Team / Admin | Formally extend approved offer to the candidate |
| `PATCH`| `/api/v1/offers/:id/respond` | Candidate Only | Candidate response: accept or decline offer |

### 🔔 Notifications & Events (`/api/v1/notifications`, `/api/v1/analytics/events`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/notifications/my` | Authenticated | List in-app notifications for authenticated user |
| `GET` | `/api/v1/notifications/unread-count` | Authenticated | Fetch count of unread notifications |
| `PATCH`| `/api/v1/notifications/:id/read` | Authenticated | Mark a single notification as read |
| `PATCH`| `/api/v1/notifications/read-all` | Authenticated | Mark all notifications as read |
| `DELETE`| `/api/v1/notifications/:id` | Authenticated | Dismiss a notification |
| `GET` | `/api/v1/notifications/email-status` | Authenticated | Check transactional email dispatch status |
| `GET` | `/api/v1/analytics/events` | Authenticated | Connect to real-time Server-Sent Events (SSE) stream |

### 📊 Analytics & Reporting (`/api/v1/analytics`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/analytics/overview` | Hiring Team / Admin | Comprehensive hiring metrics, trends, Time-to-Hire, skills |
| `GET` | `/api/v1/analytics/funnel` | Hiring Team / Admin | Cohort funnel throughput, step-by-step conversion rates |
| `GET` | `/api/v1/analytics/candidate` | Candidate Only | Personal candidate metrics (applications, stages, avg score) |
| `GET` | `/api/v1/analytics/platform` | Platform Manager | Platform governance metrics (roles, parser health, jobs) |

### ⚙️ Platform Governance & Health (`/api/v1/platform`, `/api/v1/health`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Public | Service health, uptime, and database connectivity check |
| `GET` | `/api/v1/platform/telemetry` | Platform Manager | View AI provider health, system metrics, and memory |
| `GET` | `/api/v1/platform/users` | Platform Manager | List platform users with assigned roles |
| `PATCH`| `/api/v1/platform/users/:id/role`| Platform Manager | Update user role (protects last administrator) |

---

## ⌨️ Monorepo Commands Reference

All primary workflows are accessible via standard npm scripts defined in the root `package.json`:

| Command | Scope | Description |
| :--- | :--- | :--- |
| `npm run dev` | Root (All) | Runs both frontend and backend concurrently in watch mode |
| `npm run dev:web` | `apps/web` | Starts the React frontend development server via Vite (`:5173`) |
| `npm run dev:api` | `apps/api` | Starts the Express backend server with hot-reload via `tsx watch` (`:5000`) |
| `npm run build` | Root (All) | Typechecks and compiles production bundles for both applications |
| `npm run build:web` | `apps/web` | Compiles and minifies React frontend bundle into `dist/` |
| `npm run build:api` | `apps/api` | Compiles backend TypeScript files into `dist/` |
| `npm run typecheck` | Root (All) | Runs strict `tsc --noEmit` across all workspaces |
| `npm run lint` | Root (All) | Executes ESLint 9 across all workspaces |
| `npm run test` | Root (All) | Executes all Vitest test suites across frontend and backend |
| `npm run ci` | Root (All) | Runs complete CI validation pipeline (`lint` ➔ `typecheck` ➔ `test` ➔ `build`) |
| `npm run seed:demo` | `apps/api` | Populates idempotent demo dataset (pass `-- --execute` to write) |
| `npm run bootstrap:platform-manager` | `apps/api` | Audited CLI provisioning for Platform Manager account |
| `npm run migrate:roles` | `apps/api` | Reconciles canonical and legacy database roles |
| `npm run test:r2-smoke` | `apps/api` | Executes live Cloudflare R2 object storage smoke test |
| `npm run test:screening-e2e` | `apps/api` | Runs end-to-end ATS resume screening integration test |

---

## 🧪 Quality Assurance & Verification

EarlyAI ATS enforces strict quality gates across both workspaces. Automated test suites execute against isolated databases with programmatic protection against dropping non-test databases:

```bash
# 1. Run typecheck across all workspaces in strict mode
npm run typecheck

# 2. Lint all workspaces with ESLint
npm run lint

# 3. Run all automated test suites
npm run test

# 4. Build both applications for production
npm run build

# 5. Execute complete CI verification pipeline locally
npm run ci
```

### Static Analysis & Test Isolation
- **Strict TypeScript:** `tsc --noEmit` runs with zero errors across both client and server codebases.
- **ESLint 9:** Zero errors and zero warnings across all `.ts` and `.tsx` source files.
- **Database Safety Guards:** `apps/api/src/config/db.ts` programmatically prevents test suites from connecting to non-local or non-test databases, and refuses `dropDatabase()` calls on any database name not ending in `_test`.

---

## 🚢 Production Deployment Guide

When deploying EarlyAI ATS to staging or production environments, follow these operational best practices:

### 1. Persistent Resume Storage
By default, resume PDFs are saved to `apps/api/uploads/resumes/`. When deploying to ephemeral cloud containers (e.g. Render, Railway, AWS ECS, Heroku):
- Set `RESUME_STORAGE_DRIVER=r2` in your environment variables.
- Configure Cloudflare R2 credentials (`R2_ACCOUNT_ID`, `R2_ENDPOINT`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`).
- Alternatively, mount a persistent disk volume to `uploads/resumes`.

### 2. Distributed Rate Limiting
The default sliding-window rate limiter runs in-memory. For clustered or autoscaling multi-instance deployments, back the rate limiter with a shared Redis instance (`ioredis`).

### 3. Production Environment Checklist
- Generate a cryptographically secure 64-character hex string for `JWT_SECRET` (`node -e "console.log(crypto.randomBytes(32).toString('hex'))"`).
- Set `NODE_ENV=production` so authentication cookies enforce `Secure: true`.
- Set `CLIENT_URL` to your exact production domain (e.g. `https://ats.yourdomain.com`) to enforce strict CORS origin filtering.
- Protect database credentials by configuring a dedicated MongoDB Atlas user with restricted permissions scoped to your target database.

---

## ❓ Troubleshooting & FAQ

#### ❌ Error: `ECONNREFUSED 127.0.0.1:27017`
- **Cause:** MongoDB is not running or unreachable at the address specified in `.env`.
- **Solution:** Start your local MongoDB service, or run `docker compose -f docker-compose.test.yml up -d`. Verify the `MONGODB_URI` connection string in `.env`.

#### ❌ Error: `EADDRINUSE: address already in use :::5000` or `:::5173`
- **Cause:** Another process is already using port `5000` (API) or `5173` (Vite).
- **Solution:**
  - **Windows (PowerShell):**
    ```powershell
    Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process
    ```
  - **macOS / Linux:**
    ```bash
    npx kill-port 5000
    ```
  - Alternatively, change `PORT` in `.env` and update `VITE_API_URL` accordingly.

#### ❌ Error: `SCANNED_PDF_OCR_REQUIRED` (422) during resume upload
- **Cause:** The uploaded PDF consists solely of rasterized or scanned images with zero selectable digital text streams.
- **Solution:** Upload a standard digital text PDF (exported from Google Docs, Microsoft Word, Canva, or LaTeX) containing selectable text.

#### ❌ Error: CORS origin mismatch or missing session cookie
- **Cause:** The frontend address does not match `CLIENT_URL` in `.env`.
- **Solution:** Ensure `CLIENT_URL` in `.env` matches the exact address of your frontend (e.g. `http://localhost:5173`), and requests are sent with credentials (`credentials: "include"`).

---

## 📄 License

This project is licensed under the **ISC License**. Developed as an intelligent, full-stack Applicant Tracking System platform demonstration. All rights reserved.

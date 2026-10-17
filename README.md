# EarlyAI ATS

A modern, responsive Applicant Tracking System (ATS) built for high-velocity recruiting teams to manage job openings, track candidates across hiring stages, record interview notes, and review recruitment analytics.

---

## 🛠 Technology Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** MongoDB Atlas + Mongoose (Phase 2)
- **Authentication:** JWT in HttpOnly cookies + bcrypt password hashing (Phase 2)
- **Forms & Validation:** React Hook Form + Zod
- **Charts:** Recharts
- **Testing:** Vitest + React Testing Library + Supertest
- **Deployment:** Vercel (Frontend) + Render (Backend)

---

## 📁 Repository Structure

```text
Early-ATS/
├── apps/
│   ├── web/               # React + Vite + TypeScript frontend
│   │   ├── src/
│   │   │   ├── app/       # App shell, navigation, and layout
│   │   │   └── index.css  # Tailwind directives and design tokens
│   │   └── vite.config.ts
│   └── api/               # Express + TypeScript REST API
│       ├── src/
│       │   ├── config/    # Environment parsing with Zod
│       │   ├── middleware/# Central error handler, CORS, Helmet
│       │   ├── routes/    # Health endpoint (/api/v1/health)
│       │   ├── app.ts     # Express application setup
│       │   └── server.ts  # HTTP server listener
│       └── tsconfig.json
├── DOCS/
│   ├── MANUAL_ACTIONS.md  # Human-only tasks & infrastructure register
│   ├── mini-ats-vibe-docs/# Authoritative PRD, Architecture, and QA docs
│   └── ui-ux/             # Design references and mockups
├── package.json           # Root npm workspaces
├── .env.example           # Safe environment variables template
└── .gitignore             # Git exclusion rules
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** v18+ (tested on v24.20.0)
- **npm:** v9+ (tested on v10.9.3)

### Installation

Clone the repository and install all workspace dependencies from the root:

```bash
git clone https://github.com/Pranjal-k22/earlyhire-ats.git
cd earlyhire-ats
npm install
```

### Environment Configuration

Copy the example environment file to your workspace:

```bash
cp .env.example .env
```

---

## 🧪 Quality & Verification Commands

All quality commands run across both workspaces (`apps/web` and `apps/api`) from the project root:

```bash
# Type check all TypeScript workspaces
npm run typecheck

# Lint all workspaces with ESLint
npm run lint

# Run all automated test suites
npm run test

# Build both applications for production
npm run build

# Start development servers concurrently
npm run dev
```

---

## 📡 API Endpoints (Phase 1 Baseline)

| Method | Path | Description | Status Code |
|---|---|---|---|
| `GET` | `/api/v1/health` | Service health status | `200 OK` |

---

## 📄 License & Attribution

Internal / Assignment Project. All rights reserved.

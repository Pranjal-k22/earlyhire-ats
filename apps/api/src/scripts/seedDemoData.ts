/**
 * EarlyAI ATS — Safe, Idempotent Demo Dataset Seeding Script
 * 
 * Populates a complete, realistic, interconnected recruitment dataset:
 * - 2 Recruiters (Ananya Sharma & Rohan Mehta)
 * - 5 Candidates (Aditi Verma, Arjun Patel, Sneha Iyer, Kabir Singh, Meera Nair)
 * - 10 Job Postings (8 Open, 1 Paused, 1 Closed)
 * - 18 Linked Job Applications with realistic ATS snapshots & stage histories
 * - 6 Interview records (3 completed, 3 upcoming)
 * - Recruiter notes and candidate notifications
 * 
 * Safety:
 * - Enforces non-production database verification
 * - Defaults to DRY-RUN mode unless --execute is supplied
 * - Completely idempotent (re-running never duplicates records)
 * - Preserves existing passwords and unrelated documents
 */

import mongoose from "mongoose";
import { User, IUserDocument } from "../models/user.model.js";
import { Candidate, ICandidateDocument } from "../models/candidate.model.js";
import { Job, IJobDocument, JobStatus } from "../models/job.model.js";
import { Application, IApplicationDocument, IAtsSnapshot } from "../models/application.model.js";
import { InterviewStageHistory, HiringStage } from "../models/stageHistory.model.js";
import { Interview } from "../models/interview.model.js";
import { Note } from "../models/note.model.js";
import { Notification } from "../models/notification.model.js";
import { env } from "../config/env.js";

export interface SeedOptions {
  isExecute: boolean;
  customUri?: string;
  demoPassword?: string;
}

export interface SeedSummary {
  dryRun: boolean;
  targetDatabase: string;
  recruitersCreated: number;
  recruitersExisting: number;
  candidatesCreated: number;
  candidatesExisting: number;
  jobsCreated: number;
  jobsExisting: number;
  applicationsCreated: number;
  applicationsExisting: number;
  interviewsCreated: number;
  interviewsExisting: number;
  notesCreated: number;
  notificationsCreated: number;
  totalActiveJobs: number;
  totalApplicationsByStage: Record<string, number>;
}

export function isNonProductionDatabase(dbName?: string | null): boolean {
  if (!dbName) return false;
  const normalized = dbName.toLowerCase().trim();
  if (normalized === "earlyai_ats_prod" || normalized.endsWith("_prod") || normalized === "production") {
    return false;
  }
  return (
    normalized === "earlyai_ats_dev" ||
    normalized === "earlyai_ats_test" ||
    normalized === "earlyai_ats_staging" ||
    normalized.endsWith("_dev") ||
    normalized.endsWith("_test") ||
    normalized.endsWith("_staging") ||
    normalized.includes("localhost")
  );
}

const DEFAULT_DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || "EarlyATS2026!Demo";

export async function seedDemoDataset(options: SeedOptions): Promise<SeedSummary> {
  const { isExecute, customUri, demoPassword = DEFAULT_DEMO_PASSWORD } = options;
  const targetUri = customUri || env.MONGODB_URI;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(targetUri);
  }

  const dbName = mongoose.connection.name || "unknown";

  if (!isNonProductionDatabase(dbName)) {
    throw new Error(
      `CRITICAL DATABASE SAFETY BLOCKER: Target database "${dbName}" is not verified as a non-production database. Execution halted to protect production integrity.`
    );
  }

  const summary: SeedSummary = {
    dryRun: !isExecute,
    targetDatabase: dbName,
    recruitersCreated: 0,
    recruitersExisting: 0,
    candidatesCreated: 0,
    candidatesExisting: 0,
    jobsCreated: 0,
    jobsExisting: 0,
    applicationsCreated: 0,
    applicationsExisting: 0,
    interviewsCreated: 0,
    interviewsExisting: 0,
    notesCreated: 0,
    notificationsCreated: 0,
    totalActiveJobs: 0,
    totalApplicationsByStage: {},
  };

  const passwordHash = await User.hashPassword(demoPassword);

  // ==========================================
  // 1. RECRUITERS (2)
  // ==========================================
  const recruiterDefinitions = [
    {
      name: "Ananya Sharma",
      email: "ananya.sharma@earlyhire.test",
      role: "hiring_team" as const,
      headline: "Engineering Recruitment Specialist (5 yrs exp)",
      phone: "+91 98765 43210",
      bio: "Technical recruiter focused on identifying strong software engineering candidates, coordinating structured interviews, and improving the candidate experience.",
      skills: ["Frontend Engineering", "Backend Engineering", "Full-Stack Development", "QA Automation", "Technical Sourcing"],
    },
    {
      name: "Rohan Mehta",
      email: "rohan.mehta@earlyhire.test",
      role: "hiring_team" as const,
      headline: "Data, AI & Infrastructure Recruitment Lead (7 yrs exp)",
      phone: "+91 98765 43211",
      bio: "Technical recruiter experienced in hiring data, AI, platform engineering, and experienced technical professionals.",
      skills: ["Data Analytics", "Machine Learning", "Cloud Infrastructure", "DevOps", "Senior Engineering", "Executive Hiring"],
    },
  ];

  const recruiterDocs: Record<string, IUserDocument> = {};

  for (const def of recruiterDefinitions) {
    const existing = await User.findOne({ email: def.email });
    if (existing) {
      summary.recruitersExisting++;
      recruiterDocs[def.email] = existing;
      if (isExecute) {
        existing.name = def.name;
        existing.role = def.role;
        existing.headline = def.headline;
        existing.phone = def.phone;
        existing.bio = def.bio;
        existing.skills = def.skills;
        await existing.save();
      }
    } else {
      summary.recruitersCreated++;
      if (isExecute) {
        const created = await User.create({
          ...def,
          passwordHash,
          isActive: true,
        });
        recruiterDocs[def.email] = created;
      }
    }
  }

  // Fallback placeholder IDs for dry-run
  const ananyaId = recruiterDocs["ananya.sharma@earlyhire.test"]?._id || new mongoose.Types.ObjectId();
  const rohanId = recruiterDocs["rohan.mehta@earlyhire.test"]?._id || new mongoose.Types.ObjectId();

  // ==========================================
  // 2. CANDIDATES (5)
  // ==========================================
  const candidateDefinitions = [
    {
      name: "Aditi Verma",
      email: "aditi.verma@earlyhire.test",
      phone: "+91 98765 00001",
      location: "Bhopal, Madhya Pradesh",
      currentTitle: "Final-Year CS Student / Software Intern",
      experienceYears: 0,
      skills: ["Java", "Python", "SQL", "OOP", "Data Structures", "Git", "REST APIs", "Unit Testing"],
      source: "CompanyWebsite" as const,
      summary: "Final-year engineering student (B.Tech in Computer Science, graduating in 2027) interested in backend development, testing, and reliable software systems.",
      headline: "Aspiring Backend & QA Automation Engineer | B.Tech CS 2027",
      targetRoles: ["Associate Software Engineer", "Junior QA Automation Engineer"],
      assignedRecruiterId: ananyaId,
    },
    {
      name: "Arjun Patel",
      email: "arjun.patel@earlyhire.test",
      phone: "+91 98765 00002",
      location: "Indore, Madhya Pradesh",
      currentTitle: "Junior Frontend Developer",
      experienceYears: 1,
      skills: ["React", "JavaScript", "TypeScript", "HTML", "CSS", "REST APIs", "Git", "Tailwind CSS", "Vite"],
      source: "LinkedIn" as const,
      summary: "Early-career developer (B.Tech in Computer Science, graduating in 2026) focused on responsive user interfaces, frontend performance, and API integration.",
      headline: "Frontend & UI Developer | React, TypeScript, Tailwind",
      targetRoles: ["Junior Frontend Developer", "Full-Stack Developer"],
      assignedRecruiterId: ananyaId,
    },
    {
      name: "Sneha Iyer",
      email: "sneha.iyer@earlyhire.test",
      phone: "+91 98765 00003",
      location: "Hyderabad, Telangana",
      currentTitle: "Backend Software Engineer",
      experienceYears: 2,
      skills: ["Node.js", "Express", "TypeScript", "MongoDB", "PostgreSQL", "REST APIs", "JWT", "Docker", "Git"],
      source: "JobBoard" as const,
      summary: "Backend-focused engineer (B.Tech in Information Technology, 2024) interested in scalable APIs, database design, security, and production reliability.",
      headline: "Backend Engineer | Node.js, TypeScript, PostgreSQL & Distributed APIs",
      targetRoles: ["Backend Developer", "Full-Stack Developer"],
      assignedRecruiterId: ananyaId,
    },
    {
      name: "Kabir Singh",
      email: "kabir.singh@earlyhire.test",
      phone: "+91 98765 00004",
      location: "Bengaluru, Karnataka",
      currentTitle: "Data & Applied ML Analyst",
      experienceYears: 4,
      skills: ["Python", "SQL", "pandas", "NumPy", "scikit-learn", "Data Visualization", "Experimentation", "Git", "Tableau"],
      source: "LinkedIn" as const,
      summary: "Data professional (B.Tech in Computer Science, 2021) with 4 years of experience developing analytical workflows, evaluating models, and communicating findings.",
      headline: "Data Analyst & Applied ML Engineer | Python, SQL, Predictive Modeling",
      targetRoles: ["Data Analyst", "Machine Learning Engineer"],
      assignedRecruiterId: rohanId,
    },
    {
      name: "Meera Nair",
      email: "meera.nair@earlyhire.test",
      phone: "+91 98765 00005",
      location: "Pune, Maharashtra",
      currentTitle: "Senior Distributed Systems Engineer",
      experienceYears: 8,
      skills: ["Java", "Python", "System Design", "Microservices", "AWS", "Docker", "Kubernetes", "CI/CD", "Mentoring", "Architecture"],
      source: "Referral" as const,
      summary: "Experienced engineer (B.Tech in Computer Engineering, 2017) focused on distributed systems, cloud infrastructure, architecture decisions, operational reliability, and mentoring developers.",
      headline: "Senior Software & Infrastructure Architect | 8 yrs exp | Distributed Systems & Cloud",
      targetRoles: ["Senior Software Engineer", "DevOps / Cloud Engineer", "Engineering Manager"],
      assignedRecruiterId: rohanId,
    },
  ];

  const candidateDocs: Record<string, ICandidateDocument> = {};
  const candidateUserDocs: Record<string, IUserDocument> = {};

  for (const def of candidateDefinitions) {
    // 1. Ensure Candidate record
    let candidate = await Candidate.findOne({ email: def.email });
    if (candidate) {
      summary.candidatesExisting++;
      candidateDocs[def.email] = candidate;
      if (isExecute) {
        candidate.name = def.name;
        candidate.fullName = def.name;
        candidate.phone = def.phone;
        candidate.location = def.location;
        candidate.currentTitle = def.currentTitle;
        candidate.experienceYears = def.experienceYears;
        candidate.skills = def.skills;
        candidate.source = def.source;
        candidate.summary = def.summary;
        await candidate.save();
      }
    } else {
      summary.candidatesCreated++;
      if (isExecute) {
        candidate = await Candidate.create({
          name: def.name,
          fullName: def.name,
          email: def.email,
          phone: def.phone,
          location: def.location,
          currentTitle: def.currentTitle,
          experienceYears: def.experienceYears,
          skills: def.skills,
          source: def.source,
          summary: def.summary,
          createdBy: def.assignedRecruiterId,
          updatedBy: def.assignedRecruiterId,
          archivedAt: null,
        });
        candidateDocs[def.email] = candidate;
      }
    }

    // 2. Ensure Candidate User account
    let user = await User.findOne({ email: def.email });
    if (user) {
      candidateUserDocs[def.email] = user;
      if (isExecute && candidate) {
        user.candidateProfileId = candidate._id;
        user.headline = def.headline;
        user.phone = def.phone;
        user.bio = def.summary;
        user.skills = def.skills;
        await user.save();
      }
    } else if (isExecute && candidate) {
      user = await User.create({
        name: def.name,
        email: def.email,
        passwordHash,
        role: "candidate",
        isActive: true,
        candidateProfileId: candidate._id,
        headline: def.headline,
        phone: def.phone,
        bio: def.summary,
        skills: def.skills,
      });
      candidateUserDocs[def.email] = user;
    }
  }

  // ==========================================
  // 3. JOB POSTINGS (10)
  // ==========================================
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  const jobDefinitions = [
    // 5 Engineering Jobs owned by Ananya Sharma
    {
      title: "Associate Software Engineer",
      department: "Engineering",
      location: "Bengaluru, India (Hybrid)",
      employmentType: "FullTime" as const,
      experienceMin: 0,
      experienceMax: 1,
      status: "Open" as JobStatus,
      ownerId: ananyaId,
      openedAt: daysAgo(75),
      requirements: [
        "One programming language such as Java, Python, or C++",
        "Object-oriented programming and basic data structures",
        "SQL fundamentals and Git version control",
        "Problem-solving, algorithmic thinking, and debugging capability",
        "Bachelor's degree in Computer Science, IT, or related discipline",
      ],
      description: `### About EarlyHire Demo Technologies
EarlyHire Demo Technologies is a high-growth engineering organization building enterprise-grade recruitment and evaluation platforms.

### Role Overview
We are looking for enthusiastic Associate Software Engineers to join our core development team. You will participate in the complete software development lifecycle, implementing robust features, writing clean automated tests, and collaborating with senior architects.

### Key Responsibilities
- Develop, test, debug, and maintain application features across our backend and frontend services.
- Implement efficient algorithms and robust data structures in production code.
- Participate in peer code reviews, architectural discussions, and agile sprint planning.
- Write readable, maintainable code supported by comprehensive unit and integration tests.
- Collaborate closely with senior engineers, product managers, and QA specialists.

### Required Qualifications
- Strong foundational knowledge in Java, Python, or C++.
- Understanding of Object-Oriented Design (OOD) and core data structures.
- Familiarity with relational databases, SQL queries, and Git.
- Excellent analytical, analytical reasoning, and debugging skills.

### What We Offer
- Competitive compensation: ₹4,00,000 – ₹7,00,000 INR per annum.
- Comprehensive health insurance and annual wellness benefits.
- Mentorship programs with senior principal engineers.
- Flexible hybrid work policy in Bengaluru.`,
    },
    {
      title: "Junior Frontend Developer",
      department: "Product Engineering",
      location: "Bengaluru, India (Hybrid)",
      employmentType: "FullTime" as const,
      experienceMin: 0,
      experienceMax: 2,
      status: "Open" as JobStatus,
      ownerId: ananyaId,
      openedAt: daysAgo(70),
      requirements: [
        "JavaScript (ES6+) and TypeScript fundamentals",
        "HTML5, CSS3, responsive design, and CSS frameworks (Tailwind CSS)",
        "React component architecture, hooks, and state management",
        "REST API integration, client caching, and error handling",
        "Git version control and automated frontend testing basics",
      ],
      description: `### About the Position
As a Junior Frontend Developer at EarlyHire Demo Technologies, you will craft delightful, accessible, and high-performance user interfaces for thousands of daily active users.

### Key Responsibilities
- Build responsive, accessible, and intuitive user interfaces using React and modern TypeScript.
- Develop reusable component libraries adhering to strict design system standards.
- Integrate frontend web applications with backend REST APIs and SSE streaming endpoints.
- Manage graceful loading, empty, and error states across all viewports.
- Measure and optimize web performance, Core Web Vitals, and browser accessibility.
- Write unit and component integration tests using React Testing Library and Vitest.

### Required Qualifications
- Practical experience with modern JavaScript, TypeScript, and React.
- Solid understanding of DOM manipulation, HTML semantics, and CSS styling.
- Hands-on familiarity with REST APIs and async state management.
- Passion for visual polish, micro-interactions, and responsive design.

### Compensation & Benefits
- ₹5,00,000 – ₹9,00,000 INR per annum.
- Home office setup allowance and high-performance workstation.
- Learning budget for front-end certifications and conferences.`,
    },
    {
      title: "Junior QA Automation Engineer",
      department: "Quality Engineering",
      location: "Pune, India (On-site)",
      employmentType: "FullTime" as const,
      experienceMin: 0,
      experienceMax: 2,
      status: "Open" as JobStatus,
      ownerId: ananyaId,
      openedAt: daysAgo(60),
      requirements: [
        "Programming proficiency in Java, Python, or JavaScript",
        "Manual testing fundamentals, test plan creation, and bug reporting",
        "Understanding of regression testing, API validation, and test automation frameworks",
        "SQL fundamentals for database verification",
        "Familiarity with Postman, Playwright, or Jest/Vitest",
      ],
      description: `### Role Summary
Join our Quality Engineering organization in Pune to guarantee the reliability, security, and performance of mission-critical ATS workflows.

### Key Responsibilities
- Design, implement, and execute comprehensive functional, boundary, and regression test suites.
- Develop automated tests for backend REST APIs and frontend web workflows.
- Investigate defects, create reproducible bug reports, and verify resolution across environments.
- Integrate automated testing gates into GitHub Actions CI/CD deployment pipelines.
- Maintain up-to-date test matrices, synthetic test datasets, and verification documentation.

### Qualifications
- Degree in Computer Science, Information Technology, or equivalent experience.
- Strong understanding of software testing methodologies and the defect lifecycle.
- Basic scripting capability in Python, JavaScript, or Java.
- Meticulous attention to detail and strong written communication.

### Compensation & Perks
- ₹4,00,000 – ₹8,00,000 INR per annum.
- On-site Pune campus with catered meals and commute assistance.
- Rapid career progression into SDET and Automation Architect roles.`,
    },
    {
      title: "Backend Developer",
      department: "Backend Engineering",
      location: "Hyderabad, India (Hybrid)",
      employmentType: "FullTime" as const,
      experienceMin: 1,
      experienceMax: 3,
      status: "Open" as JobStatus,
      ownerId: ananyaId,
      openedAt: daysAgo(65),
      requirements: [
        "Node.js and Express.js backend services development",
        "TypeScript, ESNext, and asynchronous programming",
        "MongoDB / Mongoose and relational databases (PostgreSQL)",
        "REST API design, JWT authentication, and Zod validation",
        "Docker containerization and unit/integration testing",
      ],
      description: `### About the Opportunity
We are looking for a skilled Backend Developer to architect and scale our core application programming interfaces, event pipelines, and persistence layers.

### Key Responsibilities
- Design, implement, and maintain high-throughput, secure RESTful APIs.
- Implement robust JWT authentication, role-based access control, and payload validation.
- Model complex data entities using MongoDB document schemas and relational schemas.
- Profile and optimize database query plans, compound indexes, and aggregation pipelines.
- Author robust unit and integration tests with high code coverage.
- Monitor production API health, structured logs, and real-time event streaming services.

### Qualifications
- 1–3 years of professional experience with Node.js and TypeScript.
- Strong grasp of document databases (MongoDB) and relational databases (PostgreSQL).
- Solid knowledge of HTTP protocol, status codes, and web security best practices.
- Experience with Docker, Git, and automated testing frameworks.

### Compensation & Benefits
- ₹7,00,000 – ₹13,00,000 INR per annum.
- Premium medical coverage for employee and dependents.
- Flexible hybrid schedule based in Hyderabad.`,
    },
    {
      title: "Full-Stack Developer",
      department: "Product Engineering",
      location: "Bengaluru, India (Hybrid)",
      employmentType: "FullTime" as const,
      experienceMin: 1,
      experienceMax: 3,
      status: "Open" as JobStatus,
      ownerId: ananyaId,
      openedAt: daysAgo(50),
      requirements: [
        "Full-stack development with React (frontend) and Node.js/TypeScript (backend)",
        "MongoDB or PostgreSQL database modeling and migrations",
        "State management, API integration, and Server-Sent Events (SSE)",
        "Security practices including CSRF protection, secure cookies, and input sanitization",
        "CI/CD deployment pipelines, Git, and Docker",
      ],
      description: `### Role Overview
As a Full-Stack Developer on our Product Engineering team, you will bridge user experience with resilient backend systems, delivering end-to-end features from database to browser.

### Key Responsibilities
- Design and implement intuitive UI workflows paired with resilient backend services.
- Develop secure, authenticated API endpoints and real-time SSE notification hubs.
- Build responsive, interactive data visualization interfaces utilizing Recharts.
- Write unit, integration, and end-to-end automated tests across both layers.
- Triage, diagnose, and resolve production bugs and user-reported issues.
- Collaborate across disciplines with UI/UX designers, QA engineers, and product managers.

### Qualifications
- 1–3 years building production web applications across the complete stack.
- Proficiency in React, TypeScript, Node.js, Express, and MongoDB.
- Solid understanding of web fundamentals, browser performance, and security headers.
- Excellent problem-solving skills and team-oriented communication.

### Compensation & Benefits
- ₹8,00,000 – ₹15,00,000 INR per annum.
- Annual performance bonus and equity participation opportunities.
- Comprehensive health, dental, and vision insurance.`,
    },

    // 5 Data, AI & Infrastructure Jobs owned by Rohan Mehta
    {
      title: "Data Analyst",
      department: "Data and Analytics",
      location: "Pune, India (Hybrid)",
      employmentType: "FullTime" as const,
      experienceMin: 0,
      experienceMax: 2,
      status: "Open" as JobStatus,
      ownerId: rohanId,
      openedAt: daysAgo(80),
      requirements: [
        "Advanced SQL querying, window functions, and data aggregation",
        "Python data processing with pandas and NumPy",
        "Data visualization and business intelligence reporting (Tableau, Power BI)",
        "Exploratory data analysis, KPI definition, and statistical reasoning",
        "Clear communication of analytical findings to cross-functional teams",
      ],
      description: `### Role Overview
Join the Data and Analytics team at EarlyHire Demo Technologies. You will uncover actionable insights from recruitment metrics, application funnels, and customer behavior.

### Key Responsibilities
- Extract, clean, transform, and validate structured and semi-structured datasets.
- Define, track, and monitor operational KPIs, hiring velocity, and pass-through rates.
- Design interactive executive dashboards and automated scheduled reports.
- Investigate anomalies, identify data discrepancies, and propose quality improvements.
- Translate complex data analysis into actionable presentations for leadership.

### Qualifications
- Bachelor's degree in Computer Science, Statistics, Mathematics, or Economics.
- Strong SQL proficiency and experience with Python (pandas, matplotlib, seaborn).
- Experience building dashboards in Tableau, Power BI, or modern web visualization tools.
- Strong business acumen and presentation skills.

### Compensation & Benefits
- ₹5,00,000 – ₹10,00,000 INR per annum.
- Hybrid work flexibility (Pune campus).
- Continuous learning stipend for analytics and data science courses.`,
    },
    {
      title: "Machine Learning Engineer",
      department: "AI and Machine Learning",
      location: "Bengaluru, India (Hybrid)",
      employmentType: "FullTime" as const,
      experienceMin: 1,
      experienceMax: 3,
      status: "Open" as JobStatus,
      ownerId: rohanId,
      openedAt: daysAgo(55),
      requirements: [
        "Python programming with scikit-learn, pandas, and NumPy",
        "Natural Language Processing (NLP) and text representation techniques",
        "Machine learning model evaluation, cross-validation, and metrics tracking",
        "FastAPI or Express inference API development and containerization",
        "Mathematics fundamentals: linear algebra, probability, and optimization",
      ],
      description: `### About the AI Team
The AI & Machine Learning team at EarlyHire Demo Technologies builds intelligent resume parsing, semantic candidate-job matching, and automated rubric evaluation systems.

### Key Responsibilities
- Curate training datasets, engineer high-impact features, and sanitize text corpora.
- Train, evaluate, and benchmark machine learning models for ranking and classification.
- Deploy low-latency, scalable inference APIs packaged in Docker containers.
- Monitor model drift, inference latency, and scoring calibration in production.
- Work alongside product engineers to integrate AI recommendations seamlessly into ATS UI.

### Qualifications
- 1–3 years applied machine learning experience with demonstrable projects.
- Solid understanding of NLP, information retrieval, and vector embeddings.
- Practical experience with scikit-learn, PyTorch, or Hugging Face libraries.
- Strong coding and debugging skills in Python.

### Compensation & Benefits
- ₹10,00,000 – ₹18,00,000 INR per annum.
- Access to high-performance GPU compute clusters.
- Flexible hybrid schedule in Bengaluru tech corridor.`,
    },
    {
      title: "DevOps / Cloud Engineer",
      department: "Platform Engineering",
      location: "Hyderabad, India (Hybrid)",
      employmentType: "FullTime" as const,
      experienceMin: 2,
      experienceMax: 4,
      status: "Open" as JobStatus,
      ownerId: rohanId,
      openedAt: daysAgo(45),
      requirements: [
        "Linux system administration, bash scripting, and networking fundamentals",
        "Containerization with Docker and container orchestration (Kubernetes)",
        "Cloud platform administration (AWS, GCP, or Cloudflare infrastructure)",
        "CI/CD automation with GitHub Actions, Jenkins, or GitLab CI",
        "Infrastructure as Code (Terraform) and observability tooling (Prometheus, Grafana)",
      ],
      description: `### Role Overview
We are seeking a proactive DevOps / Cloud Engineer to automate infrastructure provisioning, enhance CI/CD delivery pipelines, and ensure 99.9% uptime.

### Key Responsibilities
- Architect, automate, and maintain multi-environment CI/CD deployment pipelines.
- Provision cloud infrastructure using Terraform and Infrastructure as Code principles.
- Configure and manage containerized workloads running on Kubernetes clusters.
- Establish robust monitoring, alerting, structured logging, and incident response playbooks.
- Enforce zero-trust cloud security, IAM least-privilege policies, and compliance baselines.

### Qualifications
- 2–4 years dedicated experience in DevOps, SRE, or Cloud Engineering.
- Hands-on expertise with AWS, Docker, Kubernetes, and Linux internals.
- Proven track record with CI/CD automation and configuration management.
- Strong troubleshooting ability under high-availability constraints.

### Compensation & Perks
- ₹12,00,000 – ₹20,00,000 INR per annum.
- On-call compensation and generous cloud learning allowances.
- Hybrid working environment in Hyderabad.`,
    },
    {
      title: "Senior Software Engineer",
      department: "Core Engineering",
      location: "Bengaluru, India (Hybrid)",
      employmentType: "FullTime" as const,
      experienceMin: 5,
      experienceMax: 8,
      status: "Paused" as JobStatus, // Paused requisition per prompt instructions
      ownerId: rohanId,
      openedAt: daysAgo(90),
      requirements: [
        "Deep expertise in backend architecture (Java, Python, or Go)",
        "Distributed systems, microservices design, and event-driven patterns",
        "High-scale database modeling, indexing strategies, and caching systems (Redis)",
        "Architectural governance, automated testing, and observability practices",
        "Technical communication, code review leadership, and developer mentorship",
      ],
      description: `### Position Overview
*[Requisition Status: Paused while team reviews Q4 architectural staffing]*

The Senior Software Engineer leads architectural strategy and technical execution for core platform capabilities at EarlyHire Demo Technologies.

### Key Responsibilities
- Design, build, and scale resilient, fault-tolerant distributed system components.
- Lead technical design reviews and establish engineering standards across repositories.
- Diagnose and remediate complex distributed systems latency and concurrency bottlenecks.
- Mentor junior and mid-level software engineers, driving code quality and testing rigor.
- Partner with product leadership to decompose ambitious initiatives into execution plans.

### Qualifications
- 5–8 years designing and operating high-throughput production backends.
- Mastery of distributed systems concepts, CAP theorem, and event-driven architectures.
- Expert knowledge of relational and NoSQL databases at scale.
- Proven track record of mentoring engineers and elevating team technical velocity.

### Compensation & Equity
- ₹25,00,000 – ₹40,00,000 INR per annum + significant stock options.
- Premium executive healthcare benefits.`,
    },
    {
      title: "Engineering Manager",
      department: "Engineering Leadership",
      location: "Bengaluru, India (Hybrid)",
      employmentType: "FullTime" as const,
      experienceMin: 8,
      experienceMax: 12,
      status: "Closed" as JobStatus, // Closed requisition per prompt instructions
      ownerId: rohanId,
      openedAt: daysAgo(90),
      closesAt: daysAgo(10),
      requirements: [
        "Proven software engineering leadership managing cross-functional teams (8–15 engineers)",
        "Technical background in software architecture and operational reliability",
        "Agile delivery management, sprint execution, and roadmap alignment",
        "People management: performance reviews, mentoring, retention, and career ladders",
        "Stakeholder management collaborating with Product, Design, and Executive leadership",
      ],
      description: `### Position Overview
*[Requisition Status: Closed — Offer Accepted and Position Filled]*

The Engineering Manager leads our Core Platform and Workflow engineering team, fostering a culture of technical excellence, continuous delivery, and empathetic leadership.

### Key Responsibilities
- Lead, coach, and grow an exceptional team of 8–12 software engineers.
- Partner with Product and Architecture leads to define and deliver quarterly roadmaps.
- Cultivate strong engineering practices: automated testing, code review, and post-mortems.
- Manage hiring pipeline, conduct technical interviews, and drive talent onboarding.
- Champion engineering productivity, developer experience, and psychological safety.

### Qualifications
- 8+ years total software engineering experience, including 3+ years in people management.
- Strong background shipping complex web and cloud products.
- Empathetic leadership style focused on coaching and career empowerment.
- Excellent executive communication and cross-functional collaboration skills.

### Compensation
- ₹35,00,000 – ₹55,00,000 INR per annum + executive equity.`,
    },
  ];

  const jobDocs: Record<string, IJobDocument> = {};

  for (const def of jobDefinitions) {
    let job = await Job.findOne({ title: def.title });
    if (job) {
      summary.jobsExisting++;
      jobDocs[def.title] = job;
      if (isExecute) {
        job.department = def.department;
        job.location = def.location;
        job.employmentType = def.employmentType;
        job.experienceMin = def.experienceMin;
        job.experienceMax = def.experienceMax;
        job.status = def.status;
        job.ownerId = def.ownerId;
        job.openedAt = def.openedAt;
        job.description = def.description;
        job.requirements = def.requirements;
        if (def.closesAt) job.closesAt = def.closesAt;
        await job.save();
      }
    } else {
      summary.jobsCreated++;
      if (isExecute) {
        job = await Job.create(def);
        jobDocs[def.title] = job;
      }
    }
    if (def.status === "Open") {
      summary.totalActiveJobs++;
    }
  }

  // ==========================================
  // 4. LINKED JOB APPLICATIONS (18)
  // ==========================================
  interface ApplicationSeedConfig {
    candidateEmail: string;
    jobTitle: string;
    stage: HiringStage;
    status: "Active" | "Withdrawn" | "Archived";
    appliedDaysAgo: number;
    stageChangeDaysAgo: number;
    recruiterId: mongoose.Types.ObjectId;
    score: number;
    skillsScore: number;
    experienceScore: number;
    educationScore: number;
    relevanceScore: number;
    matchedSkills: string[];
    missingCriteria: string[];
  }

  const applicationConfigs: ApplicationSeedConfig[] = [
    // --- Aditi Verma (Fresher) ---
    {
      candidateEmail: "aditi.verma@earlyhire.test",
      jobTitle: "Associate Software Engineer",
      stage: "Interview",
      status: "Active",
      appliedDaysAgo: 28,
      stageChangeDaysAgo: 5,
      recruiterId: ananyaId,
      score: 82,
      skillsScore: 85,
      experienceScore: 75,
      educationScore: 90,
      relevanceScore: 80,
      matchedSkills: ["Java", "Python", "SQL", "OOP", "Data Structures", "Git"],
      missingCriteria: ["Production enterprise experience"],
    },
    {
      candidateEmail: "aditi.verma@earlyhire.test",
      jobTitle: "Junior QA Automation Engineer",
      stage: "Offer",
      status: "Active",
      appliedDaysAgo: 35,
      stageChangeDaysAgo: 4,
      recruiterId: ananyaId,
      score: 86,
      skillsScore: 88,
      experienceScore: 80,
      educationScore: 92,
      relevanceScore: 85,
      matchedSkills: ["Python", "SQL", "Unit Testing", "Git"],
      missingCriteria: ["Playwright / Selenium experience"],
    },
    {
      candidateEmail: "aditi.verma@earlyhire.test",
      jobTitle: "Junior Frontend Developer",
      stage: "Screening",
      status: "Active",
      appliedDaysAgo: 14,
      stageChangeDaysAgo: 10,
      recruiterId: ananyaId,
      score: 64,
      skillsScore: 60,
      experienceScore: 65,
      educationScore: 88,
      relevanceScore: 55,
      matchedSkills: ["Git", "REST APIs"],
      missingCriteria: ["React", "TypeScript", "Tailwind CSS"],
    },
    {
      candidateEmail: "aditi.verma@earlyhire.test",
      jobTitle: "Backend Developer",
      stage: "Rejected",
      status: "Active",
      appliedDaysAgo: 40,
      stageChangeDaysAgo: 32,
      recruiterId: ananyaId,
      score: 48,
      skillsScore: 52,
      experienceScore: 35,
      educationScore: 85,
      relevanceScore: 42,
      matchedSkills: ["SQL", "Git"],
      missingCriteria: ["1–3 years professional Node.js experience", "MongoDB / PostgreSQL production design"],
    },

    // --- Arjun Patel (Fresher to Junior) ---
    {
      candidateEmail: "arjun.patel@earlyhire.test",
      jobTitle: "Junior Frontend Developer",
      stage: "Hired",
      status: "Active",
      appliedDaysAgo: 45,
      stageChangeDaysAgo: 12, // Hired 12 days ago (Time to hire = 33 days)
      recruiterId: ananyaId,
      score: 89,
      skillsScore: 92,
      experienceScore: 84,
      educationScore: 86,
      relevanceScore: 94,
      matchedSkills: ["React", "JavaScript", "TypeScript", "HTML", "CSS", "REST APIs", "Tailwind CSS", "Git"],
      missingCriteria: [],
    },
    {
      candidateEmail: "arjun.patel@earlyhire.test",
      jobTitle: "Full-Stack Developer",
      stage: "Interview",
      status: "Active",
      appliedDaysAgo: 22,
      stageChangeDaysAgo: 3,
      recruiterId: ananyaId,
      score: 76,
      skillsScore: 80,
      experienceScore: 72,
      educationScore: 85,
      relevanceScore: 70,
      matchedSkills: ["React", "JavaScript", "TypeScript", "REST APIs", "Git"],
      missingCriteria: ["Node.js backend microservices", "Database schema modeling"],
    },
    {
      candidateEmail: "arjun.patel@earlyhire.test",
      jobTitle: "Associate Software Engineer",
      stage: "Screening",
      status: "Active",
      appliedDaysAgo: 18,
      stageChangeDaysAgo: 14,
      recruiterId: ananyaId,
      score: 78,
      skillsScore: 76,
      experienceScore: 78,
      educationScore: 85,
      relevanceScore: 75,
      matchedSkills: ["JavaScript", "TypeScript", "REST APIs", "Git"],
      missingCriteria: ["Java or C++"],
    },
    {
      candidateEmail: "arjun.patel@earlyhire.test",
      jobTitle: "Backend Developer",
      stage: "Applied",
      status: "Active",
      appliedDaysAgo: 6,
      stageChangeDaysAgo: 6,
      recruiterId: ananyaId,
      score: 62,
      skillsScore: 65,
      experienceScore: 60,
      educationScore: 85,
      relevanceScore: 50,
      matchedSkills: ["TypeScript", "REST APIs", "Git"],
      missingCriteria: ["Node.js / Express backend mastery", "MongoDB query optimization"],
    },

    // --- Sneha Iyer (Junior to Intermediate) ---
    {
      candidateEmail: "sneha.iyer@earlyhire.test",
      jobTitle: "Backend Developer",
      stage: "Offer",
      status: "Active",
      appliedDaysAgo: 38,
      stageChangeDaysAgo: 6,
      recruiterId: ananyaId,
      score: 93,
      skillsScore: 96,
      experienceScore: 90,
      educationScore: 90,
      relevanceScore: 95,
      matchedSkills: ["Node.js", "Express", "TypeScript", "MongoDB", "PostgreSQL", "REST APIs", "JWT", "Docker"],
      missingCriteria: [],
    },
    {
      candidateEmail: "sneha.iyer@earlyhire.test",
      jobTitle: "Full-Stack Developer",
      stage: "Interview",
      status: "Active",
      appliedDaysAgo: 25,
      stageChangeDaysAgo: 4,
      recruiterId: ananyaId,
      score: 84,
      skillsScore: 88,
      experienceScore: 82,
      educationScore: 88,
      relevanceScore: 80,
      matchedSkills: ["Node.js", "Express", "TypeScript", "MongoDB", "PostgreSQL", "REST APIs", "Git"],
      missingCriteria: ["Advanced React hooks & component optimization"],
    },
    {
      candidateEmail: "sneha.iyer@earlyhire.test",
      jobTitle: "Associate Software Engineer",
      stage: "Applied",
      status: "Active",
      appliedDaysAgo: 8,
      stageChangeDaysAgo: 8,
      recruiterId: ananyaId,
      score: 88,
      skillsScore: 92,
      experienceScore: 85,
      educationScore: 90,
      relevanceScore: 86,
      matchedSkills: ["TypeScript", "SQL", "Git", "REST APIs"],
      missingCriteria: [],
    },
    {
      candidateEmail: "sneha.iyer@earlyhire.test",
      jobTitle: "DevOps / Cloud Engineer",
      stage: "Rejected",
      status: "Active",
      appliedDaysAgo: 30,
      stageChangeDaysAgo: 24,
      recruiterId: rohanId,
      score: 54,
      skillsScore: 55,
      experienceScore: 52,
      educationScore: 85,
      relevanceScore: 45,
      matchedSkills: ["Docker", "Git"],
      missingCriteria: ["Kubernetes orchestration", "Terraform / Infrastructure as Code", "AWS / Cloud architecture"],
    },

    // --- Kabir Singh (Intermediate Data/ML) ---
    {
      candidateEmail: "kabir.singh@earlyhire.test",
      jobTitle: "Data Analyst",
      stage: "Hired",
      status: "Active",
      appliedDaysAgo: 60,
      stageChangeDaysAgo: 20, // Hired 20 days ago (Time to hire = 40 days)
      recruiterId: rohanId,
      score: 91,
      skillsScore: 94,
      experienceScore: 88,
      educationScore: 88,
      relevanceScore: 92,
      matchedSkills: ["Python", "SQL", "pandas", "NumPy", "Data Visualization", "Experimentation", "Tableau"],
      missingCriteria: [],
    },
    {
      candidateEmail: "kabir.singh@earlyhire.test",
      jobTitle: "Machine Learning Engineer",
      stage: "Interview",
      status: "Active",
      appliedDaysAgo: 32,
      stageChangeDaysAgo: 7,
      recruiterId: rohanId,
      score: 85,
      skillsScore: 88,
      experienceScore: 82,
      educationScore: 86,
      relevanceScore: 85,
      matchedSkills: ["Python", "pandas", "NumPy", "scikit-learn", "Git", "Experimentation"],
      missingCriteria: ["Deep learning frameworks (PyTorch/TensorFlow)", "High-scale inference API deployment"],
    },
    {
      candidateEmail: "kabir.singh@earlyhire.test",
      jobTitle: "Backend Developer",
      stage: "Screening",
      status: "Active",
      appliedDaysAgo: 15,
      stageChangeDaysAgo: 12,
      recruiterId: ananyaId,
      score: 68,
      skillsScore: 70,
      experienceScore: 68,
      educationScore: 85,
      relevanceScore: 60,
      matchedSkills: ["Python", "SQL", "Git"],
      missingCriteria: ["Node.js / Express experience", "MongoDB document modeling"],
    },

    // --- Meera Nair (Senior Engineer) ---
    {
      candidateEmail: "meera.nair@earlyhire.test",
      jobTitle: "Senior Software Engineer",
      stage: "Offer",
      status: "Active",
      appliedDaysAgo: 42,
      stageChangeDaysAgo: 5,
      recruiterId: rohanId,
      score: 95,
      skillsScore: 98,
      experienceScore: 96,
      educationScore: 90,
      relevanceScore: 96,
      matchedSkills: ["Java", "Python", "System Design", "Microservices", "AWS", "Docker", "Kubernetes", "CI/CD", "Mentoring"],
      missingCriteria: [],
    },
    {
      candidateEmail: "meera.nair@earlyhire.test",
      jobTitle: "DevOps / Cloud Engineer",
      stage: "Interview",
      status: "Active",
      appliedDaysAgo: 24,
      stageChangeDaysAgo: 6,
      recruiterId: rohanId,
      score: 87,
      skillsScore: 88,
      experienceScore: 92,
      educationScore: 88,
      relevanceScore: 85,
      matchedSkills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Python"],
      missingCriteria: ["Dedicated Terraform infrastructure state management"],
    },
    {
      candidateEmail: "meera.nair@earlyhire.test",
      jobTitle: "Engineering Manager",
      stage: "Screening",
      status: "Active",
      appliedDaysAgo: 16,
      stageChangeDaysAgo: 14,
      recruiterId: rohanId,
      score: 81,
      skillsScore: 85,
      experienceScore: 88,
      educationScore: 88,
      relevanceScore: 78,
      matchedSkills: ["Mentoring", "System Design", "Architecture", "CI/CD"],
      missingCriteria: ["Prior formal title as direct Engineering Manager"],
    },
  ];

  const appDocs: IApplicationDocument[] = [];

  for (const cfg of applicationConfigs) {
    const candidate = candidateDocs[cfg.candidateEmail];
    const job = jobDocs[cfg.jobTitle];

    summary.totalApplicationsByStage[cfg.stage] = (summary.totalApplicationsByStage[cfg.stage] || 0) + 1;

    if (!candidate || !job) {
      continue;
    }

    const appliedAt = daysAgo(cfg.appliedDaysAgo);
    const lastStageChangedAt = daysAgo(cfg.stageChangeDaysAgo);
    const isHired = cfg.stage === "Hired";
    const isRejected = cfg.stage === "Rejected";

    const atsSnapshot: IAtsSnapshot = {
      overallScore: cfg.score,
      breakdown: {
        skillsScore: cfg.skillsScore,
        experienceScore: cfg.experienceScore,
        educationScore: cfg.educationScore,
        roleRelevanceScore: cfg.relevanceScore,
      },
      status: "completed",
      provider: "deterministic_engine",
      model: "ats-rule-engine-v2",
      resumeVersion: 1,
      resumeContentHash: null,
      jobContentHash: null,
      promptVersion: "v1.0",
      rubricVersion: "v2.0-deterministic-hybrid",
      assessedAt: appliedAt,
      snapshotTimestamp: appliedAt,
      reportRef: null,
      matchedSkills: cfg.matchedSkills,
      requiredSkillsFound: cfg.matchedSkills,
      missingCriteria: cfg.missingCriteria,
    };

    const existingApp: IApplicationDocument | null = await Application.findOne({
      candidateId: candidate._id,
      jobId: job._id,
    });

    if (existingApp) {
      summary.applicationsExisting++;
      if (isExecute) {
        existingApp.stage = cfg.stage;
        existingApp.currentStage = cfg.stage;
        existingApp.status = cfg.status;
        existingApp.recruiterId = cfg.recruiterId;
        existingApp.appliedAt = appliedAt;
        existingApp.lastStageChangedAt = lastStageChangedAt;
        existingApp.hiredAt = isHired ? lastStageChangedAt : null;
        existingApp.rejectedAt = isRejected ? lastStageChangedAt : null;
        existingApp.atsSnapshot = atsSnapshot;
        await existingApp.save();
      }
      appDocs.push(existingApp);
    } else {
      summary.applicationsCreated++;
      if (isExecute) {
        const createdApp: IApplicationDocument = await Application.create({
          candidateId: candidate._id,
          jobId: job._id,
          recruiterId: cfg.recruiterId,
          stage: cfg.stage,
          currentStage: cfg.stage,
          status: cfg.status,
          appliedAt,
          lastStageChangedAt,
          hiredAt: isHired ? lastStageChangedAt : null,
          rejectedAt: isRejected ? lastStageChangedAt : null,
          atsSnapshot,
          source: candidate.source,
          createdBy: cfg.recruiterId,
          updatedBy: cfg.recruiterId,
          version: 0,
        });
        appDocs.push(createdApp);

        // Populate realistic stage transition history
        const stageProgressions: Record<HiringStage, HiringStage[]> = {
          Applied: ["Applied"],
          Screening: ["Applied", "Screening"],
          Interview: ["Applied", "Screening", "Interview"],
          Offer: ["Applied", "Screening", "Interview", "Offer"],
          Hired: ["Applied", "Screening", "Interview", "Offer", "Hired"],
          Rejected: ["Applied", "Rejected"],
        };

        const stages = stageProgressions[cfg.stage] || ["Applied"];
        let previousStage: HiringStage | null = null;
        const totalDurationMs = lastStageChangedAt.getTime() - appliedAt.getTime();
        const stepMs = stages.length > 1 ? Math.floor(totalDurationMs / (stages.length - 1)) : 0;

        for (let i = 0; i < stages.length; i++) {
          const currentStep = stages[i];
          const changedAt = new Date(appliedAt.getTime() + i * stepMs);
          await InterviewStageHistory.create({
            applicationId: createdApp._id,
            fromStage: previousStage,
            toStage: currentStep,
            actorId: cfg.recruiterId,
            changedAt,
            durationMsFromPreviousStage: i > 0 ? stepMs : null,
          });
          previousStage = currentStep;
        }
      }
    }
  }

  // ==========================================
  // 5. INTERVIEWS (6: 3 completed, 3 scheduled)
  // ==========================================
  const interviewDefinitions = [
    // Completed 1
    {
      candidateEmail: "arjun.patel@earlyhire.test",
      jobTitle: "Junior Frontend Developer",
      title: "Technical Coding Round (React & UI Components)",
      status: "completed" as const,
      daysFromNow: -25, // 25 days ago
      durationMinutes: 60,
      recruiterEmail: "ananya.sharma@earlyhire.test",
      interviewerName: "Ananya Sharma",
      notes: "Arjun demonstrated excellent React hooks and state management skills. Built a live responsive filter component effortlessly.",
    },
    // Completed 2
    {
      candidateEmail: "kabir.singh@earlyhire.test",
      jobTitle: "Data Analyst",
      title: "Data Modeling & SQL Assessment",
      status: "completed" as const,
      daysFromNow: -30, // 30 days ago
      durationMinutes: 45,
      recruiterEmail: "rohan.mehta@earlyhire.test",
      interviewerName: "Rohan Mehta",
      notes: "Strong performance on complex multi-table window functions and statistical evaluation techniques.",
    },
    // Completed 3
    {
      candidateEmail: "meera.nair@earlyhire.test",
      jobTitle: "Senior Software Engineer",
      title: "System Design & Distributed Architecture",
      status: "completed" as const,
      daysFromNow: -15, // 15 days ago
      durationMinutes: 75,
      recruiterEmail: "rohan.mehta@earlyhire.test",
      interviewerName: "Rohan Mehta",
      notes: "Exceptional system design walk-through. Discussed event sourcing, idempotent write handlers, and Kubernetes cluster resilience.",
    },
    // Upcoming 1
    {
      candidateEmail: "sneha.iyer@earlyhire.test",
      jobTitle: "Full-Stack Developer",
      title: "System & API Architecture Interview",
      status: "scheduled" as const,
      daysFromNow: 2, // In 2 days
      durationMinutes: 60,
      recruiterEmail: "ananya.sharma@earlyhire.test",
      interviewerName: "Ananya Sharma",
      notes: "Focus on API performance, concurrency, and real-time SSE streaming patterns.",
    },
    // Upcoming 2
    {
      candidateEmail: "kabir.singh@earlyhire.test",
      jobTitle: "Machine Learning Engineer",
      title: "Machine Learning Evaluation & Modeling Round",
      status: "scheduled" as const,
      daysFromNow: 4, // In 4 days
      durationMinutes: 60,
      recruiterEmail: "rohan.mehta@earlyhire.test",
      interviewerName: "Rohan Mehta",
      notes: "Deep dive into scikit-learn models, precision-recall trade-offs, and inference scaling.",
    },
    // Upcoming 3
    {
      candidateEmail: "aditi.verma@earlyhire.test",
      jobTitle: "Associate Software Engineer",
      title: "Technical Problem Solving & CS Fundamentals",
      status: "scheduled" as const,
      daysFromNow: 5, // In 5 days
      durationMinutes: 45,
      recruiterEmail: "ananya.sharma@earlyhire.test",
      interviewerName: "Ananya Sharma",
      notes: "Review core data structures, graph traversals, and SQL basics.",
    },
  ];

  for (const intDef of interviewDefinitions) {
    const candidate = candidateDocs[intDef.candidateEmail];
    const candidateUser = candidateUserDocs[intDef.candidateEmail];
    const job = jobDocs[intDef.jobTitle];
    const organizer = recruiterDocs[intDef.recruiterEmail];

    if (!candidate || !job) continue;

    const application = appDocs.find(
      (a) => a.candidateId.toString() === candidate._id.toString() && a.jobId.toString() === job._id.toString()
    );

    if (!application) continue;

    const scheduledStartTime = new Date(now.getTime() + intDef.daysFromNow * 24 * 60 * 60 * 1000);
    const scheduledEndTime = new Date(scheduledStartTime.getTime() + intDef.durationMinutes * 60 * 1000);

    const existingInterview = await Interview.findOne({
      applicationId: application._id,
      title: intDef.title,
    });

    if (existingInterview) {
      summary.interviewsExisting++;
      if (isExecute) {
        existingInterview.status = intDef.status;
        existingInterview.scheduledStartTime = scheduledStartTime;
        existingInterview.scheduledEndTime = scheduledEndTime;
        existingInterview.notes = intDef.notes;
        await existingInterview.save();
      }
    } else {
      summary.interviewsCreated++;
      if (isExecute) {
        await Interview.create({
          applicationId: application._id,
          jobId: job._id,
          candidateUserId: candidateUser?._id || organizer?._id || ananyaId,
          candidateId: candidate._id,
          organizerId: organizer?._id || ananyaId,
          interviewers: [
            {
              userId: organizer?._id || ananyaId,
              name: intDef.interviewerName,
              email: intDef.recruiterEmail,
            },
          ],
          title: intDef.title,
          scheduledStartTime,
          scheduledEndTime,
          timezone: "Asia/Kolkata",
          status: intDef.status,
          meetingType: "google_meet",
          googleMeetLink: "https://meet.google.com/early-demo-interview",
          notes: intDef.notes,
        });
      }
    }
  }

  // ==========================================
  // 6. RECRUITER NOTES & NOTIFICATIONS
  // ==========================================
  if (isExecute) {
    const noteDefinitions = [
      {
        candidateEmail: "aditi.verma@earlyhire.test",
        authorEmail: "ananya.sharma@earlyhire.test",
        body: "Strong problem-solving fundamentals in CS courses. Very motivated for backend development role.",
      },
      {
        candidateEmail: "arjun.patel@earlyhire.test",
        authorEmail: "ananya.sharma@earlyhire.test",
        body: "Completed live frontend coding assessment with distinction. Demonstrated high empathy for responsive UI details.",
      },
      {
        candidateEmail: "kabir.singh@earlyhire.test",
        authorEmail: "rohan.mehta@earlyhire.test",
        body: "Demonstrated deep pandas/scikit-learn understanding during technical screening.",
      },
      {
        candidateEmail: "meera.nair@earlyhire.test",
        authorEmail: "rohan.mehta@earlyhire.test",
        body: "World-class system design interview. Recommended strongly for technical leadership.",
      },
    ];

    for (const nDef of noteDefinitions) {
      const candidate = candidateDocs[nDef.candidateEmail];
      const author = recruiterDocs[nDef.authorEmail];
      if (!candidate || !author) continue;

      const existingNote = await Note.findOne({ candidateId: candidate._id, body: nDef.body });
      if (!existingNote) {
        await Note.create({
          candidateId: candidate._id,
          authorId: author._id,
          body: nDef.body,
        });
        summary.notesCreated++;
      }
    }

    // Candidate notifications
    for (const candUser of Object.values(candidateUserDocs)) {
      if (!candUser) continue;
      const existingNotif = await Notification.findOne({
        recipientUserId: candUser._id,
        title: "Welcome to EarlyAI ATS Demo Platform",
      });
      if (!existingNotif) {
        await Notification.create({
          recipientUserId: candUser._id,
          title: "Welcome to EarlyAI ATS Demo Platform",
          message: "Your candidate profile is active. You can track applications and scheduled interviews in real time.",
          type: "system",
          isRead: false,
        });
        summary.notificationsCreated++;
      }
    }
  }

  return summary;
}

// CLI Execution Wrapper
async function main() {
  const args = process.argv.slice(2);
  const isExecute = args.includes("--execute");

  console.log("================================================================================");
  console.log("🚀 EarlyAI ATS — Safe, Idempotent Demo Dataset Seeder");
  console.log(`Mode: ${isExecute ? "⚡ EXECUTE (Applying changes to database)" : "🔍 DRY RUN (Preview only, no writes)"}`);
  console.log("================================================================================");

  try {
    const summary = await seedDemoDataset({
      isExecute,
      demoPassword: process.env.DEMO_USER_PASSWORD || "EarlyATS2026!Demo",
    });

    console.log("\n📊 SEED EXECUTION SUMMARY:");
    console.log(`- Target Database: ${summary.targetDatabase}`);
    console.log(`- Mode: ${summary.dryRun ? "DRY-RUN (Simulated)" : "EXECUTED (Persisted)"}`);
    console.log(`- Recruiters: ${summary.recruitersCreated} created, ${summary.recruitersExisting} existing`);
    console.log(`- Candidates: ${summary.candidatesCreated} created, ${summary.candidatesExisting} existing`);
    console.log(`- Job Postings: ${summary.jobsCreated} created, ${summary.jobsExisting} existing (Active Open: ${summary.totalActiveJobs})`);
    console.log(`- Applications: ${summary.applicationsCreated} created, ${summary.applicationsExisting} existing`);
    console.log(`- Applications by Stage:`, JSON.stringify(summary.totalApplicationsByStage, null, 2));
    console.log(`- Interviews: ${summary.interviewsCreated} created, ${summary.interviewsExisting} existing`);
    if (!summary.dryRun) {
      console.log(`- Recruiter Notes: ${summary.notesCreated} created`);
      console.log(`- Candidate Notifications: ${summary.notificationsCreated} created`);
    }

    if (summary.dryRun) {
      console.log("\nℹ️ Dry run completed safely without modifying any database records.");
      console.log("👉 To write these records to the development database, run:");
      console.log("   npm run seed:demo -- --execute");
    } else {
      console.log("\n✅ Demo dataset seeded successfully and ready for UI exploration!");
    }
  } catch (err) {
    console.error("\n❌ Seeding halted:", err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("🔌 Disconnected from MongoDB.");
    }
  }
}

if (process.argv[1]?.includes("seedDemoData")) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

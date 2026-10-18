import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { ResumeFile } from "../models/resume.model.js";
import { Application } from "../models/application.model.js";
import { AtsAnalysis } from "../models/atsAnalysis.model.js";
import {
  computeDeterministicAtsScore,
  calculateWeightedAtsScore,
  CANONICAL_RUBRIC_WEIGHTS,
} from "../services/ai/atsScoringService.js";
import { atsReviewService } from "../services/ai/atsReviewService.js";
import { signToken, AUTH_COOKIE_NAME } from "../utils/jwt.js";

const TEST_DB_URI = "mongodb://localhost:27017/earlyai_ats_test";

describe("ATS Score Consistency & Contract Audit Suite", { timeout: 30000 }, () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    await connectDB(TEST_DB_URI);
    app = createApp();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await disconnectDB();
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Job.deleteMany({});
    await ResumeFile.deleteMany({});
    await Application.deleteMany({});
    await AtsAnalysis.deleteMany({});
  });

  const getSessionCookie = (user: { id: string; role: string }) => {
    const token = signToken({ id: user.id, role: user.role });
    return `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax`;
  };

  describe("1. Mathematical Rigor & Component Weight Contract", () => {
    it("canonical rubric weights strictly sum to 1.00 (100%)", () => {
      const sum =
        CANONICAL_RUBRIC_WEIGHTS.skills +
        CANONICAL_RUBRIC_WEIGHTS.experience +
        CANONICAL_RUBRIC_WEIGHTS.education +
        CANONICAL_RUBRIC_WEIGHTS.roleRelevance;

      expect(sum).toBeCloseTo(1.0, 5);
      expect(CANONICAL_RUBRIC_WEIGHTS.skills).toBe(0.4);
      expect(CANONICAL_RUBRIC_WEIGHTS.experience).toBe(0.3);
      expect(CANONICAL_RUBRIC_WEIGHTS.education).toBe(0.15);
      expect(CANONICAL_RUBRIC_WEIGHTS.roleRelevance).toBe(0.15);
    });

    it("calculateWeightedAtsScore strictly matches the server-side formula for any valid breakdown", () => {
      const breakdown = {
        skillsScore: 85,
        experienceScore: 70,
        educationScore: 90,
        roleRelevanceScore: 75,
      };

      // 85*0.4 (34) + 70*0.3 (21) + 90*0.15 (13.5) + 75*0.15 (11.25) = 79.75 => 80
      const expectedScore = Math.round(85 * 0.4 + 70 * 0.3 + 90 * 0.15 + 75 * 0.15);
      expect(expectedScore).toBe(80);
      expect(calculateWeightedAtsScore(breakdown)).toBe(80);
    });

    it("clamps scores strictly between 0 and 100 for boundary and extreme values", () => {
      expect(
        calculateWeightedAtsScore({
          skillsScore: 0,
          experienceScore: 0,
          educationScore: 0,
          roleRelevanceScore: 0,
        })
      ).toBe(0);

      expect(
        calculateWeightedAtsScore({
          skillsScore: 100,
          experienceScore: 100,
          educationScore: 100,
          roleRelevanceScore: 100,
        })
      ).toBe(100);

      expect(
        calculateWeightedAtsScore({
          skillsScore: 150,
          experienceScore: 200,
          educationScore: 110,
          roleRelevanceScore: 120,
        })
      ).toBe(100);
    });

    it("deterministic scoring engine computes overallScore strictly equal to calculateWeightedAtsScore(breakdown)", () => {
      const resumeText = `
        Jane Doe | jane@example.com | (555) 000-1111
        Professional Summary: Full Stack Software Engineer with 5 years experience.
        Skills: React, Node.js, TypeScript, PostgreSQL, Docker, AWS.
        Work Experience:
        Senior Developer at TechCorp (2021 - Present)
        - Designed and deployed RESTful microservices handling 5,000 rps with 99.9% uptime.
        - Reduced API latency by 40% across 10 core service endpoints.
        Education:
        Bachelor of Science in Computer Science, State University (2020).
      `;

      const result = computeDeterministicAtsScore({
        resumeText,
        requiredSkills: ["React", "TypeScript", "Node.js", "Docker"],
      });

      const calculatedOverall = calculateWeightedAtsScore({
        skillsScore: result.breakdown.skillsScore,
        experienceScore: result.breakdown.experienceScore,
        educationScore: result.breakdown.educationScore,
        roleRelevanceScore: result.breakdown.roleRelevanceScore,
      });

      expect(result.overallScore).toBe(calculatedOverall);
      expect(result.rubricVersion).toBe("v2.0-deterministic-hybrid");
    });
  });

  describe("2. End-to-End Score Consistency Across Report, Snapshot & Recruiter Views", () => {
    it("guarantees candidate report, embedded application snapshot, and recruiter drawer all return identical scores", async () => {
      const recruiter = await User.create({
        name: "Recruiter Sam",
        email: "recruiter.consistency@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "recruiter",
      });

      const candidate = await User.create({
        name: "Dev Alex",
        email: "alex.consistency@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      const job = await Job.create({
        title: "Staff Backend Engineer",
        department: "Core Systems",
        location: "Remote",
        employmentType: "FullTime",
        status: "Open",
        ownerId: recruiter.id,
        description: "Requires advanced Node.js, TypeScript, PostgreSQL, and microservices architecture.",
        requirements: ["Node.js", "TypeScript", "PostgreSQL", "Docker"],
      });

      const resumeText = `
        Alex Rivera | alex@example.com | (555) 234-5678
        Professional Summary: Staff Backend Architect with 8+ years developing distributed systems.
        Work Experience:
        Principal Engineer at ScaleWorks (2020 - Present)
        - Led architecture for event-driven backend processing 25,000 rps.
        - Improved database throughput by 50% using PostgreSQL connection pooling and Redis.
        Skills: Node.js, TypeScript, PostgreSQL, Docker, Redis, Kubernetes, REST API.
        Education:
        Master of Science in Computer Engineering, Tech University.
      `;

      const uploadRes = await request(app)
        .post("/api/v1/resumes/upload")
        .set("Cookie", getSessionCookie(candidate))
        .attach("resume", Buffer.from(resumeText, "utf-8"), "alex_staff_resume.txt");

      expect(uploadRes.status).toBe(201);
      const resumeId = uploadRes.body.data.resume.id;

      // 1. Candidate runs ATS Pre-Check
      const analyzeRes = await request(app)
        .post("/api/v1/ats/analyze")
        .set("Cookie", getSessionCookie(candidate))
        .send({ jobId: job.id, resumeId });

      expect(analyzeRes.status).toBe(200);
      const candidateReport = analyzeRes.body.data.analysis;

      // Verify mathematical agreement of candidate report
      const candidateCalculated = calculateWeightedAtsScore(candidateReport.breakdown);
      expect(candidateReport.overallScore).toBe(candidateCalculated);

      // 2. Candidate applies for the job
      const applyRes = await request(app)
        .post("/api/v1/applications/apply")
        .set("Cookie", getSessionCookie(candidate))
        .send({ jobId: job.id, resumeId });

      expect(applyRes.status).toBe(201);
      const applicationDoc = applyRes.body.data.application;
      const snapshot = applicationDoc.atsSnapshot;

      // 3. Verify snapshot score matches candidate report exactly
      expect(snapshot.overallScore).toBe(candidateReport.overallScore);
      expect(snapshot.breakdown.skillsScore).toBe(candidateReport.breakdown.skillsScore);
      expect(snapshot.breakdown.experienceScore).toBe(candidateReport.breakdown.experienceScore);
      expect(snapshot.breakdown.educationScore).toBe(candidateReport.breakdown.educationScore);
      expect(snapshot.breakdown.roleRelevanceScore).toBe(candidateReport.breakdown.roleRelevanceScore);

      // 4. Recruiter opens the application in recruiter drawer
      const recruiterDrawerRes = await request(app)
        .get(`/api/v1/ats/application/${applicationDoc.id}`)
        .set("Cookie", getSessionCookie(recruiter));

      expect(recruiterDrawerRes.status).toBe(200);
      const recruiterData = recruiterDrawerRes.body.data;

      // 5. Verify recruiter view displays the exact same snapshot
      expect(recruiterData.snapshot.overallScore).toBe(candidateReport.overallScore);
      expect(recruiterData.snapshot.overallScore).toBe(snapshot.overallScore);
      expect(recruiterData.snapshot.breakdown).toEqual(snapshot.breakdown);

      // Verify the recruiter drawer's displayed score is mathematically reproducible from displayed components
      const recruiterCalculated = calculateWeightedAtsScore(recruiterData.snapshot.breakdown);
      expect(recruiterData.snapshot.overallScore).toBe(recruiterCalculated);
    });
  });

  describe("3. Immutability & Re-Assessment Isolation", () => {
    it("subsequent candidate resume uploads and re-assessments never mutate the submitted application snapshot", async () => {
      const recruiter = await User.create({
        name: "Recruiter Jane",
        email: "recruiter.immut@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "recruiter",
      });

      const candidate = await User.create({
        name: "Dev Taylor",
        email: "taylor@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      const job = await Job.create({
        title: "Frontend Engineer",
        department: "Web",
        location: "Remote",
        employmentType: "FullTime",
        status: "Open",
        ownerId: recruiter.id,
        description: "React, TypeScript, Tailwind CSS.",
        requirements: ["React", "TypeScript", "Tailwind CSS"],
      });

      // Upload Resume v1
      const resV1 = await request(app)
        .post("/api/v1/resumes/upload")
        .set("Cookie", getSessionCookie(candidate))
        .attach("resume", Buffer.from("Taylor Resume v1 with React and TypeScript", "utf-8"), "resume_v1.txt");

      const resumeV1Id = resV1.body.data.resume.id;

      // Apply with Resume v1
      const applyRes = await request(app)
        .post("/api/v1/applications/apply")
        .set("Cookie", getSessionCookie(candidate))
        .send({ jobId: job.id, resumeId: resumeV1Id });

      expect(applyRes.status).toBe(201);
      const originalSnapshot = applyRes.body.data.application.atsSnapshot;
      const originalAppId = applyRes.body.data.application.id;

      // Candidate uploads Resume v2 with enhanced skills
      const resV2 = await request(app)
        .post("/api/v1/resumes/upload")
        .set("Cookie", getSessionCookie(candidate))
        .attach(
          "resume",
          Buffer.from(
            "Taylor Resume v2: Expert React, TypeScript, Tailwind CSS with 5 years experience, B.S. in Computer Science.",
            "utf-8"
          ),
          "resume_v2.txt"
        );

      const resumeV2Id = resV2.body.data.resume.id;

      // Candidate runs a new ATS check on v2
      const checkV2Res = await request(app)
        .post("/api/v1/ats/analyze")
        .set("Cookie", getSessionCookie(candidate))
        .send({ jobId: job.id, resumeId: resumeV2Id });

      expect(checkV2Res.status).toBe(200);

      // Verify the application document in MongoDB has NOT mutated
      const appInDb = await Application.findById(originalAppId);
      expect(appInDb?.atsSnapshot?.overallScore).toBe(originalSnapshot.overallScore);
      expect(appInDb?.atsSnapshot?.resumeVersion).toBe(originalSnapshot.resumeVersion);
      expect(appInDb?.atsSnapshot?.breakdown).toEqual(originalSnapshot.breakdown);
      expect(appInDb?.resumeId?.toString()).toBe(resumeV1Id);
    });
  });

  describe("4. Provider Failure & Historical Rubric Compatibility", () => {
    it("handles missing AI providers with honest offline/deterministic status without fabricated inference", async () => {
      const candidate = await User.create({
        name: "Offline Candidate",
        email: "offline@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      const job = await Job.create({
        title: "Systems Engineer",
        department: "Infrastructure",
        location: "Remote",
        employmentType: "FullTime",
        status: "Open",
        ownerId: new mongoose.Types.ObjectId(),
        description: "Go, Linux, Docker.",
        requirements: ["Go", "Linux", "Docker"],
      });

      const uploadRes = await request(app)
        .post("/api/v1/resumes/upload")
        .set("Cookie", getSessionCookie(candidate))
        .attach("resume", Buffer.from("Systems dev with Go, Linux, Docker, Bachelor degree.", "utf-8"), "sys.txt");

      const resumeId = uploadRes.body.data.resume.id;

      // Direct service call
      const report = await atsReviewService.analyzeResumeAgainstJob({
        resumeId,
        jobId: job.id,
        candidateUserId: candidate.id,
      });

      // Provider status must accurately reflect the engine used, never fabricating unconfigured cloud AI
      expect(["deterministic_engine", "ollama", "heuristic_fallback"]).toContain(report.provider);
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);

      // Mathematical agreement check
      const calculated = calculateWeightedAtsScore(report.breakdown);
      expect(report.overallScore).toBe(calculated);
    });

    it("reads historical records with older rubric versions without crash or data corruption", async () => {
      const candidateUser = await User.create({
        name: "Legacy Candidate",
        email: "legacy@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      const resume = await ResumeFile.create({
        candidateUserId: candidateUser._id,
        originalFilename: "legacy_resume.pdf",
        storedFilename: "uuid-legacy.pdf",
        fileSizeBytes: 2048,
        mimeType: "application/pdf",
        storagePath: "/tmp/legacy.pdf",
        contentSha256: "legacyhash1234567890",
        parsedText: "Legacy candidate experience in Java and SQL.",
        parsingStatus: "completed",
      });

      const job = await Job.create({
        title: "Legacy Java Developer",
        department: "IT",
        location: "New York",
        employmentType: "FullTime",
        status: "Open",
        ownerId: new mongoose.Types.ObjectId(),
        description: "Java and SQL.",
        requirements: ["Java", "SQL"],
      });

      // Insert historical record created under rubric v1.0
      const historicalAnalysis = await AtsAnalysis.create({
        candidateUserId: candidateUser._id,
        resumeId: resume._id,
        resumeVersion: 1,
        jobId: job._id,
        overallScore: 78,
        breakdown: {
          skillsScore: 80,
          experienceScore: 75,
          educationScore: 80,
          roleRelevanceScore: 75,
        },
        requiredSkillsFound: ["Java", "SQL"],
        missingCriteria: [],
        confidence: "medium",
        summary: "Historical v1.0 assessment record.",
        provider: "ollama",
        model: "qwen2.5:7b",
        promptVersion: "v1.0",
        rubricVersion: "v1.0",
        status: "completed",
      });

      const historicalApp = await Application.create({
        candidateId: new mongoose.Types.ObjectId(),
        jobId: job._id,
        recruiterId: new mongoose.Types.ObjectId(),
        resumeId: resume._id,
        atsAnalysisId: historicalAnalysis._id,
        stage: "Applied",
        currentStage: "Applied",
        status: "Active",
        createdBy: candidateUser._id,
        updatedBy: candidateUser._id,
        atsSnapshot: {
          overallScore: 78,
          breakdown: {
            skillsScore: 80,
            experienceScore: 75,
            educationScore: 80,
            roleRelevanceScore: 75,
          },
          status: "completed",
          provider: "ollama",
          model: "qwen2.5:7b",
          rubricVersion: "v1.0",
          assessedAt: new Date("2026-09-01"),
        },
      });

      // Retrieve via Mongoose
      const retrievedAnalysis = await AtsAnalysis.findById(historicalAnalysis.id);
      expect(retrievedAnalysis?.rubricVersion).toBe("v1.0");
      expect(retrievedAnalysis?.overallScore).toBe(78);

      const retrievedApp = await Application.findById(historicalApp.id);
      expect(retrievedApp?.atsSnapshot?.rubricVersion).toBe("v1.0");
      expect(retrievedApp?.atsSnapshot?.overallScore).toBe(78);
      expect(retrievedApp?.atsSnapshot?.breakdown.skillsScore).toBe(80);
    });
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import express from "express";
import cookieParser from "cookie-parser";
import { createApp } from "../app.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/user.model.js";
import { Candidate } from "../models/candidate.model.js";
import { Job } from "../models/job.model.js";
import { Application } from "../models/application.model.js";
import { Note } from "../models/note.model.js";
import { Interview } from "../models/interview.model.js";
import { InterviewFeedback } from "../models/interviewFeedback.model.js";
import { InterviewStageHistory } from "../models/stageHistory.model.js";
import { requireAuth, requireRole, requireSelfOrRole } from "../middleware/auth.js";
import { errorHandler } from "../middleware/errorHandler.js";
import { signToken, AUTH_COOKIE_NAME } from "../utils/jwt.js";
import { runRoleMigration } from "../scripts/migrateRoles.js";

const TEST_DB_URI = "mongodb://localhost:27017/earlyai_ats_test";

describe("Phase B — Canonical RBAC & Candidate Profile Suite", { timeout: 15000 }, () => {
  let app: ReturnType<typeof createApp>;
  let testApp: express.Express;

  beforeAll(async () => {
    await connectDB(TEST_DB_URI);
    app = createApp();

    testApp = express();
    testApp.use(cookieParser());
    testApp.use(express.json());

    testApp.get(
      "/test-platform-manager-only",
      requireAuth,
      requireRole("platform_manager"),
      (_req, res) => {
        res.status(200).json({ success: true, message: "platform-manager-access-granted" });
      }
    );

    testApp.get(
      "/test-hiring-team-only",
      requireAuth,
      requireRole("hiring_team"),
      (_req, res) => {
        res.status(200).json({ success: true, message: "hiring-team-access-granted" });
      }
    );

    testApp.get(
      "/test-self-or-team/:userId",
      requireAuth,
      requireSelfOrRole("userId", "hiring_team"),
      (_req, res) => {
        res.status(200).json({ success: true, message: "self-or-team-access-granted" });
      }
    );

    testApp.use(errorHandler);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await disconnectDB();
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  const getSessionCookie = (user: { id: string; role: string }) => {
    const token = signToken({ id: user.id, role: user.role });
    return `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax`;
  };

  describe("1. Candidate Identity & Signup Protection", () => {
    it("allows candidate public registration with canonicalRole returned", async () => {
      const res = await request(app).post("/api/v1/auth/signup").send({
        name: "Carlos Candidate",
        email: "carlos@example.com",
        password: "CandidatePass1!",
        role: "candidate",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toMatchObject({
        name: "Carlos Candidate",
        email: "carlos@example.com",
        role: "candidate",
        canonicalRole: "candidate",
      });

      const dbUser = await User.findOne({ email: "carlos@example.com" });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.role).toBe("candidate");
    });

    it("strictly prevents privilege escalation when attempting to register as platform_manager", async () => {
      const res = await request(app).post("/api/v1/auth/signup").send({
        name: "Hacker Attempt",
        email: "hacker@example.com",
        password: "DangerousPass1!",
        role: "platform_manager",
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
      expect(res.body.error.message).toMatch(/Public registration is restricted to candidate accounts/i);

      const dbUser = await User.findOne({ email: "hacker@example.com" });
      expect(dbUser).toBeNull();
    });
  });

  describe("2. Candidate Profile Self-Service & Protection", () => {
    it("allows candidate to view and update their profile", async () => {
      const user = await User.create({
        name: "Elena Candidate",
        email: "elena@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
        headline: "Frontend Engineer",
        skills: ["React", "TypeScript"],
      });

      const cookie = getSessionCookie(user);

      // GET Profile
      const getRes = await request(app)
        .get("/api/v1/profile")
        .set("Cookie", cookie);

      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.user.headline).toBe("Frontend Engineer");
      expect(getRes.body.data.user.skills).toEqual(["React", "TypeScript"]);
      expect(getRes.body.data.user.canonicalRole).toBe("candidate");

      // PUT Profile
      const updateRes = await request(app)
        .put("/api/v1/profile")
        .set("Cookie", cookie)
        .send({
          headline: "Senior Frontend Engineer",
          bio: "5+ years of building web applications.",
          skills: ["React", "TypeScript", "Tailwind CSS"],
          role: "platform_manager", // Malicious field
          email: "hacked@example.com", // Protected field
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.user.headline).toBe("Senior Frontend Engineer");
      expect(updateRes.body.data.user.skills).toContain("Tailwind CSS");

      // Verify protected fields were NOT modified
      const dbUser = await User.findById(user.id);
      expect(dbUser?.role).toBe("candidate");
      expect(dbUser?.email).toBe("elena@example.com");
    });
  });

  describe("3. Server-Enforced RBAC & Backward Compatibility", () => {
    it("denies candidate access to hiring-team endpoints", async () => {
      const candidate = await User.create({
        name: "Test Candidate",
        email: "cand@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      const res = await request(testApp)
        .get("/test-hiring-team-only")
        .set("Cookie", getSessionCookie(candidate));

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("allows legacy recruiter and hiring_manager access to hiring_team endpoints", async () => {
      const recruiter = await User.create({
        name: "Legacy Recruiter",
        email: "rec@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "recruiter",
      });

      const res = await request(testApp)
        .get("/test-hiring-team-only")
        .set("Cookie", getSessionCookie(recruiter));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("hiring-team-access-granted");
    });

    it("allows legacy admin access to platform_manager endpoints", async () => {
      const admin = await User.create({
        name: "Legacy Admin",
        email: "admin@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "admin",
      });

      const res = await request(testApp)
        .get("/test-platform-manager-only")
        .set("Cookie", getSessionCookie(admin));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("platform-manager-access-granted");
    });

    it("enforces object-level authorization via requireSelfOrRole", async () => {
      const candidate1 = await User.create({
        name: "Cand 1",
        email: "c1@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      const candidate2 = await User.create({
        name: "Cand 2",
        email: "c2@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      // Candidate 1 accessing Candidate 1's resource: ALLOWED
      const resSelf = await request(testApp)
        .get(`/test-self-or-team/${candidate1.id}`)
        .set("Cookie", getSessionCookie(candidate1));
      expect(resSelf.status).toBe(200);

      // Candidate 1 accessing Candidate 2's resource: FORBIDDEN
      const resOther = await request(testApp)
        .get(`/test-self-or-team/${candidate2.id}`)
        .set("Cookie", getSessionCookie(candidate1));
      expect(resOther.status).toBe(403);
    });
  });

  describe("4. Idempotent Role Migration Preview & Execution", () => {
    it("runs dry-run without altering records, and executes safely", async () => {
      await User.create({
        name: "Legacy Admin User",
        email: "admin_mig@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "admin",
      });

      await User.create({
        name: "Legacy Recruiter User",
        email: "rec_mig@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "recruiter",
      });

      await User.create({
        name: "Already Canonical Candidate",
        email: "cand_mig@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      // 1. Dry run
      const drySummary = await runRoleMigration(true);
      expect(drySummary.dryRun).toBe(true);
      expect(drySummary.totalUsers).toBe(3);
      expect(drySummary.usersToMigrate).toBe(2);
      expect(drySummary.alreadyCanonical).toBe(1);

      // Verify no changes occurred during dry run
      const adminAfterDry = await User.findOne({ email: "admin_mig@example.com" });
      expect(adminAfterDry?.role).toBe("admin");

      // 2. Execute migration
      const execSummary = await runRoleMigration(false);
      expect(execSummary.dryRun).toBe(false);
      expect(execSummary.usersToMigrate).toBe(2);

      // Verify migrated roles in database
      const adminAfterExec = await User.findOne({ email: "admin_mig@example.com" });
      expect(adminAfterExec?.role).toBe("platform_manager");

      const recAfterExec = await User.findOne({ email: "rec_mig@example.com" });
      expect(recAfterExec?.role).toBe("hiring_team");

      // 3. Re-run execution (idempotency check)
      const rerunSummary = await runRoleMigration(false);
      expect(rerunSummary.usersToMigrate).toBe(0);
      expect(rerunSummary.alreadyCanonical).toBe(3);
    });
  });

  describe("5. Object-Level Access Control & Endpoint Protection (BUG-SEC-01 to BUG-SEC-08)", () => {
    it("proves RBAC & BOLA guards prevent cross-candidate access and candidate privilege bypass", async () => {
      // Setup Recruiter
      const recruiter = await User.create({
        name: "Recruiter One",
        email: "recruiter1@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "recruiter",
      });
      const recruiterCookie = getSessionCookie(recruiter);

      // Setup Candidate 1 User & Profile
      const candUser1 = await User.create({
        name: "Alice Candidate",
        email: "alice@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });
      const candProfile1 = await Candidate.create({
        name: "Alice Candidate",
        fullName: "Alice Candidate",
        email: "alice@example.com",
        experienceYears: 4,
        skills: ["Node.js", "TypeScript"],
        source: "JobBoard",
        createdBy: recruiter._id,
        updatedBy: recruiter._id,
      });
      candUser1.candidateProfileId = candProfile1._id;
      await candUser1.save();
      const candCookie1 = getSessionCookie(candUser1);

      // Setup Candidate 2 User & Profile (Attacker / Different Candidate)
      const candUser2 = await User.create({
        name: "Bob Candidate",
        email: "bob@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });
      const candProfile2 = await Candidate.create({
        name: "Bob Candidate",
        fullName: "Bob Candidate",
        email: "bob@example.com",
        experienceYears: 2,
        skills: ["Python"],
        source: "JobBoard",
        createdBy: recruiter._id,
        updatedBy: recruiter._id,
      });
      candUser2.candidateProfileId = candProfile2._id;
      await candUser2.save();
      const candCookie2 = getSessionCookie(candUser2);

      // Setup Job Opening
      const job = await Job.create({
        title: "Staff Backend Engineer",
        department: "Core Engineering",
        location: "Remote",
        employmentType: "FullTime",
        status: "Open",
        description: "Designing backend microservices",
        requirements: ["Node.js", "MongoDB", "TypeScript"],
        ownerId: recruiter._id,
      });

      // Setup Application for Alice (Candidate 1)
      const appAlice = await Application.create({
        candidateId: candProfile1._id,
        jobId: job._id,
        recruiterId: recruiter._id,
        stage: "Screening",
        currentStage: "Screening",
        status: "Active",
        appliedAt: new Date(),
        lastStageChangedAt: new Date(),
        createdBy: recruiter._id,
        updatedBy: recruiter._id,
        version: 0,
      });

      await InterviewStageHistory.create({
        applicationId: appAlice._id,
        fromStage: "Applied",
        toStage: "Screening",
        changedAt: new Date(),
        actorId: recruiter._id,
        reason: "Initial recruiter screen passed",
      });

      // Setup Recruiter Note for Alice
      const note = await Note.create({
        candidateId: candProfile1._id,
        authorId: recruiter._id,
        body: "Confidential recruiter note: strong candidate, salary expectation $160k.",
      });

      // Setup Interview for Alice
      const interview = await Interview.create({
        applicationId: appAlice.id,
        jobId: job.id,
        candidateUserId: candUser1.id,
        candidateId: candProfile1.id,
        organizerId: recruiter.id,
        interviewers: [{ name: "Lead Tech", email: "lead@example.com" }],
        title: "Technical Screen",
        scheduledStartTime: new Date(Date.now() + 86400000),
        scheduledEndTime: new Date(Date.now() + 90000000),
        timezone: "UTC",
        status: "scheduled",
        notes: "Confidential interview prep notes",
      });

      // Setup Feedback for Alice
      await InterviewFeedback.create({
        interviewId: interview.id,
        applicationId: appAlice.id,
        interviewerId: recruiter.id,
        interviewerName: recruiter.name,
        ratings: {
          technicalRating: 4,
          communicationRating: 4,
          problemSolvingRating: 4,
          cultureAndValuesRating: 5,
          overallRating: 4,
        },
        strengths: "Great architecture knowledge",
        concerns: "None",
        internalNotes: "Confidential hiring manager evaluation",
        candidateReleasableFeedback: "Approved constructive candidate summary",
        recommendation: "hire",
        isReleasedToCandidate: true,
      });

      // BUG-SEC-01 Regression: Candidate cannot read or delete recruiter notes
      const notesReadRes = await request(app)
        .get(`/api/v1/candidates/${candProfile1.id}/notes`)
        .set("Cookie", candCookie2);
      expect(notesReadRes.status).toBe(403);
      expect(notesReadRes.body.error.code).toBe("FORBIDDEN");

      const notesDeleteRes = await request(app)
        .delete(`/api/v1/notes/${note.id}`)
        .set("Cookie", candCookie2);
      expect(notesDeleteRes.status).toBe(403);

      const recruiterNotesRes = await request(app)
        .get(`/api/v1/candidates/${candProfile1.id}/notes`)
        .set("Cookie", recruiterCookie);
      expect(recruiterNotesRes.status).toBe(200);
      expect(recruiterNotesRes.body.data.notes.length).toBe(1);

      // BUG-SEC-02 Regression: Candidate 2 cannot read released feedback of Candidate 1
      const feedbackCrossRes = await request(app)
        .get(`/api/v1/feedback/application/${appAlice.id}`)
        .set("Cookie", candCookie2);
      expect(feedbackCrossRes.status).toBe(403);
      expect(feedbackCrossRes.body.error.code).toBe("FORBIDDEN");

      const feedbackOwnerRes = await request(app)
        .get(`/api/v1/feedback/application/${appAlice.id}`)
        .set("Cookie", candCookie1);
      expect(feedbackOwnerRes.status).toBe(200);
      expect(feedbackOwnerRes.body.data.feedbacks.length).toBe(1);
      expect(feedbackOwnerRes.body.data.feedbacks[0].feedback).toBe("Approved constructive candidate summary");

      // BUG-SEC-04 Regression: Candidate 2 cannot query Candidate 1's applications via candidateId param
      const appCrossQueryRes = await request(app)
        .get(`/api/v1/applications?candidateId=${candProfile1.id}`)
        .set("Cookie", candCookie2);
      expect(appCrossQueryRes.status).toBe(403);
      expect(appCrossQueryRes.body.error.code).toBe("FORBIDDEN");

      // BUG-SEC-05 Regression: Candidate 2 cannot read stage history of Candidate 1's application
      const stageHistoryCrossRes = await request(app)
        .get(`/api/v1/applications/${appAlice.id}/history`)
        .set("Cookie", candCookie2);
      expect(stageHistoryCrossRes.status).toBe(403);
      expect(stageHistoryCrossRes.body.error.code).toBe("FORBIDDEN");

      const stageHistoryOwnerRes = await request(app)
        .get(`/api/v1/applications/${appAlice.id}/history`)
        .set("Cookie", candCookie1);
      expect(stageHistoryOwnerRes.status).toBe(200);
      expect(stageHistoryOwnerRes.body.data.history.length).toBe(1);

      // BUG-SEC-06 Regression: Candidate cannot list candidate directory or inspect other candidate profile
      const listCandRes = await request(app)
        .get("/api/v1/candidates")
        .set("Cookie", candCookie2);
      expect(listCandRes.status).toBe(403);

      const otherCandRes = await request(app)
        .get(`/api/v1/candidates/${candProfile1.id}`)
        .set("Cookie", candCookie2);
      expect(otherCandRes.status).toBe(403);

      const selfCandRes = await request(app)
        .get(`/api/v1/candidates/${candProfile2.id}`)
        .set("Cookie", candCookie2);
      expect(selfCandRes.status).toBe(200);

      // BUG-SEC-07 Regression: Candidate 2 cannot inspect Candidate 1's scheduled interviews
      const interviewCrossRes = await request(app)
        .get(`/api/v1/interviews/application/${appAlice.id}`)
        .set("Cookie", candCookie2);
      expect(interviewCrossRes.status).toBe(403);
      expect(interviewCrossRes.body.error.code).toBe("FORBIDDEN");

      const interviewOwnerRes = await request(app)
        .get(`/api/v1/interviews/application/${appAlice.id}`)
        .set("Cookie", candCookie1);
      expect(interviewOwnerRes.status).toBe(200);
      expect(interviewOwnerRes.body.data.interviews.length).toBe(1);

      // BUG-SEC-08 Regression: Candidate cannot access executive analytics overview
      const analyticsRes = await request(app)
        .get("/api/v1/analytics/overview")
        .set("Cookie", candCookie2);
      expect(analyticsRes.status).toBe(403);
      expect(analyticsRes.body.error.code).toBe("FORBIDDEN");

      const recruiterAnalyticsRes = await request(app)
        .get("/api/v1/analytics/overview")
        .set("Cookie", recruiterCookie);
      expect(recruiterAnalyticsRes.status).toBe(200);
    });
  });
});

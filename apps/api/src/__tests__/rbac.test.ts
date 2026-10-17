import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import express from "express";
import cookieParser from "cookie-parser";
import { createApp } from "../app.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/user.model.js";
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

    it("prevents privilege escalation when attempting to register as platform_manager", async () => {
      const res = await request(app).post("/api/v1/auth/signup").send({
        name: "Hacker Attempt",
        email: "hacker@example.com",
        password: "DangerousPass1!",
        role: "platform_manager",
      });

      expect(res.status).toBe(201);
      // Public signup must coerce away from platform_manager
      expect(res.body.data.user.role).not.toBe("platform_manager");
      expect(res.body.data.user.role).toBe("recruiter");
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
});

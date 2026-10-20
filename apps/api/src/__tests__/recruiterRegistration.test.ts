import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import express from "express";
import cookieParser from "cookie-parser";
import { createApp } from "../app.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/user.model.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { errorHandler } from "../middleware/errorHandler.js";
import { AUTH_COOKIE_NAME, signToken } from "../utils/jwt.js";
import { env } from "../config/env.js";

const TEST_DB_URI = "mongodb://localhost:27017/earlyai_ats_test";

describe("EarlyAI ATS — Recruiter Registration, Role Persistence & RBAC Suite", { timeout: 20000 }, () => {
  let app: ReturnType<typeof createApp>;
  let testApp: express.Express;

  beforeAll(async () => {
    await connectDB(TEST_DB_URI);
    app = createApp();

    testApp = express();
    testApp.use(cookieParser());
    testApp.use(express.json());

    // Protected recruiter endpoint for testing
    testApp.get(
      "/test/recruiter-only",
      requireAuth,
      requireRole("hiring_team"),
      (_req, res) => {
        res.status(200).json({ success: true, message: "recruiter-access-granted" });
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

  it("1. Candidate signup creates canonical candidate role and is immediately active", async () => {
    const res = await request(app).post("/api/v1/auth/signup").send({
      name: "Candidate Test User",
      email: "candidate.test@example.com",
      password: "CandidatePass123!",
      role: "candidate",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe("candidate");
    expect(res.body.data.user.canonicalRole).toBe("candidate");
    expect(res.body.data.user.approvalStatus).toBe("approved");

    // Persisted correctly in database
    const dbUser = await User.findOne({ email: "candidate.test@example.com" });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.role).toBe("candidate");
    expect(dbUser?.approvalStatus).toBe("approved");
  });

  it("2. Recruiter signup without invite code creates hiring_team role with pending approval status", async () => {
    const res = await request(app).post("/api/v1/auth/signup/recruiter").send({
      name: "Recruiter Pending",
      email: "recruiter.pending@company.corp",
      password: "RecruiterPass123!",
      company: "Acme Recruitment Inc",
      department: "Engineering Talent",
      phone: "+1-555-019-2834",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requiresApproval).toBe(true);
    expect(res.body.data.user.role).toBe("hiring_team");
    expect(res.body.data.user.canonicalRole).toBe("hiring_team");
    expect(res.body.data.user.approvalStatus).toBe("pending");
    expect(res.body.data.user.company).toBe("Acme Recruitment Inc");
    expect(res.body.data.user.department).toBe("Engineering Talent");

    // Check DB persistence
    const dbUser = await User.findOne({ email: "recruiter.pending@company.corp" });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.role).toBe("hiring_team");
    expect(dbUser?.approvalStatus).toBe("pending");
    expect(dbUser?.company).toBe("Acme Recruitment Inc");
  });

  it("3. Recruiter signup with valid invite code grants immediate approved status", async () => {
    const res = await request(app).post("/api/v1/auth/signup/recruiter").send({
      name: "Invited Recruiter",
      email: "invited.recruiter@company.corp",
      password: "RecruiterPass123!",
      company: "Enterprise Hiring Partners",
      inviteCode: env.RECRUITER_INVITE_CODE,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requiresApproval).toBe(false);
    expect(res.body.data.user.role).toBe("hiring_team");
    expect(res.body.data.user.approvalStatus).toBe("approved");

    const dbUser = await User.findOne({ email: "invited.recruiter@company.corp" });
    expect(dbUser?.approvalStatus).toBe("approved");
  });

  it("4. Recruiter signup rejects missing required fields such as company name", async () => {
    const res = await request(app).post("/api/v1/auth/signup/recruiter").send({
      name: "Missing Company Recruiter",
      email: "missing.co@company.corp",
      password: "RecruiterPass123!",
      // company missing
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("5. Public candidate signup cannot forge recruiter or admin role", async () => {
    const res = await request(app).post("/api/v1/auth/signup").send({
      name: "Escalation Attacker",
      email: "attacker@exploit.corp",
      password: "HackerPass123!",
      role: "admin",
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/candidate/i);

    // Verify user was NOT saved
    const attacker = await User.findOne({ email: "attacker@exploit.corp" });
    expect(attacker).toBeNull();
  });

  it("6. Recruiter signup endpoint cannot be used to forge platform_manager or admin role", async () => {
    const res = await request(app).post("/api/v1/auth/signup/recruiter").send({
      name: "Admin Forger",
      email: "forger@admin.corp",
      password: "AdminPass123!",
      company: "Fake Org",
      role: "admin",
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);

    const forger = await User.findOne({ email: "forger@admin.corp" });
    expect(forger).toBeNull();
  });

  it("7. Recruiter login returns correct role, company, and approval status", async () => {
    // Create recruiter
    await request(app).post("/api/v1/auth/signup/recruiter").send({
      name: "Login Recruiter",
      email: "login.recruiter@corp.com",
      password: "RecruiterPass123!",
      company: "Global Talent Corp",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "login.recruiter@corp.com",
      password: "RecruiterPass123!",
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.role).toBe("hiring_team");
    expect(loginRes.body.data.user.canonicalRole).toBe("hiring_team");
    expect(loginRes.body.data.user.approvalStatus).toBe("pending");
    expect(loginRes.body.data.user.company).toBe("Global Talent Corp");
  });

  it("8. Pending recruiter is blocked from protected recruiter operations with 403 Forbidden", async () => {
    const signupRes = await request(app).post("/api/v1/auth/signup/recruiter").send({
      name: "Pending Access User",
      email: "pending.access@corp.com",
      password: "RecruiterPass123!",
      company: "Corp",
    });

    const cookie = signupRes.headers["set-cookie"]?.[0];
    expect(cookie).toBeDefined();

    // Try to access protected recruiter endpoint
    const accessRes = await request(testApp)
      .get("/test/recruiter-only")
      .set("Cookie", cookie);

    expect(accessRes.status).toBe(403);
    expect(accessRes.body.error.message).toMatch(/pending administrator approval/i);
  });

  it("9. Authorized platform manager can activate pending recruiter", async () => {
    // 1. Create platform manager
    const adminUser = await User.create({
      name: "Admin User",
      email: "admin.super@earlyhire.corp",
      passwordHash: "$2a$12$e80yq7K2K2y9N7Z...",
      role: "platform_manager",
      approvalStatus: "approved",
    });

    const adminToken = signToken({
      id: adminUser.id,
      role: adminUser.role,
    });
    const adminCookie = `${AUTH_COOKIE_NAME}=${adminToken}`;

    // 2. Create pending recruiter
    const recruiter = await User.create({
      name: "Pending Recruiter To Approve",
      email: "to.approve@hiring.corp",
      passwordHash: "$2a$12$e80yq7K2K2y9N7Z...",
      company: "Tech Recruiting",
      role: "hiring_team",
      approvalStatus: "pending",
    });

    // 3. Platform manager approves recruiter
    const approveRes = await request(app)
      .patch(`/api/v1/platform/users/${recruiter.id}/approval`)
      .set("Cookie", adminCookie)
      .send({ approvalStatus: "approved" });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.user.approvalStatus).toBe("approved");

    // 4. Verify in DB
    const updatedRecruiter = await User.findById(recruiter.id);
    expect(updatedRecruiter?.approvalStatus).toBe("approved");

    // 5. Now the recruiter can access protected recruiter endpoint
    const recruiterToken = signToken({
      id: recruiter.id,
      role: recruiter.role,
    });
    const recruiterCookie = `${AUTH_COOKIE_NAME}=${recruiterToken}`;

    const accessRes = await request(testApp)
      .get("/test/recruiter-only")
      .set("Cookie", recruiterCookie);

    expect(accessRes.status).toBe(200);
    expect(accessRes.body.message).toBe("recruiter-access-granted");
  });

  it("10. Candidate cannot access recruiter-only endpoint", async () => {
    const candidate = await User.create({
      name: "Candidate Boundary User",
      email: "boundary.cand@example.com",
      passwordHash: "$2a$12$e80yq7K2K2y9N7Z...",
      role: "candidate",
      approvalStatus: "approved",
    });

    const token = signToken({
      id: candidate.id,
      role: candidate.role,
    });
    const cookie = `${AUTH_COOKIE_NAME}=${token}`;

    const res = await request(testApp)
      .get("/test/recruiter-only")
      .set("Cookie", cookie);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/insufficient permissions/i);
  });

  it("11. Session restoration (/me) returns canonical database role and approval status", async () => {
    const recruiter = await User.create({
      name: "Session Recruiter",
      email: "session.recruiter@talent.corp",
      passwordHash: "$2a$12$e80yq7K2K2y9N7Z...",
      company: "Modern Talent Ltd",
      department: "Tech Recruiting",
      role: "hiring_team",
      approvalStatus: "pending",
    });

    const token = signToken({
      id: recruiter.id,
      role: recruiter.role,
    });
    const cookie = `${AUTH_COOKIE_NAME}=${token}`;

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({
      name: "Session Recruiter",
      email: "session.recruiter@talent.corp",
      role: "hiring_team",
      canonicalRole: "hiring_team",
      approvalStatus: "pending",
      company: "Modern Talent Ltd",
      department: "Tech Recruiting",
    });
  });

  it("12. Duplicate email registration returns 409 Conflict error with clear message", async () => {
    await request(app).post("/api/v1/auth/signup/recruiter").send({
      name: "Original Recruiter",
      email: "duplicate@talent.corp",
      password: "RecruiterPass123!",
      company: "Talent Corp",
    });

    const duplicateRes = await request(app).post("/api/v1/auth/signup/recruiter").send({
      name: "Copy Recruiter",
      email: "duplicate@talent.corp",
      password: "DifferentPass123!",
      company: "Another Corp",
    });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.success).toBe(false);
    expect(duplicateRes.body.error.message).toMatch(/already exists/i);
  });
});

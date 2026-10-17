import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createApp } from "../app.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { User, UserRole } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { Candidate } from "../models/candidate.model.js";
import { Note } from "../models/note.model.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { errorHandler } from "../middleware/errorHandler.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { AUTH_COOKIE_NAME, signToken } from "../utils/jwt.js";
import { env } from "../config/env.js";

const TEST_DB_URI = "mongodb://localhost:27017/earlyai_ats_test";

describe("Phase 9 — Final Security Audit & Penetration Testing Suite", { timeout: 25000 }, () => {
  let app: ReturnType<typeof createApp>;
  let rbacApp: express.Express;

  beforeAll(async () => {
    await connectDB(TEST_DB_URI);
    app = createApp();

    // Isolated test app for explicit RBAC role boundary checks
    rbacApp = express();
    rbacApp.use(cookieParser());
    rbacApp.use(express.json());

    rbacApp.get(
      "/admin-action",
      requireAuth,
      requireRole("admin"),
      (_req: Request, res: Response) => {
        res.status(200).json({ success: true, message: "admin-granted" });
      }
    );

    rbacApp.get(
      "/recruiter-action",
      requireAuth,
      requireRole("recruiter", "admin"),
      (_req: Request, res: Response) => {
        res.status(200).json({ success: true, message: "recruiter-granted" });
      }
    );

    rbacApp.use(errorHandler);
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
    await Candidate.deleteMany({});
    await Note.deleteMany({});
  });

  // Helper to create verified test user
  const createTestUser = async (role: UserRole = "recruiter", isActive = true) => {
    const passwordHash = await bcrypt.hash("Secur3P@ssw0rd!", 10);
    return User.create({
      name: `Test ${role}`,
      email: `${role}-${Date.now()}@test.com`,
      passwordHash,
      role,
      isActive,
    });
  };

  // Helper to generate a session cookie string
  const getSessionCookie = (user: { id: string; role: UserRole }): string => {
    const token = signToken({ id: user.id, role: user.role });
    return `${AUTH_COOKIE_NAME}=${token}`;
  };

  // =========================================================================
  // GATE 1 — Authentication and Session Security
  // =========================================================================
  describe("Gate 1: Authentication and Session Security", () => {
    it("1.1 rejects missing authentication cookie with 401 UNAUTHENTICATED", async () => {
      const res = await request(app).get("/api/v1/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("1.2 rejects malformed JWT string with 401 UNAUTHENTICATED", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", `${AUTH_COOKIE_NAME}=malformed.jwt.token`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("1.3 rejects JWT signed with an invalid/untrusted secret key", async () => {
      const untrustedToken = jwt.sign(
        { id: new mongoose.Types.ObjectId().toString(), role: "recruiter" },
        "wrong_attacker_secret_key_1234567890"
      );
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", `${AUTH_COOKIE_NAME}=${untrustedToken}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("1.4 rejects JWT with 'none' algorithm header (algorithm confusion protection)", async () => {
      // Create a token with alg: none
      const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
      const payload = Buffer.from(
        JSON.stringify({ id: new mongoose.Types.ObjectId().toString(), role: "admin" })
      ).toString("base64url");
      const noneToken = `${header}.${payload}.`;

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", `${AUTH_COOKIE_NAME}=${noneToken}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("1.5 rejects expired JWT session token with 401 UNAUTHENTICATED", async () => {
      const expiredToken = jwt.sign(
        { id: new mongoose.Types.ObjectId().toString(), role: "recruiter" },
        env.JWT_SECRET,
        { expiresIn: "0s" } // immediately expired
      );

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", `${AUTH_COOKIE_NAME}=${expiredToken}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("1.6 rejects login with wrong password using generic error (prevents credential timing leak)", async () => {
      const user = await createTestUser("recruiter");
      const res = await request(app).post("/api/v1/auth/login").send({
        email: user.email,
        password: "WrongPassword999!",
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(res.body.error.message).toBe("Invalid email or password");
    });

    it("1.7 rejects login for unknown email using same generic error (prevents user enumeration)", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "nonexistent-user@example.com",
        password: "SomePassword123!",
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(res.body.error.message).toBe("Invalid email or password");
    });

    it("1.8 rejects deactivated/inactive user accounts with 403 FORBIDDEN", async () => {
      const inactiveUser = await createTestUser("recruiter", false);
      const res = await request(app).post("/api/v1/auth/login").send({
        email: inactiveUser.email,
        password: "Secur3P@ssw0rd!",
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("1.9 enforces password complexity rules on registration (Zod validation)", async () => {
      // Under 8 chars
      const resShort = await request(app).post("/api/v1/auth/signup").send({
        name: "Test User",
        email: "test-short@example.com",
        password: "Pass1",
      });
      expect(resShort.status).toBe(422);

      // No number
      const resNoNum = await request(app).post("/api/v1/auth/signup").send({
        name: "Test User",
        email: "test-nonum@example.com",
        password: "PasswordOnly",
      });
      expect(resNoNum.status).toBe(422);

      // No uppercase
      const resNoUpper = await request(app).post("/api/v1/auth/signup").send({
        name: "Test User",
        email: "test-noupper@example.com",
        password: "password123!",
      });
      expect(resNoUpper.status).toBe(422);
    });

    it("1.10 rejects duplicate email registrations with 409 EMAIL_EXISTS", async () => {
      const email = "duplicate-test@example.com";
      await request(app).post("/api/v1/auth/signup").send({
        name: "First Account",
        email,
        password: "StrongPassword1!",
      });

      const resDup = await request(app).post("/api/v1/auth/signup").send({
        name: "Second Account",
        email,
        password: "StrongPassword2!",
      });

      expect(resDup.status).toBe(409);
      expect(resDup.body.error.code).toBe("EMAIL_EXISTS");
    });

    it("1.11 public signup strictly forces recruiter role and ignores client-supplied 'admin'", async () => {
      const res = await request(app).post("/api/v1/auth/signup").send({
        name: "Privilege Escalation Attempt",
        email: "privilege@example.com",
        password: "StrongPassword1!",
        role: "admin", // Malicious attempt to elevate role
      });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe("recruiter"); // Role strictly forced to recruiter

      const dbUser = await User.findOne({ email: "privilege@example.com" });
      expect(dbUser?.role).toBe("recruiter");
    });

    it("1.12 logout clears the session cookie with matching attributes", async () => {
      const user = await createTestUser("recruiter");
      const cookie = getSessionCookie(user);

      const res = await request(app).post("/api/v1/auth/logout").set("Cookie", cookie);
      expect(res.status).toBe(200);
      expect(res.body.data.loggedOut).toBe(true);

      const setCookie = res.headers["set-cookie"]?.[0] || "";
      expect(setCookie).toContain(`${AUTH_COOKIE_NAME}=;`);
      expect(setCookie.toLowerCase()).toContain("httponly");
    });

    it("1.13 password is encrypted with bcrypt and never returned in user payloads", async () => {
      const res = await request(app).post("/api/v1/auth/signup").send({
        name: "Hash Verifier",
        email: "hash-verify@example.com",
        password: "StrongPassword1!",
      });

      expect(res.status).toBe(201);
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.user.password).toBeUndefined();

      const user = await User.findOne({ email: "hash-verify@example.com" }).select("+passwordHash");
      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).toMatch(/^\$2[aby]\$\d+\$/); // Valid bcrypt hash prefix
      expect(user?.passwordHash).not.toBe("StrongPassword1!");
    });
  });

  // =========================================================================
  // GATE 2 — Authorization, RBAC, and Object-Level Access
  // =========================================================================
  describe("Gate 2: Authorization, RBAC, and Object-Level Access", () => {
    it("2.1 recruiter role is blocked from admin-only endpoints with 403 FORBIDDEN", async () => {
      const recruiter = await createTestUser("recruiter");
      const cookie = getSessionCookie(recruiter);

      const res = await request(rbacApp).get("/admin-action").set("Cookie", cookie);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("2.2 admin role is authorized to access admin-only endpoints", async () => {
      const admin = await createTestUser("admin");
      const cookie = getSessionCookie(admin);

      const res = await request(rbacApp).get("/admin-action").set("Cookie", cookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("2.3 recruiter cannot soft-delete another recruiter's note (object-level access control)", async () => {
      const author = await createTestUser("recruiter");
      const otherRecruiter = await createTestUser("recruiter");

      const candidate = await Candidate.create({
        name: "Test Candidate",
        fullName: "Test Candidate",
        email: "candidate@test.com",
        source: "Referral",
        createdBy: author._id,
        updatedBy: author._id,
      });

      const note = await Note.create({
        candidateId: candidate._id,
        authorId: author._id,
        body: "Author confidential feedback",
      });

      // Other recruiter attempts to delete note
      const res = await request(app)
        .delete(`/api/v1/notes/${note._id}`)
        .set("Cookie", getSessionCookie(otherRecruiter));

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");

      // Verify note was not soft-deleted
      const stillActive = await Note.findById(note._id);
      expect(stillActive?.deletedAt).toBeNull();
    });

    it("2.4 admin role can soft-delete any recruiter's note", async () => {
      const author = await createTestUser("recruiter");
      const admin = await createTestUser("admin");

      const candidate = await Candidate.create({
        name: "Candidate Two",
        fullName: "Candidate Two",
        email: "candidate2@test.com",
        source: "CompanyWebsite",
        createdBy: author._id,
        updatedBy: author._id,
      });

      const note = await Note.create({
        candidateId: candidate._id,
        authorId: author._id,
        body: "Note to be deleted by admin",
      });

      const res = await request(app)
        .delete(`/api/v1/notes/${note._id}`)
        .set("Cookie", getSessionCookie(admin));

      expect(res.status).toBe(200);
      expect(res.body.data.deletedAt).toBeDefined();

      const deleted = await Note.findById(note._id);
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it("2.5 unauthenticated requests to protected endpoints return 401 across all resource families", async () => {
      const endpoints = [
        { method: "get", path: "/api/v1/jobs" },
        { method: "get", path: "/api/v1/candidates" },
        { method: "get", path: "/api/v1/applications" },
        { method: "get", path: "/api/v1/analytics/overview" },
        { method: "post", path: "/api/v1/jobs" },
        { method: "post", path: "/api/v1/candidates" },
        { method: "post", path: "/api/v1/applications" },
      ];

      for (const ep of endpoints) {
        const agent = request(app) as unknown as Record<string, (url: string) => request.Test>;
        const res = await agent[ep.method](ep.path);
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe("UNAUTHENTICATED");
      }
    });
  });

  // =========================================================================
  // GATE 3 — CSRF, CORS, and Cookie Configuration
  // =========================================================================
  describe("Gate 3: CSRF, CORS, and Cookie Configuration", () => {
    it("3.1 state-changing requests with forged/disallowed Origin header are blocked with 403", async () => {
      const user = await createTestUser("recruiter");
      const cookie = getSessionCookie(user);

      const res = await request(app)
        .post("/api/v1/candidates")
        .set("Cookie", cookie)
        .set("Origin", "https://malicious-phishing-site.attacker.com")
        .send({
          name: "CSRF Attacker Candidate",
          email: "csrf@attacker.com",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("CSRF_FORBIDDEN");
    });

    it("3.2 state-changing requests with matching allowed Origin header succeed", async () => {
      const user = await createTestUser("recruiter");
      const cookie = getSessionCookie(user);

      const res = await request(app)
        .post("/api/v1/candidates")
        .set("Cookie", cookie)
        .set("Origin", env.CLIENT_URL)
        .send({
          name: "Legitimate Candidate",
          email: "legit@candidate.com",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("3.3 safe read requests (GET) are not blocked by CSRF Origin verification", async () => {
      const user = await createTestUser("recruiter");
      const cookie = getSessionCookie(user);

      const res = await request(app)
        .get("/api/v1/candidates")
        .set("Cookie", cookie)
        .set("Origin", "https://any-external-domain.com");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // =========================================================================
  // GATE 4 — Input Validation and Injection Resistance
  // =========================================================================
  describe("Gate 4: Input Validation and Injection Resistance", () => {
    it("4.1 rejects NoSQL operator injection in request body with 422 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: { $gt: "" }, // NoSQL operator injection attack
          password: "Password123!",
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("4.2 rejects NoSQL operator injection in query parameters with 422 VALIDATION_ERROR", async () => {
      const user = await createTestUser("recruiter");
      const cookie = getSessionCookie(user);

      const res = await request(app)
        .get("/api/v1/jobs?status[$ne]=Closed")
        .set("Cookie", cookie);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("4.3 returns 400 INVALID_ID on malformed MongoDB ObjectId parameters", async () => {
      const user = await createTestUser("recruiter");
      const cookie = getSessionCookie(user);

      const res = await request(app)
        .get("/api/v1/candidates/not-a-valid-mongo-id-12345")
        .set("Cookie", cookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_ID");
    });

    it("4.4 returns 404 CANDIDATE_NOT_FOUND on valid format but nonexistent ObjectId", async () => {
      const user = await createTestUser("recruiter");
      const cookie = getSessionCookie(user);
      const randomValidId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .get(`/api/v1/candidates/${randomValidId}`)
        .set("Cookie", cookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("CANDIDATE_NOT_FOUND");
    });

    it("4.5 safely handles regex metacharacters in search queries without ReDoS", async () => {
      const user = await createTestUser("recruiter");
      const cookie = getSessionCookie(user);

      // Dangerous ReDoS payloads and regex metacharacters
      const payloads = [
        ".*",
        "(a+)+",
        "[[[",
        "(.*a){10}",
        "^.*$*+",
      ];

      for (const payload of payloads) {
        const res = await request(app)
          .get(`/api/v1/candidates?search=${encodeURIComponent(payload)}`)
          .set("Cookie", cookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      }
    });

    it("4.6 candidate notes reject executable script tags and store markup as plain text", async () => {
      const user = await createTestUser("recruiter");
      const cookie = getSessionCookie(user);

      const candidate = await Candidate.create({
        name: "XSS Candidate",
        fullName: "XSS Candidate",
        email: "xss@example.com",
        source: "Referral",
        createdBy: user._id,
        updatedBy: user._id,
      });

      // 1. Executable <script> tags are strictly rejected by Zod schema
      const scriptPayload = "<script>alert('xss-attack')</script>";
      const resScript = await request(app)
        .post(`/api/v1/candidates/${candidate._id}/notes`)
        .set("Cookie", cookie)
        .send({ body: scriptPayload });

      expect(resScript.status).toBe(422);
      expect(resScript.body.error.code).toBe("VALIDATION_ERROR");

      // 2. Harmless markup / text is stored safely as plain text without execution
      const textPayload = "Candidate demonstrated <b>exceptional</b> TypeScript proficiency.";
      const resSafe = await request(app)
        .post(`/api/v1/candidates/${candidate._id}/notes`)
        .set("Cookie", cookie)
        .send({ body: textPayload });

      expect(resSafe.status).toBe(201);
      expect(resSafe.body.data.note.body).toBe(textPayload);

      // Verify stored data is unchanged literal string
      const getRes = await request(app)
        .get(`/api/v1/candidates/${candidate._id}/notes`)
        .set("Cookie", cookie);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.notes[0].body).toBe(textPayload);
    });
  });

  // =========================================================================
  // GATE 5 — Abuse Controls and Operational Security
  // =========================================================================
  describe("Gate 5: Abuse Controls and Operational Security", () => {
    it("5.1 rate limiter throttles excessive requests with 429 TOO_MANY_REQUESTS", async () => {
      // Test isolated rate limiter with strict 3-request limit
      const testLimiter = createRateLimiter({
        windowMs: 5000,
        maxRequests: 3,
        message: "Rate limit exceeded for test.",
      });

      const rateApp = express();
      rateApp.use(testLimiter);
      rateApp.get("/rate-test", (_req, res) => res.status(200).json({ ok: true }));

      // Requests 1, 2, 3 should succeed
      const res1 = await request(rateApp).get("/rate-test");
      expect(res1.status).toBe(200);
      expect(res1.headers["x-ratelimit-remaining"]).toBe("2");

      const res2 = await request(rateApp).get("/rate-test");
      expect(res2.status).toBe(200);
      expect(res2.headers["x-ratelimit-remaining"]).toBe("1");

      const res3 = await request(rateApp).get("/rate-test");
      expect(res3.status).toBe(200);
      expect(res3.headers["x-ratelimit-remaining"]).toBe("0");

      // Request 4 should be throttled
      const res4 = await request(rateApp).get("/rate-test");
      expect(res4.status).toBe(429);
      expect(res4.body.error.code).toBe("TOO_MANY_REQUESTS");
      expect(res4.headers["retry-after"]).toBeDefined();
    });

    it("5.2 rejects oversized request payloads exceeding body parser limit", async () => {
      // 1MB is limit; create a payload slightly over 1MB
      const hugePayload = {
        name: "Giant Payload",
        email: "giant@example.com",
        data: "X".repeat(1.2 * 1024 * 1024),
      };

      const res = await request(app)
        .post("/api/v1/auth/signup")
        .send(hugePayload);

      // Express body-parser rejects with 413 Payload Too Large
      expect(res.status).toBe(413);
    });
  });
});

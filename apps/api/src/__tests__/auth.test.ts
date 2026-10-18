import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { createApp } from "../app.js";
import { connectDB, disconnectDB, sanitizeMongoUri, isSafeTestUri, isSafeLocalTestDatabase } from "../config/db.js";
import { User } from "../models/user.model.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { errorHandler } from "../middleware/errorHandler.js";
import { getAuthCookieOptions, AUTH_COOKIE_NAME } from "../utils/jwt.js";
import { env } from "../config/env.js";

const TEST_DB_URI = "mongodb://localhost:27017/earlyai_ats_test";

describe("Phase 2 — Auth & MongoDB Integration Test Suite", { timeout: 15000 }, () => {
  let app: ReturnType<typeof createApp>;
  let testApp: express.Express;

  beforeAll(async () => {
    // Connect to dedicated, isolated test database
    await connectDB(TEST_DB_URI);

    app = createApp();

    // Isolated test app for modular middleware and RBAC testing
    testApp = express();
    testApp.use(cookieParser());
    testApp.use(express.json());

    testApp.get(
      "/test-admin-only",
      requireAuth,
      requireRole("admin"),
      (_req, res) => {
        res.status(200).json({ success: true, message: "admin-access-granted" });
      }
    );

    testApp.get(
      "/test-recruiter-allowed",
      requireAuth,
      requireRole("recruiter", "admin"),
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

  // 1. Successful signup
  it("Scenario 1: creates a new recruiter account on valid signup", async () => {
    const res = await request(app).post("/api/v1/auth/signup").send({
      name: "Asha Recruiter",
      email: "asha@example.com",
      password: "StrongPass!234",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({
      name: "Asha Recruiter",
      email: "asha@example.com",
      role: "recruiter",
    });
    expect(res.body.data.user.id).toBeDefined();

    // Verify session cookie was set
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(new RegExp(`${AUTH_COOKIE_NAME}=`));
    expect(cookies[0]).toMatch(/HttpOnly/i);
    expect(cookies[0]).toMatch(/SameSite=Lax/i);
  });

  // 2. Email normalization
  it("Scenario 2: normalizes email addresses by trimming and lowercasing", async () => {
    const res = await request(app).post("/api/v1/auth/signup").send({
      name: "Normalized User",
      email: "   NORM.User@EXAMPLE.COM   ",
      password: "StrongPass!234",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe("norm.user@example.com");

    const userInDb = await User.findOne({ email: "norm.user@example.com" });
    expect(userInDb).not.toBeNull();
    expect(userInDb?.email).toBe("norm.user@example.com");
  });

  // 3. Password hashing and exclusion from API responses
  it("Scenario 3: hashes passwords with bcrypt and excludes hashes from responses", async () => {
    const rawPassword = "StrongPass!234";
    const res = await request(app).post("/api/v1/auth/signup").send({
      name: "Secure User",
      email: "secure@example.com",
      password: rawPassword,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user).not.toHaveProperty("password");
    expect(res.body.data.user).not.toHaveProperty("passwordHash");

    const userInDb = await User.findOne({ email: "secure@example.com" }).select("+passwordHash");
    expect(userInDb?.passwordHash).toBeDefined();
    expect(userInDb?.passwordHash).not.toBe(rawPassword);
    expect(userInDb?.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  // 4. Duplicate email rejection
  it("Scenario 4: rejects duplicate email signups with 409 Conflict", async () => {
    await request(app).post("/api/v1/auth/signup").send({
      name: "First Recruiter",
      email: "duplicate@example.com",
      password: "StrongPass!234",
    });

    const res = await request(app).post("/api/v1/auth/signup").send({
      name: "Second Recruiter",
      email: "DUPLICATE@EXAMPLE.COM",
      password: "AnotherStrongPass!567",
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("EMAIL_EXISTS");
  });

  // 5. Missing or invalid signup fields
  it("Scenario 5: rejects missing or invalid signup fields with 422 VALIDATION_ERROR", async () => {
    // Missing email
    const resMissingEmail = await request(app).post("/api/v1/auth/signup").send({
      name: "No Email",
      password: "StrongPass!234",
    });
    expect(resMissingEmail.status).toBe(422);
    expect(resMissingEmail.body.error.code).toBe("VALIDATION_ERROR");

    // Invalid email format
    const resInvalidEmail = await request(app).post("/api/v1/auth/signup").send({
      name: "Bad Email",
      email: "not-an-email",
      password: "StrongPass!234",
    });
    expect(resInvalidEmail.status).toBe(422);

    // Weak password (< 8 chars)
    const resShortPass = await request(app).post("/api/v1/auth/signup").send({
      name: "Short Pass",
      email: "short@example.com",
      password: "Short1!",
    });
    expect(resShortPass.status).toBe(422);

    // Missing uppercase in password
    const resNoUpper = await request(app).post("/api/v1/auth/signup").send({
      name: "No Upper",
      email: "noupper@example.com",
      password: "strongpass123!",
    });
    expect(resNoUpper.status).toBe(422);

    // Missing number in password
    const resNoNumber = await request(app).post("/api/v1/auth/signup").send({
      name: "No Number",
      email: "nonumber@example.com",
      password: "StrongPassword!",
    });
    expect(resNoNumber.status).toBe(422);
  });

  // 6. Login with valid credentials
  it("Scenario 6: successfully authenticates with valid credentials", async () => {
    await request(app).post("/api/v1/auth/signup").send({
      name: "Login User",
      email: "login@example.com",
      password: "StrongPass!234",
    });

    const res = await request(app).post("/api/v1/auth/login").send({
      email: "login@example.com",
      password: "StrongPass!234",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("login@example.com");

    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(new RegExp(`${AUTH_COOKIE_NAME}=`));
  });

  // 7. Login with incorrect credentials
  it("Scenario 7: returns generic 401 error for incorrect credentials", async () => {
    await request(app).post("/api/v1/auth/signup").send({
      name: "Target User",
      email: "target@example.com",
      password: "StrongPass!234",
    });

    // Wrong password
    const resWrongPass = await request(app).post("/api/v1/auth/login").send({
      email: "target@example.com",
      password: "IncorrectPassword!999",
    });
    expect(resWrongPass.status).toBe(401);
    expect(resWrongPass.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(resWrongPass.body.error.message).toBe("Invalid email or password");

    // Non-existent email
    const resWrongEmail = await request(app).post("/api/v1/auth/login").send({
      email: "unknown@example.com",
      password: "StrongPass!234",
    });
    expect(resWrongEmail.status).toBe(401);
    expect(resWrongEmail.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(resWrongEmail.body.error.message).toBe("Invalid email or password");
  });

  // 8. Cookie HttpOnly, SameSite, and production Secure settings
  it("Scenario 8: verifies cookie security attributes and production Secure flag helper", () => {
    const devOptions = getAuthCookieOptions();
    expect(devOptions.httpOnly).toBe(true);
    expect(devOptions.sameSite).toBe("lax");
    expect(devOptions.path).toBe("/");
    expect(devOptions.maxAge).toBe(7 * 24 * 60 * 60 * 1000);

    // Test production flag
    const originalEnv = env.NODE_ENV;
    try {
      (env as { NODE_ENV: string }).NODE_ENV = "production";
      const prodOptions = getAuthCookieOptions();
      expect(prodOptions.secure).toBe(true);
    } finally {
      (env as { NODE_ENV: string }).NODE_ENV = originalEnv;
    }
  });

  // 9. Current-user endpoint with a valid session
  it("Scenario 9: returns current authenticated user profile with a valid session cookie", async () => {
    const signupRes = await request(app).post("/api/v1/auth/signup").send({
      name: "Session User",
      email: "session@example.com",
      password: "StrongPass!234",
    });

    const cookieHeader = signupRes.headers["set-cookie"][0].split(";")[0];

    const meRes = await request(app).get("/api/v1/auth/me").set("Cookie", cookieHeader);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user).toMatchObject({
      name: "Session User",
      email: "session@example.com",
      role: "recruiter",
    });
    expect(meRes.body.data.user).not.toHaveProperty("passwordHash");
  });

  // 10. Current-user endpoint without authentication
  it("Scenario 10: returns 401 UNAUTHENTICATED when requesting /me without a session", async () => {
    const res = await request(app).get("/api/v1/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  // 11. Rejection of expired or invalid JWTs
  it("Scenario 11: rejects forged, tampered, or expired tokens with 401 UNAUTHENTICATED", async () => {
    // Tampered token
    const resTampered = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `${AUTH_COOKIE_NAME}=invalid.tampered.token`);

    expect(resTampered.status).toBe(401);
    expect(resTampered.body.error.code).toBe("UNAUTHENTICATED");

    // Expired token
    const expiredToken = jwt.sign(
      { id: new mongoose.Types.ObjectId().toString(), role: "recruiter" },
      env.JWT_SECRET,
      { expiresIn: "-10s" }
    );

    const resExpired = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `${AUTH_COOKIE_NAME}=${expiredToken}`);

    expect(resExpired.status).toBe(401);
    expect(resExpired.body.error.code).toBe("UNAUTHENTICATED");
  });

  // 12. Logout clearing the session cookie
  it("Scenario 12: clears the session cookie upon logout", async () => {
    const signupRes = await request(app).post("/api/v1/auth/signup").send({
      name: "Logout User",
      email: "logout@example.com",
      password: "StrongPass!234",
    });

    const cookieHeader = signupRes.headers["set-cookie"][0].split(";")[0];

    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookieHeader);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);
    expect(logoutRes.body.data.loggedOut).toBe(true);

    const clearCookies = logoutRes.headers["set-cookie"];
    expect(clearCookies).toBeDefined();
    expect(clearCookies[0]).toMatch(new RegExp(`${AUTH_COOKIE_NAME}=;`));
  });

  // 13. Signup role-escalation attempts
  it("Scenario 13: ignores or rejects role escalation during public signup", async () => {
    const res = await request(app).post("/api/v1/auth/signup").send({
      name: "Hacker Aspirant",
      email: "hacker@example.com",
      password: "StrongPass!234",
      role: "admin", // Client attempting privilege escalation
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("recruiter"); // Enforced as recruiter

    const userInDb = await User.findOne({ email: "hacker@example.com" });
    expect(userInDb?.role).toBe("recruiter");
  });

  // 14. Authentication middleware returning HTTP 401
  it("Scenario 14: requireAuth middleware rejects unauthenticated requests on protected routes", async () => {
    const res = await request(testApp).get("/test-admin-only");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  // 15. Role middleware returning HTTP 403 when appropriate
  it("Scenario 15: requireRole returns 403 FORBIDDEN when user lacks required role", async () => {
    const signupRes = await request(app).post("/api/v1/auth/signup").send({
      name: "Ordinary Recruiter",
      email: "recruiter.only@example.com",
      password: "StrongPass!234",
    });

    const cookieHeader = signupRes.headers["set-cookie"][0].split(";")[0];

    // Attempt to access admin-only test route
    const res = await request(testApp)
      .get("/test-admin-only")
      .set("Cookie", cookieHeader);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.error.message).toMatch(/insufficient permissions/i);
  });

  // 16. Authorization success for an allowed role
  it("Scenario 16: grants access to route when user possesses an authorized role", async () => {
    const signupRes = await request(app).post("/api/v1/auth/signup").send({
      name: "Allowed Recruiter",
      email: "allowed.recruiter@example.com",
      password: "StrongPass!234",
    });

    const cookieHeader = signupRes.headers["set-cookie"][0].split(";")[0];

    const res = await request(testApp)
      .get("/test-recruiter-allowed")
      .set("Cookie", cookieHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("recruiter-access-granted");
  });

  // 17. Database failure handling
  it("Scenario 17: scrubs credentials from MongoDB URI in logs and handles failure safely", async () => {
    const uriWithSecret = "mongodb://dbuser:supersecretpass@cluster.mongodb.net/earlyai_ats?retryWrites=true";
    const sanitized = sanitizeMongoUri(uriWithSecret);

    expect(sanitized).not.toContain("supersecretpass");
    expect(sanitized).toBe("mongodb://***:***@cluster.mongodb.net/earlyai_ats?retryWrites=true");

    // Calling connectDB with empty string triggers safe exception
    await expect(connectDB("")).rejects.toThrow(/MONGODB_URI is undefined/);
  });

  // 18. Regression tests for existing health endpoint and 404 handler
  it("Scenario 18: preserves existing health check and 404 handler", async () => {
    const healthRes = await request(app).get("/api/v1/health");
    expect(healthRes.status).toBe(200);
    expect(healthRes.body).toEqual({
      status: "ok",
      service: "earlyai-ats-api",
    });

    const notFoundRes = await request(app).get("/api/v1/non-existent-endpoint");
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.error.code).toBe("NOT_FOUND");
  });

  // 19. Test isolation & credential sanitization regression
  it("Scenario 19: enforces test isolation guards and sanitizes URIs with '@' in passwords", async () => {
    // 19.1 sanitizeMongoUri correctly handles passwords containing '@'
    const uriWithAtInPass = "mongodb://admin:p@ss@word@localhost:27017/test_db";
    const sanitized = sanitizeMongoUri(uriWithAtInPass);
    expect(sanitized).toBe("mongodb://***:***@localhost:27017/test_db");
    expect(sanitized).not.toContain("p@ss@word");

    // 19.2 isSafeTestUri validates host and database name
    expect(isSafeTestUri("mongodb://localhost:27017/earlyai_ats_test")).toBe(true);
    expect(isSafeTestUri("mongodb://127.0.0.1:27017/app_test")).toBe(true);
    expect(isSafeTestUri("mongodb://localhost:27017/earlyai_ats_test?retryWrites=true")).toBe(true);

    // Non-local hosts rejected
    expect(isSafeTestUri("mongodb+srv://user:pass@cluster0.mongodb.net/earlyai_ats_test")).toBe(false);
    expect(isSafeTestUri("mongodb://192.168.1.50:27017/earlyai_ats_test")).toBe(false);
    expect(isSafeTestUri("mongodb://remote.database.com:27017/earlyai_ats_test")).toBe(false);

    // Databases not ending in '_test' rejected
    expect(isSafeTestUri("mongodb://localhost:27017/earlyai_ats_dev")).toBe(false);
    expect(isSafeTestUri("mongodb://localhost:27017/production")).toBe(false);
    expect(isSafeTestUri("mongodb://localhost:27017/test_earlyai_ats")).toBe(false);

    // 19.3 connectDB in test mode refuses non-local and non-test URIs
    await expect(connectDB("mongodb+srv://cluster0.mongodb.net/earlyai_ats_test")).rejects.toThrow(
      /SECURITY GUARD: In test mode/
    );
    await expect(connectDB("mongodb://remote-host:27017/app_test")).rejects.toThrow(
      /SECURITY GUARD: In test mode/
    );
    await expect(connectDB("mongodb://localhost:27017/earlyai_ats_prod")).rejects.toThrow(
      /SECURITY GUARD: In test mode/
    );

    // 19.4 isSafeLocalTestDatabase validates active connection target
    expect(isSafeLocalTestDatabase("localhost", "earlyai_ats_test")).toBe(true);
    expect(isSafeLocalTestDatabase("127.0.0.1", "custom_test")).toBe(true);
    expect(isSafeLocalTestDatabase("cluster0.mongodb.net", "earlyai_ats_test")).toBe(false);
    expect(isSafeLocalTestDatabase("localhost", "earlyai_ats_production")).toBe(false);
    expect(isSafeLocalTestDatabase(null, "earlyai_ats_test")).toBe(false);
    expect(isSafeLocalTestDatabase("localhost", null)).toBe(false);

    // 19.5 dropDatabase guard on mongoose.Connection prototype throws when invoked on non-local target
    const fakeUnsafeConn = Object.create(mongoose.connection, {
      host: { value: "cluster0.mongodb.net" },
      name: { value: "earlyai_ats_test" },
    });
    await expect(fakeUnsafeConn.dropDatabase()).rejects.toThrow(
      /CRITICAL SAFETY GUARD: Refusing to drop database/
    );
  });
});

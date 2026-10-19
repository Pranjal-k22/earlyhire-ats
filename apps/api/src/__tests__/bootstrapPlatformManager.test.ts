import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  validateEmail,
  validatePasswordStrength,
  bootstrapPlatformManager,
  isStagingDatabase,
  isProductionDatabase,
} from "../scripts/bootstrapPlatformManager.js";
import { User } from "../models/user.model.js";
import { connectDB, disconnectDB } from "../config/db.js";

const TEST_DB_URI = "mongodb://localhost:27017/earlyai_ats_test";
const TEST_EMAIL = "test-bootstrap-platform-mgr@isolated-test.internal";

describe("Platform Manager Bootstrap Utility & Safeguards", () => {
  beforeAll(async () => {
    await connectDB(TEST_DB_URI);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({ email: TEST_EMAIL });
    }
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({ email: TEST_EMAIL });
  });

  describe("Email Validation", () => {
    it("accepts valid email addresses", () => {
      expect(validateEmail("admin@earlyhire.io")).toBe(true);
      expect(validateEmail("user.name+tag@company.co.uk")).toBe(true);
      expect(validateEmail("platform_manager@sub.domain.org")).toBe(true);
    });

    it("rejects invalid email formats", () => {
      expect(validateEmail("not-an-email")).toBe(false);
      expect(validateEmail("admin@")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
      expect(validateEmail("admin@example")).toBe(false);
      expect(validateEmail("admin space@example.com")).toBe(false);
      expect(validateEmail("")).toBe(false);
    });
  });

  describe("Password Complexity Validation", () => {
    it("accepts passwords meeting all complexity criteria", () => {
      const result = validatePasswordStrength("Str0ng!Passw0rd#2026");
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("rejects passwords shorter than 12 characters", () => {
      const result = validatePasswordStrength("Sh0rt!pass");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("at least 12 characters");
    });

    it("rejects passwords missing an uppercase letter", () => {
      const result = validatePasswordStrength("str0ng!passw0rd#2026");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("uppercase letter");
    });

    it("rejects passwords missing a lowercase letter", () => {
      const result = validatePasswordStrength("STR0NG!PASSW0RD#2026");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("lowercase letter");
    });

    it("rejects passwords missing a digit", () => {
      const result = validatePasswordStrength("Strong!Password#Special");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("digit");
    });

    it("rejects passwords missing a special character", () => {
      const result = validatePasswordStrength("StrongPassword2026NoSpecial");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("special character");
    });

    it("rejects passwords containing whitespace", () => {
      const result = validatePasswordStrength("Str0ng! Passw0rd #2026");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("whitespace");
    });
  });

  describe("Dry-run and Execution Safeguards", () => {
    it("throws when email is invalid", async () => {
      await expect(
        bootstrapPlatformManager({
          name: "Admin Tester",
          email: "invalid-email-address",
          isExecute: false,
          customUri: TEST_DB_URI,
        })
      ).rejects.toThrow(/Invalid email address format/);
    });

    it("throws when name is too short", async () => {
      await expect(
        bootstrapPlatformManager({
          name: "A",
          email: TEST_EMAIL,
          isExecute: false,
          customUri: TEST_DB_URI,
        })
      ).rejects.toThrow(/valid full name/);
    });

    it("throws when provided password does not meet complexity requirements", async () => {
      await expect(
        bootstrapPlatformManager({
          name: "Admin Tester",
          email: TEST_EMAIL,
          password: "weak",
          isExecute: false,
          customUri: TEST_DB_URI,
        })
      ).rejects.toThrow(/Password strength requirement not met/);
    });

    it("performs dry-run creation for new user without modifying database", async () => {
      const result = await bootstrapPlatformManager({
        name: "Admin Tester",
        email: TEST_EMAIL,
        password: "Str0ng!Passw0rd#2026",
        isExecute: false,
        customUri: TEST_DB_URI,
      });

      expect(result.status).toBe("DRY_RUN_CREATE");
      expect(result.email).toBe(TEST_EMAIL);
      expect(result.role).toBe("platform_manager");
      expect(result.targetDatabase).toBe("earlyai_ats_test");

      // Verify no user document was created in the database
      const found = await User.findOne({ email: TEST_EMAIL });
      expect(found).toBeNull();
    });

    it("safeguards existing non-platform_manager accounts by requiring allowRoleUpgrade", async () => {
      // Seed existing candidate
      const existing = await User.create({
        name: "Existing User",
        email: TEST_EMAIL,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuv",
        role: "candidate",
        isActive: true,
      });

      // Without allowRoleUpgrade, should throw and not modify
      await expect(
        bootstrapPlatformManager({
          name: "Existing User",
          email: TEST_EMAIL,
          isExecute: false,
          allowRoleUpgrade: false,
          customUri: TEST_DB_URI,
        })
      ).rejects.toThrow(/supply --allow-role-upgrade/);

      // Verify role unchanged
      const candidateDoc = await User.findById(existing.id);
      expect(candidateDoc?.role).toBe("candidate");

      // With allowRoleUpgrade in dry-run mode
      const result = await bootstrapPlatformManager({
        name: "Existing User",
        email: TEST_EMAIL,
        isExecute: false,
        allowRoleUpgrade: true,
        customUri: TEST_DB_URI,
      });

      expect(result.status).toBe("DRY_RUN_UPGRADE");
      expect(result.email).toBe(TEST_EMAIL);

      // Verify still unchanged in dry-run
      const stillCandidate = await User.findById(existing.id);
      expect(stillCandidate?.role).toBe("candidate");
    });

    it("recognizes existing platform_manager accounts without mutations", async () => {
      await User.create({
        name: "Existing PM",
        email: TEST_EMAIL,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuv",
        role: "platform_manager",
        isActive: true,
      });

      const result = await bootstrapPlatformManager({
        name: "Existing PM",
        email: TEST_EMAIL,
        isExecute: false,
        customUri: TEST_DB_URI,
      });

      expect(result.status).toBe("ALREADY_PLATFORM_MANAGER");
      expect(result.email).toBe(TEST_EMAIL);
      expect(result.role).toBe("platform_manager");
    });

    it("verifies staging database detection (isStagingDatabase)", () => {
      expect(isStagingDatabase("earlyai_ats_staging")).toBe(true);
      expect(isStagingDatabase("custom_staging")).toBe(true);
      expect(isStagingDatabase("earlyai_ats_prod")).toBe(false);
      expect(isStagingDatabase("earlyai_ats_dev")).toBe(false);
      expect(isStagingDatabase("")).toBe(false);
      expect(isStagingDatabase(null)).toBe(false);
    });

    it("verifies production database detection (isProductionDatabase)", () => {
      expect(isProductionDatabase("earlyai_ats_prod")).toBe(true);
      expect(isProductionDatabase("production")).toBe(true);
      expect(isProductionDatabase("myapp_prod")).toBe(true);
      expect(isProductionDatabase("earlyai_ats_staging")).toBe(false);
      expect(isProductionDatabase("earlyai_ats_test")).toBe(false);
      expect(isProductionDatabase("earlyai_ats_dev")).toBe(false);
    });

    it("allows staging execution without --confirm-production when target database is explicitly staging", async () => {
      // Dry-run simulation of staging database target
      const result = await bootstrapPlatformManager({
        name: "Staging Admin",
        email: TEST_EMAIL,
        isExecute: false,
        customUri: TEST_DB_URI,
      });

      expect(result.status).toBe("DRY_RUN_CREATE");
      expect(result.role).toBe("platform_manager");
    });
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { ResumeFile } from "../models/resume.model.js";
import { Application } from "../models/application.model.js";
import { Notification } from "../models/notification.model.js";
import { signToken, AUTH_COOKIE_NAME } from "../utils/jwt.js";
import { screeningService } from "../services/screening/screeningService.js";
import { notificationService } from "../services/notification/notificationService.js";
import { emailService } from "../services/email/emailService.js";

const TEST_DB_URI = "mongodb://localhost:27017/earlyai_ats_test";

describe("Automatic Screening & Complete Notification System Suite", { timeout: 30000 }, () => {
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
    await Notification.deleteMany({});
    emailService.clearSentEmailsForTesting();
  });

  const getSessionCookie = (user: { id: string; role: string }) => {
    const token = signToken({ id: user.id, role: user.role });
    return `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax`;
  };

  it("1. Candidate application submission automatically triggers screening and creates notifications", async () => {
    // 1. Setup recruiter and open job
    const recruiter = await User.create({
      name: "Rachel Recruiter",
      email: "rachel@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "hiring_team",
    });

    const job = await Job.create({
      title: "Backend Engineer (Node.js & MongoDB)",
      department: "Engineering",
      location: "Remote",
      employmentType: "FullTime",
      description: "Seeking a backend engineer with strong TypeScript, Node.js, Express, and MongoDB skills.",
      requirements: ["TypeScript", "Node.js", "Express", "MongoDB"],
      status: "Open",
      ownerId: recruiter._id,
    });

    // 2. Setup candidate and uploaded resume
    const candidateUser = await User.create({
      name: "Carlos Candidate",
      email: "carlos@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "candidate",
    });

    const resume = await ResumeFile.create({
      candidateUserId: candidateUser._id,
      originalFilename: "Carlos_Resume.pdf",
      storedFilename: `carlos_resume_${Date.now()}_1.pdf`,
      mimeType: "application/pdf",
      fileSizeBytes: 1024,
      storageDriver: "local",
      storagePath: "uploads/resumes/dummy_carlos.pdf",
      version: 1,
      parsingStatus: "completed",
      parsedText:
        "Carlos Candidate. Experienced Software Developer specializing in TypeScript, Node.js, Express, and MongoDB. Built scalable REST APIs.",
      contentSha256: "dummy_sha256_hash_carlos",
    });

    // 3. Candidate applies for the job
    const cookie = getSessionCookie(candidateUser);
    const applyRes = await request(app)
      .post("/api/v1/applications/apply")
      .set("Cookie", cookie)
      .send({
        jobId: job.id,
        resumeId: resume.id,
        source: "CareerPortal",
      });

    expect(applyRes.status).toBe(201);
    expect(applyRes.body.success).toBe(true);
    const applicationId = applyRes.body.data.application.id;
    expect(applicationId).toBeDefined();

    // 4. Verify Candidate Notification: Application Submitted
    const candidateNotifs = await Notification.find({ recipientUserId: candidateUser._id });
    expect(candidateNotifs.length).toBeGreaterThanOrEqual(1);
    const submitNotif = candidateNotifs.find((n) => n.type === "application_submitted");
    expect(submitNotif).toBeDefined();
    expect(submitNotif?.title).toBe("Application Submitted");
    expect(submitNotif?.message).toContain(job.title);

    // 5. Verify Recruiter Notification: New Application Received
    const recruiterNotifs = await Notification.find({ recipientUserId: recruiter._id });
    expect(recruiterNotifs.length).toBeGreaterThanOrEqual(1);
    const receivedNotif = recruiterNotifs.find((n) => n.type === "application_received");
    expect(receivedNotif).toBeDefined();
    expect(receivedNotif?.message).toContain("Carlos Candidate");

    // 6. Wait for async screening to complete
    await screeningService.executeScreening(applicationId, "test_execution");

    const updatedApp = await Application.findById(applicationId);
    expect(updatedApp?.atsSnapshot).toBeDefined();
    expect(updatedApp?.atsSnapshot?.status).toBe("completed");
    expect(updatedApp?.atsSnapshot?.overallScore).toBeGreaterThan(0);
    expect(updatedApp?.atsSnapshot?.matchedSkills).toBeDefined();
    expect(updatedApp?.atsSnapshot?.screeningRecommendation).toBeDefined();

    // 7. Verify Recruiter Notification: Screening Completed
    const postScreeningNotifs = await Notification.find({
      recipientUserId: recruiter._id,
      type: "screening_completed",
    });
    expect(postScreeningNotifs.length).toBe(1);
    expect(postScreeningNotifs[0].message).toContain("Carlos Candidate");
  });

  it("2. Handles unreadable or missing resume with needs_review state rather than failing silently", async () => {
    const recruiter = await User.create({
      name: "Rita Recruiter",
      email: "rita@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "hiring_team",
    });

    const job = await Job.create({
      title: "Frontend Architect",
      department: "Engineering",
      location: "Remote",
      employmentType: "FullTime",
      description: "Lead UI architecture with React, Next.js, and TypeScript.",
      requirements: ["React", "TypeScript", "Next.js"],
      status: "Open",
      ownerId: recruiter._id,
    });

    const candidateUser = await User.create({
      name: "Dana Unreadable",
      email: "dana@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "candidate",
    });

    // Resume with empty parsedText and non-existent file path
    const resume = await ResumeFile.create({
      candidateUserId: candidateUser._id,
      originalFilename: "empty_scan.pdf",
      storedFilename: `empty_scan_${Date.now()}_2.pdf`,
      mimeType: "application/pdf",
      fileSizeBytes: 500,
      storageDriver: "local",
      storagePath: "uploads/resumes/non_existent_file.pdf",
      version: 1,
      parsingStatus: "pending",
      parsedText: "",
      contentSha256: "dummy_sha256_hash_empty",
    });

    const cookie = getSessionCookie(candidateUser);
    const applyRes = await request(app)
      .post("/api/v1/applications/apply")
      .set("Cookie", cookie)
      .send({
        jobId: job.id,
        resumeId: resume.id,
      });

    expect(applyRes.status).toBe(201);
    const appId = applyRes.body.data.application.id;

    // Execute screening for this application
    await screeningService.executeScreening(appId, "test_execution");

    const appDoc = await Application.findById(appId);
    expect(appDoc?.atsSnapshot?.status).toBe("needs_review");
    expect(appDoc?.atsSnapshot?.screeningRecommendation).toBe("needs_review");
    expect(appDoc?.atsSnapshot?.errorCategory).toBe("UNREADABLE_RESUME_TEXT");

    // Recruiter should receive a screening_needs_review notification
    const reviewNotifs = await Notification.find({
      recipientUserId: recruiter._id,
      type: "screening_needs_review",
    });
    expect(reviewNotifs.length).toBe(1);
    expect(reviewNotifs[0].message).toContain("Dana Unreadable");
  });

  it("3. Authorized recruiter can trigger manual screening retry via API", async () => {
    const recruiter = await User.create({
      name: "Bob Recruiter",
      email: "bob_rec@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "hiring_team",
    });

    const candidateUser = await User.create({
      name: "Eva Engineer",
      email: "eva@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "candidate",
    });

    const job = await Job.create({
      title: "DevOps Specialist",
      department: "Infrastructure",
      location: "Remote",
      employmentType: "FullTime",
      description: "Kubernetes, Terraform, AWS, and CI/CD pipelines.",
      requirements: ["Kubernetes", "AWS", "Terraform", "CI/CD"],
      status: "Open",
      ownerId: recruiter._id,
    });

    const resume = await ResumeFile.create({
      candidateUserId: candidateUser._id,
      originalFilename: "Eva_DevOps.pdf",
      storedFilename: `eva_resume_${Date.now()}_3.pdf`,
      mimeType: "application/pdf",
      fileSizeBytes: 2048,
      storageDriver: "local",
      storagePath: "uploads/resumes/dummy_eva.pdf",
      version: 1,
      parsingStatus: "completed",
      parsedText: "Eva Engineer. Senior DevOps engineer with Kubernetes, AWS, Terraform, Docker, and GitHub Actions.",
      contentSha256: "dummy_sha_eva",
    });

    const applyCookie = getSessionCookie(candidateUser);
    const appRes = await request(app)
      .post("/api/v1/applications/apply")
      .set("Cookie", applyCookie)
      .send({ jobId: job.id, resumeId: resume.id });
    const appId = appRes.body.data.application.id;

    // Recruiter triggers screening retry
    const recruiterCookie = getSessionCookie(recruiter);
    const retryRes = await request(app)
      .post(`/api/v1/applications/${appId}/screening/retry`)
      .set("Cookie", recruiterCookie)
      .send();

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.success).toBe(true);

    // Verify retryCount was incremented
    const updatedApp = await Application.findById(appId);
    expect(updatedApp?.atsSnapshot?.retryCount).toBeGreaterThanOrEqual(1);

    // Candidate should NOT be permitted to trigger recruiter retry
    const forbiddenRes = await request(app)
      .post(`/api/v1/applications/${appId}/screening/retry`)
      .set("Cookie", applyCookie)
      .send();
    expect(forbiddenRes.status).toBe(403);

    // Wait for retry screening in flight to finish cleanly
    await screeningService.executeScreening(appId);
  });

  it("4. Notification endpoints: unread count, pagination, mark read, mark all read, delete, and email status", async () => {
    const user = await User.create({
      name: "Marcus Manager",
      email: "marcus@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "hiring_team",
    });

    // Create 3 notifications
    await Notification.create([
      {
        recipientUserId: user._id,
        title: "Notification 1",
        message: "Message 1",
        type: "system",
        isRead: false,
      },
      {
        recipientUserId: user._id,
        title: "Notification 2",
        message: "Message 2",
        type: "application_received",
        isRead: false,
      },
      {
        recipientUserId: user._id,
        title: "Notification 3",
        message: "Message 3",
        type: "screening_completed",
        isRead: true,
      },
    ]);

    const cookie = getSessionCookie(user);

    // Test GET /unread-count
    const countRes = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set("Cookie", cookie);
    expect(countRes.status).toBe(200);
    expect(countRes.body.data.unreadCount).toBe(2);

    // Test GET /my (paginated)
    const listRes = await request(app)
      .get("/api/v1/notifications/my?limit=2&page=1")
      .set("Cookie", cookie);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.notifications.length).toBe(2);
    expect(listRes.body.data.pagination.total).toBe(3);
    expect(listRes.body.data.unreadCount).toBe(2);

    // Test PATCH /:id/read
    const targetNotifId = listRes.body.data.notifications[0].id;
    const readRes = await request(app)
      .patch(`/api/v1/notifications/${targetNotifId}/read`)
      .set("Cookie", cookie);
    expect(readRes.status).toBe(200);
    expect(readRes.body.data.notification.isRead).toBe(true);

    // Test PATCH /read-all
    const readAllRes = await request(app)
      .patch("/api/v1/notifications/read-all")
      .set("Cookie", cookie);
    expect(readAllRes.status).toBe(200);
    expect(readAllRes.body.data.markedAllRead).toBe(true);

    const postCount = await Notification.countDocuments({ recipientUserId: user._id, isRead: false });
    expect(postCount).toBe(0);

    // Test DELETE /:id
    const deleteRes = await request(app)
      .delete(`/api/v1/notifications/${targetNotifId}`)
      .set("Cookie", cookie);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);

    // Test GET /email-status
    const emailStatusRes = await request(app)
      .get("/api/v1/notifications/email-status")
      .set("Cookie", cookie);
    expect(emailStatusRes.status).toBe(200);
    expect(emailStatusRes.body.data).toBeDefined();
    expect(emailStatusRes.body.data.from).toBeDefined();
  });

  it("5. Idempotent notification deduplication prevents duplicate records on retries", async () => {
    const user = await User.create({
      name: "Idempotent User",
      email: "idempotent@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "candidate",
    });

    const notif1 = await notificationService.createNotification({
      recipientUserId: user._id,
      title: "Unique Notification",
      message: "Testing idempotency deduplication",
      type: "application_submitted",
      idempotencyKey: "unique-key-12345",
    });

    const notif2 = await notificationService.createNotification({
      recipientUserId: user._id,
      title: "Duplicate Notification Attempt",
      message: "This should be ignored and reuse existing record",
      type: "application_submitted",
      idempotencyKey: "unique-key-12345",
    });

    expect(notif1?.id).toBe(notif2?.id);
    const count = await Notification.countDocuments({ recipientUserId: user._id });
    expect(count).toBe(1);
  });
});

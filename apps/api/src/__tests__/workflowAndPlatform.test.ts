import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { Candidate } from "../models/candidate.model.js";
import { Application } from "../models/application.model.js";
import { Interview } from "../models/interview.model.js";
import { InterviewFeedback } from "../models/interviewFeedback.model.js";
import { ApplicationStageReview } from "../models/stageReview.model.js";
import { Notification } from "../models/notification.model.js";
import { AIUsageRecord } from "../models/aiUsage.model.js";
import { signToken, AUTH_COOKIE_NAME } from "../utils/jwt.js";

const TEST_DB_URI = "mongodb://localhost:27017/earlyai_ats_test";

describe("Phase E, F, G — Recruitment Workflow, Interviews, Feedback & Platform Suite", { timeout: 25000 }, () => {
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
    await Candidate.deleteMany({});
    await Application.deleteMany({});
    await Interview.deleteMany({});
    await InterviewFeedback.deleteMany({});
    await ApplicationStageReview.deleteMany({});
    await Notification.deleteMany({});
    await AIUsageRecord.deleteMany({});
  });

  const getSessionCookie = (user: { id: string; role: string }) => {
    const token = signToken({ id: user.id, role: user.role });
    return `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax`;
  };

  describe("1. Interview Scheduling & Candidate Visibility", () => {
    it("allows hiring team to schedule interview, creates notification, and lets candidate view schedule", async () => {
      const candidateUser = await User.create({
        name: "Maya Candidate",
        email: "maya@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      const recruiter = await User.create({
        name: "Robin Recruiter",
        email: "robin@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "recruiter",
      });

      const job = await Job.create({
        title: "Frontend Architect",
        department: "Engineering",
        location: "Remote",
        employmentType: "FullTime",
        status: "Open",
        ownerId: recruiter.id,
        description: "Leading frontend architectural decisions.",
        requirements: ["React", "TypeScript", "System Design"],
      });

      const candidateDoc = await Candidate.create({
        name: "Maya Candidate",
        email: "maya@example.com",
        phone: "555-0199",
        createdBy: recruiter.id,
        updatedBy: recruiter.id,
      });

      const application = await Application.create({
        candidateId: candidateDoc.id,
        jobId: job.id,
        recruiterId: recruiter.id,
        createdBy: recruiter.id,
        updatedBy: recruiter.id,
        stage: "Interview",
        currentStage: "Interview",
      });

      const startTime = new Date(Date.now() + 86400000); // Tomorrow
      const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later

      // 1. Recruiter schedules interview
      const scheduleRes = await request(app)
        .post("/api/v1/interviews/schedule")
        .set("Cookie", getSessionCookie(recruiter))
        .send({
          applicationId: application.id,
          title: "Technical Architecture Interview",
          scheduledStartTime: startTime.toISOString(),
          scheduledEndTime: endTime.toISOString(),
          timezone: "UTC",
          meetingType: "manual_link",
          manualMeetingLink: "https://meet.google.com/xyz-test-link",
          notes: "Focus on React performance and architecture.",
          interviewers: [
            { name: "Robin Recruiter", email: "robin@example.com" },
          ],
        });

      expect(scheduleRes.status).toBe(201);
      expect(scheduleRes.body.success).toBe(true);
      expect(scheduleRes.body.data.interview.status).toBe("scheduled");
      expect(scheduleRes.body.data.interview.googleMeetLink).toBe("https://meet.google.com/xyz-test-link");

      const interviewId = scheduleRes.body.data.interview.id;

      // 2. Verify candidate received in-app notification
      const notifRes = await request(app)
        .get("/api/v1/notifications/my")
        .set("Cookie", getSessionCookie(candidateUser));

      expect(notifRes.status).toBe(200);
      expect(notifRes.body.data.notifications.length).toBe(1);
      expect(notifRes.body.data.notifications[0].title).toBe("Interview Scheduled");
      expect(notifRes.body.data.unreadCount).toBe(1);

      // 3. Candidate views scheduled interviews
      const myInterviewsRes = await request(app)
        .get("/api/v1/interviews/my")
        .set("Cookie", getSessionCookie(candidateUser));

      expect(myInterviewsRes.status).toBe(200);
      expect(myInterviewsRes.body.data.interviews.length).toBe(1);
      expect(myInterviewsRes.body.data.interviews[0].title).toBe("Technical Architecture Interview");

      // 4. Candidate cannot cancel interview directly (hiring team action)
      const candCancelRes = await request(app)
        .post(`/api/v1/interviews/${interviewId}/cancel`)
        .set("Cookie", getSessionCookie(candidateUser))
        .send({ reason: "Candidate request" });
      expect(candCancelRes.status).toBe(403);

      // 5. Recruiter cancels interview
      const cancelRes = await request(app)
        .post(`/api/v1/interviews/${interviewId}/cancel`)
        .set("Cookie", getSessionCookie(recruiter))
        .send({ reason: "Rescheduled by team" });
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.interview.status).toBe("cancelled");
    });
  });

  describe("2. Structured Interview Feedback & Candidate Release Controls", () => {
    it("enforces confidentiality: hides internal notes from candidates until approved release", async () => {
      const candidateUser = await User.create({
        name: "David Candidate",
        email: "david@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      const interviewer = await User.create({
        name: "Iris Interviewer",
        email: "iris@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "hiring_manager",
      });

      const job = await Job.create({
        title: "Platform Engineer",
        department: "Infrastructure",
        location: "Remote",
        employmentType: "FullTime",
        status: "Open",
        ownerId: interviewer.id,
        description: "Cloud infrastructure role.",
        requirements: ["Docker", "Kubernetes", "Terraform"],
      });

      const candidateDoc = await Candidate.create({
        name: "David Candidate",
        email: "david@example.com",
        createdBy: interviewer.id,
        updatedBy: interviewer.id,
      });

      const application = await Application.create({
        candidateId: candidateDoc.id,
        jobId: job.id,
        recruiterId: interviewer.id,
        createdBy: interviewer.id,
        updatedBy: interviewer.id,
        stage: "Interview",
        currentStage: "Interview",
      });

      const interview = await Interview.create({
        applicationId: application.id,
        jobId: job.id,
        candidateUserId: candidateUser.id,
        candidateId: candidateDoc.id,
        organizerId: interviewer.id,
        title: "Technical Deep Dive",
        scheduledStartTime: new Date(),
        scheduledEndTime: new Date(Date.now() + 3600000),
      });

      // 1. Interviewer submits structured feedback
      const submitRes = await request(app)
        .post("/api/v1/feedback/submit")
        .set("Cookie", getSessionCookie(interviewer))
        .send({
          interviewId: interview.id,
          applicationId: application.id,
          ratings: {
            technicalRating: 4,
            communicationRating: 5,
            problemSolvingRating: 4,
            cultureAndValuesRating: 5,
            overallRating: 4,
          },
          strengths: "Excellent understanding of container orchestration.",
          concerns: "Limited direct production experience with Terraform Cloud.",
          internalNotes: "CONFIDENTIAL: Strong candidate. Salary expectation is $140k.",
          candidateReleasableFeedback: "Great discussion on Docker & Kubernetes architecture. Keep sharpening Terraform skills.",
          recommendation: "hire",
        });

      expect(submitRes.status).toBe(201);
      const feedbackId = submitRes.body.data.feedback.id;

      // 2. Candidate attempts to view feedback BEFORE release: must receive EMPTY list
      const candidateBeforeRelease = await request(app)
        .get(`/api/v1/feedback/application/${application.id}`)
        .set("Cookie", getSessionCookie(candidateUser));

      expect(candidateBeforeRelease.status).toBe(200);
      expect(candidateBeforeRelease.body.data.feedbacks.length).toBe(0);

      // 3. Recruiter releases feedback to candidate
      const releaseRes = await request(app)
        .post(`/api/v1/feedback/${feedbackId}/release`)
        .set("Cookie", getSessionCookie(interviewer));

      expect(releaseRes.status).toBe(200);
      expect(releaseRes.body.data.released).toBe(true);

      // 4. Candidate views feedback AFTER release:
      // Must contain candidateReleasableFeedback, but STRICTLY EXCLUDE internalNotes and numerical ratings!
      const candidateAfterRelease = await request(app)
        .get(`/api/v1/feedback/application/${application.id}`)
        .set("Cookie", getSessionCookie(candidateUser));

      expect(candidateAfterRelease.status).toBe(200);
      expect(candidateAfterRelease.body.data.feedbacks.length).toBe(1);
      const candView = candidateAfterRelease.body.data.feedbacks[0];
      expect(candView.feedback).toContain("Great discussion on Docker & Kubernetes");
      expect(candView.internalNotes).toBeUndefined();
      expect(candView.ratings).toBeUndefined();
    });
  });

  describe("3. Stage Reviews & Independent Human Decisions", () => {
    it("generates stage review questions and records human decision independently", async () => {
      const recruiter = await User.create({
        name: "Sam Recruiter",
        email: "sam@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "recruiter",
      });

      const job = await Job.create({
        title: "Site Reliability Engineer",
        department: "DevOps",
        location: "Remote",
        employmentType: "FullTime",
        status: "Open",
        ownerId: recruiter.id,
        description: "High availability distributed systems.",
        requirements: ["Linux", "Networking", "Prometheus"],
      });

      const candidate = await Candidate.create({
        name: "Morgan SRE",
        email: "morgan@example.com",
        summary: "5 years managing Linux clusters and Prometheus alerting.",
        createdBy: recruiter.id,
        updatedBy: recruiter.id,
      });

      const application = await Application.create({
        candidateId: candidate.id,
        jobId: job.id,
        recruiterId: recruiter.id,
        createdBy: recruiter.id,
        updatedBy: recruiter.id,
        stage: "Screening",
        currentStage: "Screening",
      });

      // 1. Generate Stage Review
      const reviewRes = await request(app)
        .get(`/api/v1/stage-reviews/application/${application.id}`)
        .set("Cookie", getSessionCookie(recruiter));

      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.success).toBe(true);
      expect(reviewRes.body.data.review.stage).toBe("Screening");
      expect(reviewRes.body.data.review.suggestedQuestions.length).toBeGreaterThan(0);
      expect(reviewRes.body.data.review.status).toBe("completed");

      const reviewId = reviewRes.body.data.review.id;

      // 2. Human Recruiter records independent decision
      const decisionRes = await request(app)
        .post(`/api/v1/stage-reviews/${reviewId}/decision`)
        .set("Cookie", getSessionCookie(recruiter))
        .send({
          decision: "advance",
          notes: "Morgan demonstrated clear networking expertise during phone screening. Advancing to team interview.",
        });

      expect(decisionRes.status).toBe(200);
      expect(decisionRes.body.data.review.humanDecision.decision).toBe("advance");
      expect(decisionRes.body.data.review.humanDecision.actorName).toBe("Sam Recruiter");
    });
  });

  describe("4. Platform Manager Dashboard & RBAC Boundaries", () => {
    it("allows platform manager to inspect AI metrics and health, denying non-platform users", async () => {
      const platformManager = await User.create({
        name: "Super Admin",
        email: "admin_super@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "admin", // Normalizes to platform_manager
      });

      const recruiter = await User.create({
        name: "Ordinary Recruiter",
        email: "rec_user@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "recruiter",
      });

      // 1. Recruiter attempting to access /api/v1/platform/ai-metrics: FORBIDDEN
      const recruiterRes = await request(app)
        .get("/api/v1/platform/ai-metrics")
        .set("Cookie", getSessionCookie(recruiter));
      expect(recruiterRes.status).toBe(403);

      // 2. Platform Manager accessing AI metrics: ALLOWED
      const metricsRes = await request(app)
        .get("/api/v1/platform/ai-metrics")
        .set("Cookie", getSessionCookie(platformManager));
      expect(metricsRes.status).toBe(200);
      expect(metricsRes.body.success).toBe(true);
      expect(metricsRes.body.data.totalCalls).toBeDefined();
      expect(metricsRes.body.data.errorRate).toBeDefined();

      // 3. Platform Manager inspecting System Integration Health
      const healthRes = await request(app)
        .get("/api/v1/platform/health")
        .set("Cookie", getSessionCookie(platformManager));
      expect(healthRes.status).toBe(200);
      expect(healthRes.body.data.database.status).toBe("connected");
      expect(healthRes.body.data.aiProviders.primary).toBeDefined();
      expect(healthRes.body.data.googleCalendar).toBeDefined();

      // 4. Platform Manager updates user role
      const roleUpdateRes = await request(app)
        .patch(`/api/v1/platform/users/${recruiter.id}/role`)
        .set("Cookie", getSessionCookie(platformManager))
        .send({ role: "hiring_team" });
      expect(roleUpdateRes.status).toBe(200);
      expect(roleUpdateRes.body.data.user.role).toBe("hiring_team");
    });
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { app } from "../app.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { Candidate } from "../models/candidate.model.js";
import { Application } from "../models/application.model.js";
import { ResumeFile } from "../models/resume.model.js";
import { AtsAnalysis } from "../models/atsAnalysis.model.js";
import { Interview } from "../models/interview.model.js";
import { signToken, AUTH_COOKIE_NAME } from "../utils/jwt.js";
import { sseEventHub } from "../services/sse/sseEventHub.js";

describe("Interactive, Real-Time Analytics & Dashboard Visualization Test Suite", () => {
  let adminUser: InstanceType<typeof User>;
  let recruiterUser: InstanceType<typeof User>;
  let candidateUser: InstanceType<typeof User>;
  let candidateProfile: InstanceType<typeof Candidate>;

  let adminCookie: string;
  let recruiterCookie: string;
  let candidateCookie: string;

  beforeAll(async () => {
    const TEST_DB_URI = process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/earlyai_ats_test";
    await connectDB(TEST_DB_URI);

    await User.deleteMany({});
    await Job.deleteMany({});
    await Candidate.deleteMany({});
    await Application.deleteMany({});
    await ResumeFile.deleteMany({});
    await AtsAnalysis.deleteMany({});
    await Interview.deleteMany({});

    adminUser = await User.create({
      name: "Platform Manager",
      email: "manager@example.com",
      passwordHash: await User.hashPassword("StrongPass!123"),
      role: "platform_manager",
      isActive: true,
    });

    recruiterUser = await User.create({
      name: "Lead Recruiter",
      email: "lead.recruiter@example.com",
      passwordHash: await User.hashPassword("StrongPass!123"),
      role: "recruiter",
      isActive: true,
    });

    candidateUser = await User.create({
      name: "Jane Candidate",
      email: "jane.candidate@example.com",
      passwordHash: await User.hashPassword("StrongPass!123"),
      role: "candidate",
      isActive: true,
    });

    candidateProfile = await Candidate.create({
      name: "Jane Candidate",
      fullName: "Jane Candidate",
      email: "jane.candidate@example.com",
      experienceYears: 5,
      skills: ["React", "TypeScript", "Node.js", "MongoDB"],
      source: "LinkedIn",
      createdBy: candidateUser._id,
      updatedBy: candidateUser._id,
    });

    adminCookie = `${AUTH_COOKIE_NAME}=${signToken({ id: adminUser.id, role: adminUser.role })}`;
    recruiterCookie = `${AUTH_COOKIE_NAME}=${signToken({ id: recruiterUser.id, role: recruiterUser.role })}`;
    candidateCookie = `${AUTH_COOKIE_NAME}=${signToken({ id: candidateUser.id, role: candidateUser.role })}`;
  });

  afterAll(async () => {
    sseEventHub.stopHeartbeat();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await disconnectDB();
    }
  });

  beforeEach(async () => {
    await Application.deleteMany({});
    await Job.deleteMany({});
    await ResumeFile.deleteMany({});
    await AtsAnalysis.deleteMany({});
    await Interview.deleteMany({});
  });

  it("1. GET /api/v1/analytics/overview returns enhanced visualization fields: trends, timeToHire, applicationTrends, topSkills, scoreDistribution, jobPerformance", async () => {
    const job = await Job.create({
      title: "Senior Full Stack",
      department: "Engineering",
      location: "Remote",
      employmentType: "FullTime",
      description: "Build robust features.",
      status: "Open",
      ownerId: recruiterUser._id,
    });

    const cand2 = await Candidate.create({
      name: "Second Candidate",
      fullName: "Second Candidate",
      email: "second.candidate@example.com",
      experienceYears: 3,
      skills: ["Node.js"],
      source: "Referral",
      createdBy: recruiterUser._id,
      updatedBy: recruiterUser._id,
    });

    // Create applications with timestamps and ATS scores
    await Application.create([
      {
        candidateId: candidateProfile._id,
        jobId: job._id,
        recruiterId: recruiterUser._id,
        currentStage: "Hired",
        stage: "Hired",
        status: "Active",
        appliedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        hiredAt: new Date(),
        atsSnapshot: {
          overallScore: 88,
          breakdown: { skillsScore: 90, experienceScore: 85, educationScore: 90, roleRelevanceScore: 88 },
          status: "completed",
          provider: "mock",
          model: "gemini-1.5-flash",
          resumeVersion: 1,
          promptVersion: "1.0",
          rubricVersion: "1.0",
          assessedAt: new Date(),
          matchedSkills: ["React", "TypeScript"],
        },
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        candidateId: cand2._id,
        jobId: job._id,
        recruiterId: recruiterUser._id,
        currentStage: "Screening",
        stage: "Screening",
        status: "Active",
        appliedAt: new Date(),
        atsSnapshot: {
          overallScore: 65,
          breakdown: { skillsScore: 70, experienceScore: 60, educationScore: 70, roleRelevanceScore: 65 },
          status: "completed",
          provider: "mock",
          model: "gemini-1.5-flash",
          resumeVersion: 1,
          promptVersion: "1.0",
          rubricVersion: "1.0",
          assessedAt: new Date(),
          matchedSkills: ["Node.js"],
        },
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
    ]);

    const res = await request(app)
      .get("/api/v1/analytics/overview?period=30d")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { data } = res.body;

    // Enhanced fields exist
    expect(data.trends).toBeDefined();
    expect(data.trends.activeApplications).toBeDefined();
    expect(data.timeToHire).toBeDefined();
    expect(data.timeToHire.hiredCount).toBe(1);
    expect(data.timeToHire.averageDays).toBeGreaterThan(0);

    expect(Array.isArray(data.applicationTrends)).toBe(true);
    expect(data.applicationTrends.length).toBeGreaterThan(0);

    expect(Array.isArray(data.topSkills)).toBe(true);
    expect(data.topSkills.some((s: { skill: string }) => s.skill === "React" || s.skill === "TypeScript")).toBe(true);

    expect(Array.isArray(data.scoreDistribution)).toBe(true);
    expect(data.scoreDistribution).toHaveLength(4);
    // Score 88 should fall into '81-100', score 65 into '61-80'
    const highBucket = data.scoreDistribution.find((b: { range: string }) => b.range === "81-100");
    const midBucket = data.scoreDistribution.find((b: { range: string }) => b.range === "61-80");
    expect(highBucket.count).toBe(1);
    expect(midBucket.count).toBe(1);

    expect(Array.isArray(data.jobPerformance)).toBe(true);
    expect(data.jobPerformance.length).toBe(1);
    expect(data.jobPerformance[0].title).toBe("Senior Full Stack");
    expect(data.jobPerformance[0].applicationsCount).toBe(2);
  });

  it("2. GET /api/v1/analytics/overview filters by jobId query parameter", async () => {
    const jobA = await Job.create({
      title: "Job A",
      department: "Design",
      location: "Remote",
      employmentType: "FullTime",
      description: "Job A desc",
      status: "Open",
      ownerId: recruiterUser._id,
    });

    const jobB = await Job.create({
      title: "Job B",
      department: "Sales",
      location: "Office",
      employmentType: "FullTime",
      description: "Job B desc",
      status: "Open",
      ownerId: recruiterUser._id,
    });

    await Application.create([
      {
        candidateId: candidateProfile._id,
        jobId: jobA._id,
        recruiterId: recruiterUser._id,
        currentStage: "Applied",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        candidateId: candidateProfile._id,
        jobId: jobB._id,
        recruiterId: recruiterUser._id,
        currentStage: "Applied",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
    ]);

    const resJobA = await request(app)
      .get(`/api/v1/analytics/overview?jobId=${jobA._id.toString()}`)
      .set("Cookie", recruiterCookie);

    expect(resJobA.status).toBe(200);
    expect(resJobA.body.data.totals.activeApplications).toBe(1);

    const resJobB = await request(app)
      .get(`/api/v1/analytics/overview?jobId=${jobB._id.toString()}`)
      .set("Cookie", recruiterCookie);

    expect(resJobB.status).toBe(200);
    expect(resJobB.body.data.totals.activeApplications).toBe(1);
  });

  it("3. GET /api/v1/analytics/platform returns platform-wide metrics and enforces platform_manager authorization", async () => {
    // 1. Forbidden for recruiter role
    const forbiddenRes = await request(app)
      .get("/api/v1/analytics/platform")
      .set("Cookie", recruiterCookie);

    expect(forbiddenRes.status).toBe(403);

    // 2. Allowed for platform manager
    await ResumeFile.create({
      candidateUserId: candidateUser._id,
      originalFilename: "resume.pdf",
      storedFilename: "stored_123.pdf",
      storagePath: "/tmp/stored_123.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 1024,
      contentSha256: "abc123sha",
      parsedText: "sample text",
      parsingStatus: "completed",
    });

    const successRes = await request(app)
      .get("/api/v1/analytics/platform")
      .set("Cookie", adminCookie);

    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);
    const { data } = successRes.body;

    expect(data.users).toBeDefined();
    expect(data.users.total).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(data.users.distribution)).toBe(true);

    expect(data.resumes).toBeDefined();
    expect(data.resumes.counts.completed).toBe(1);
    expect(data.resumes.successRate).toBe(100);

    expect(data.jobs).toBeDefined();
    expect(data.platform).toBeDefined();
  });

  it("4. GET /api/v1/analytics/candidate returns candidate-specific application stats with zero data leakage", async () => {
    const otherCandidateUser = await User.create({
      name: "Other Candidate",
      email: "other@example.com",
      passwordHash: await User.hashPassword("StrongPass!123"),
      role: "candidate",
      isActive: true,
    });

    const otherCandidateProfile = await Candidate.create({
      name: "Other Candidate",
      email: "other@example.com",
      skills: ["Java"],
      source: "Other",
      createdBy: otherCandidateUser._id,
      updatedBy: otherCandidateUser._id,
    });

    const job = await Job.create({
      title: "Backend Engineer",
      department: "Tech",
      location: "Remote",
      employmentType: "FullTime",
      description: "Backend role",
      status: "Open",
      ownerId: recruiterUser._id,
    });

    // 1 app for Jane Candidate, 1 app for Other Candidate
    await Application.create([
      {
        candidateId: candidateProfile._id,
        jobId: job._id,
        recruiterId: recruiterUser._id,
        currentStage: "Interview",
        status: "Active",
        atsSnapshot: {
          overallScore: 91,
          breakdown: { skillsScore: 90, experienceScore: 90, educationScore: 90, roleRelevanceScore: 94 },
          status: "completed",
          provider: "mock",
          model: "gemini-1.5-flash",
          resumeVersion: 1,
          promptVersion: "1.0",
          rubricVersion: "1.0",
          assessedAt: new Date(),
        },
        createdBy: candidateUser._id,
        updatedBy: candidateUser._id,
      },
      {
        candidateId: otherCandidateProfile._id,
        jobId: job._id,
        recruiterId: recruiterUser._id,
        currentStage: "Applied",
        status: "Active",
        createdBy: otherCandidateUser._id,
        updatedBy: otherCandidateUser._id,
      },
    ]);

    const res = await request(app)
      .get("/api/v1/analytics/candidate")
      .set("Cookie", candidateCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { data } = res.body;

    // Jane has only 1 application, in Interview
    expect(data.totalApplications).toBe(1);
    expect(data.stageDistribution.Interview).toBe(1);
    expect(data.stageDistribution.Applied).toBe(0);
    expect(data.averageAtsScore).toBe(91);
  });

  it("5. SSE Event Hub registers connections and correctly broadcasts events", async () => {
    let receivedPayload = "";
    const mockRes = {
      write: (chunk: string) => {
        receivedPayload += chunk;
        return true;
      },
      on: () => {},
    } as unknown as import("express").Response;

    sseEventHub.registerClient({
      id: "test-client-1",
      userId: recruiterUser.id,
      role: "recruiter",
      canonicalRole: "hiring_team",
      res: mockRes,
    });

    expect(receivedPayload).toContain("analytics:invalidated");

    // Broadcast a mutation event
    sseEventHub.broadcast({
      type: "application:created",
      entity: "application",
      entityId: "app-123",
      timestamp: new Date().toISOString(),
    });

    expect(receivedPayload).toContain("application:created");
    expect(receivedPayload).toContain("app-123");

    sseEventHub.unregisterClient("test-client-1");
  });
});

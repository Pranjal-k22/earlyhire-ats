import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { app } from "../app.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { Candidate } from "../models/candidate.model.js";
import { Application } from "../models/application.model.js";
import { InterviewStageHistory } from "../models/stageHistory.model.js";
import { signToken, AUTH_COOKIE_NAME } from "../utils/jwt.js";

describe("Phase 7 — Recruitment Analytics & Dashboard KPIs Test Suite", () => {
  let recruiterUser: InstanceType<typeof User>;
  let adminUser: InstanceType<typeof User>;
  let recruiterCookie: string;
  let adminCookie: string;

  beforeAll(async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/earlyai_ats_test";
    await connectDB();

    await User.deleteMany({});
    await Job.deleteMany({});
    await Candidate.deleteMany({});
    await Application.deleteMany({});
    await InterviewStageHistory.deleteMany({});

    adminUser = await User.create({
      name: "Admin Analytics",
      email: "admin.analytics@example.com",
      passwordHash: await User.hashPassword("StrongPass!123"),
      role: "admin",
      isActive: true,
    });

    recruiterUser = await User.create({
      name: "Lead Recruiter",
      email: "recruiter.analytics@example.com",
      passwordHash: await User.hashPassword("StrongPass!123"),
      role: "recruiter",
      isActive: true,
    });

    adminCookie = `${AUTH_COOKIE_NAME}=${signToken({ id: adminUser.id, role: adminUser.role })}`;
    recruiterCookie = `${AUTH_COOKIE_NAME}=${signToken({ id: recruiterUser.id, role: recruiterUser.role })}`;
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await disconnectDB();
    }
  });

  beforeEach(async () => {
    await Application.deleteMany({});
    await InterviewStageHistory.deleteMany({});
    await Candidate.deleteMany({});
    await Job.deleteMany({});
  });

  const createCandidate = async (override: Record<string, unknown> = {}) => {
    return await Candidate.create({
      name: "Dev Candidate",
      fullName: "Dev Candidate",
      email: `cand.${new mongoose.Types.ObjectId().toString().slice(-6)}@example.com`,
      experienceYears: 4,
      skills: ["TypeScript", "React"],
      source: "LinkedIn",
      createdBy: recruiterUser._id,
      updatedBy: recruiterUser._id,
      ...override,
    });
  };

  const createJob = async (override: Record<string, unknown> = {}) => {
    return await Job.create({
      title: "Senior Full Stack Engineer",
      department: "Engineering",
      location: "Bengaluru",
      employmentType: "FullTime",
      description: "Build robust recruitment tools.",
      requirements: ["TypeScript", "Node.js", "MongoDB"],
      status: "Open",
      ownerId: recruiterUser._id,
      ...override,
    });
  };

  it("1. Returns valid numeric zeros and null conversions when dataset is empty", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/overview")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { data } = res.body;
    expect(data.totalCandidates).toBe(0);
    expect(data.openPositions).toBe(0);
    expect(data.hiredCandidates).toBe(0);
    expect(data.rejectedCandidates).toBe(0);
    expect(data.screeningConversionRate).toBeNull();
    expect(data.interviewConversionRate).toBeNull();
    expect(data.offerAcceptanceRate).toBeNull();
    expect(data.applicationsByStage).toEqual({
      Applied: 0,
      Screening: 0,
      Interview: 0,
      Offer: 0,
      Hired: 0,
      Rejected: 0,
    });
    expect(data.averageTimeInStageMs).toEqual({
      Applied: null,
      Screening: null,
      Interview: null,
      Offer: null,
    });
  });

  it("2. Counts total active candidates and excludes archived candidates", async () => {
    await createCandidate({ name: "Active 1" });
    await createCandidate({ name: "Active 2" });
    await createCandidate({ name: "Archived Candidate", archivedAt: new Date() });

    const res = await request(app)
      .get("/api/v1/analytics/overview")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.totalCandidates).toBe(2);
  });

  it("3. Counts open positions and excludes non-open or archived jobs", async () => {
    await createJob({ title: "Open Role 1", status: "Open" });
    await createJob({ title: "Open Role 2", status: "Open" });
    await createJob({ title: "Paused Role", status: "Paused" });
    await createJob({ title: "Closed Role", status: "Closed" });
    await createJob({ title: "Archived Role", status: "Archived", archivedAt: new Date() });

    const res = await request(app)
      .get("/api/v1/analytics/overview")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.openPositions).toBe(2);
  });

  it("4. Counts hired and rejected candidates by distinct candidate IDs", async () => {
    const cand1 = await createCandidate({ name: "Hired Twice Person" });
    const cand2 = await createCandidate({ name: "Single Hired Person" });
    const cand3 = await createCandidate({ name: "Rejected Person" });
    const job1 = await createJob({ title: "Job 1" });
    const job2 = await createJob({ title: "Job 2" });

    // cand1 hired in job1 and job2 (withdrawn from job1 or successive active)
    await Application.create([
      {
        candidateId: cand1._id,
        jobId: job1._id,
        recruiterId: recruiterUser._id,
        stage: "Hired",
        currentStage: "Hired",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        candidateId: cand1._id,
        jobId: job2._id,
        recruiterId: recruiterUser._id,
        stage: "Hired",
        currentStage: "Hired",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        candidateId: cand2._id,
        jobId: job1._id,
        recruiterId: recruiterUser._id,
        stage: "Hired",
        currentStage: "Hired",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        candidateId: cand3._id,
        jobId: job1._id,
        recruiterId: recruiterUser._id,
        stage: "Rejected",
        currentStage: "Rejected",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
    ]);

    const res = await request(app)
      .get("/api/v1/analytics/overview")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    // Even though there are 3 hired applications, there are only 2 distinct hired candidates (cand1, cand2)
    expect(res.body.data.hiredCandidates).toBe(2);
    expect(res.body.data.rejectedCandidates).toBe(1);
  });

  it("5. Computes correct applications by current stage distribution and excludes withdrawn/archived", async () => {
    const job = await createJob();
    const cand = await createCandidate();

    await Application.create([
      {
        candidateId: cand._id,
        jobId: job._id,
        recruiterId: recruiterUser._id,
        currentStage: "Applied",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        candidateId: (await createCandidate())._id,
        jobId: job._id,
        recruiterId: recruiterUser._id,
        currentStage: "Screening",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        candidateId: (await createCandidate())._id,
        jobId: job._id,
        recruiterId: recruiterUser._id,
        currentStage: "Interview",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        candidateId: (await createCandidate())._id,
        jobId: job._id,
        recruiterId: recruiterUser._id,
        currentStage: "Offer",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        candidateId: (await createCandidate())._id,
        jobId: job._id,
        recruiterId: recruiterUser._id,
        currentStage: "Hired",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        candidateId: (await createCandidate())._id,
        jobId: job._id,
        recruiterId: recruiterUser._id,
        currentStage: "Rejected",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      // Withdrawn and Archived applications must be excluded
      {
        candidateId: (await createCandidate())._id,
        jobId: job._id,
        recruiterId: recruiterUser._id,
        currentStage: "Screening",
        status: "Withdrawn",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        candidateId: (await createCandidate())._id,
        jobId: job._id,
        recruiterId: recruiterUser._id,
        currentStage: "Interview",
        status: "Archived",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
    ]);

    const res = await request(app)
      .get("/api/v1/analytics/overview")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.applicationsByStage).toEqual({
      Applied: 1,
      Screening: 1,
      Interview: 1,
      Offer: 1,
      Hired: 1,
      Rejected: 1,
    });
    expect(res.body.data.totals.activeApplications).toBe(6);
  });

  it("6. Computes recruitment funnel conversion rates based on a known cohort", async () => {
    // Known cohort: 10 applications created
    // 8 reached Screening (8/10 = 0.8)
    // 4 reached Interview (4/8 = 0.5)
    // 2 reached Offer
    // Resolved offers: 1 transitioned Offer -> Hired, 1 transitioned Offer -> Rejected
    // Offer acceptance rate: 1 / (1 + 1) = 0.5 (50%)
    const job = await createJob();

    // App 1 & 2: Remain in Applied (did not reach Screening)
    for (let i = 0; i < 2; i++) {
      const cand = await createCandidate();
      const app = await Application.create({
        candidateId: cand._id,
        jobId: job._id,
        recruiterId: recruiterUser._id,
        currentStage: "Applied",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      });
      await InterviewStageHistory.create({
        applicationId: app._id,
        fromStage: null,
        toStage: "Applied",
        actorId: recruiterUser._id,
      });
    }

    // App 3, 4, 5, 6: Reached Screening, stayed or rejected at Screening
    for (let i = 0; i < 4; i++) {
      const cand = await createCandidate();
      const app = await Application.create({
        candidateId: cand._id,
        jobId: job._id,
        recruiterId: recruiterUser._id,
        currentStage: i % 2 === 0 ? "Screening" : "Rejected",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      });
      await InterviewStageHistory.create([
        { applicationId: app._id, fromStage: null, toStage: "Applied", actorId: recruiterUser._id },
        { applicationId: app._id, fromStage: "Applied", toStage: "Screening", actorId: recruiterUser._id },
        ...(i % 2 !== 0
          ? [{ applicationId: app._id, fromStage: "Screening", toStage: "Rejected", actorId: recruiterUser._id }]
          : []),
      ]);
    }

    // App 7 & 8: Reached Interview, stayed in Interview
    for (let i = 0; i < 2; i++) {
      const cand = await createCandidate();
      const app = await Application.create({
        candidateId: cand._id,
        jobId: job._id,
        recruiterId: recruiterUser._id,
        currentStage: "Interview",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      });
      await InterviewStageHistory.create([
        { applicationId: app._id, fromStage: null, toStage: "Applied", actorId: recruiterUser._id },
        { applicationId: app._id, fromStage: "Applied", toStage: "Screening", actorId: recruiterUser._id },
        { applicationId: app._id, fromStage: "Screening", toStage: "Interview", actorId: recruiterUser._id },
      ]);
    }

    // App 9: Reached Offer -> transitioned to Hired
    const cand9 = await createCandidate();
    const app9 = await Application.create({
      candidateId: cand9._id,
      jobId: job._id,
      recruiterId: recruiterUser._id,
      currentStage: "Hired",
      status: "Active",
      createdBy: recruiterUser._id,
      updatedBy: recruiterUser._id,
    });
    await InterviewStageHistory.create([
      { applicationId: app9._id, fromStage: null, toStage: "Applied", actorId: recruiterUser._id },
      { applicationId: app9._id, fromStage: "Applied", toStage: "Screening", actorId: recruiterUser._id },
      { applicationId: app9._id, fromStage: "Screening", toStage: "Interview", actorId: recruiterUser._id },
      { applicationId: app9._id, fromStage: "Interview", toStage: "Offer", actorId: recruiterUser._id },
      { applicationId: app9._id, fromStage: "Offer", toStage: "Hired", actorId: recruiterUser._id },
    ]);

    // App 10: Reached Offer -> transitioned to Rejected
    const cand10 = await createCandidate();
    const app10 = await Application.create({
      candidateId: cand10._id,
      jobId: job._id,
      recruiterId: recruiterUser._id,
      currentStage: "Rejected",
      status: "Active",
      createdBy: recruiterUser._id,
      updatedBy: recruiterUser._id,
    });
    await InterviewStageHistory.create([
      { applicationId: app10._id, fromStage: null, toStage: "Applied", actorId: recruiterUser._id },
      { applicationId: app10._id, fromStage: "Applied", toStage: "Screening", actorId: recruiterUser._id },
      { applicationId: app10._id, fromStage: "Screening", toStage: "Interview", actorId: recruiterUser._id },
      { applicationId: app10._id, fromStage: "Interview", toStage: "Offer", actorId: recruiterUser._id },
      { applicationId: app10._id, fromStage: "Offer", toStage: "Rejected", actorId: recruiterUser._id },
    ]);

    const res = await request(app)
      .get("/api/v1/analytics/overview")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    const { data } = res.body;

    // Total cohort = 10
    // Reached screening: Apps 3,4,5,6,7,8,9,10 = 8. (8 / 10 = 0.8)
    expect(data.screeningConversionRate).toBe(0.8);

    // Reached interview: Apps 7,8,9,10 = 4. (4 / 8 = 0.5)
    expect(data.interviewConversionRate).toBe(0.5);

    // Offer acceptance: 1 Hired, 1 Rejected after Offer -> 1 / (1 + 1) = 0.5
    expect(data.offerAcceptanceRate).toBe(0.5);
  });

  it("7. Excludes unresolved / pending offers from the offer acceptance rate denominator", async () => {
    const job = await createJob();

    // 1 app currently in Offer (unresolved)
    const cand1 = await createCandidate();
    const app1 = await Application.create({
      candidateId: cand1._id,
      jobId: job._id,
      recruiterId: recruiterUser._id,
      currentStage: "Offer",
      status: "Active",
      createdBy: recruiterUser._id,
      updatedBy: recruiterUser._id,
    });
    await InterviewStageHistory.create([
      { applicationId: app1._id, fromStage: null, toStage: "Applied", actorId: recruiterUser._id },
      { applicationId: app1._id, fromStage: "Applied", toStage: "Offer", actorId: recruiterUser._id },
    ]);

    // 1 app transitioned from Offer to Hired
    const cand2 = await createCandidate();
    const app2 = await Application.create({
      candidateId: cand2._id,
      jobId: job._id,
      recruiterId: recruiterUser._id,
      currentStage: "Hired",
      status: "Active",
      createdBy: recruiterUser._id,
      updatedBy: recruiterUser._id,
    });
    await InterviewStageHistory.create([
      { applicationId: app2._id, fromStage: null, toStage: "Applied", actorId: recruiterUser._id },
      { applicationId: app2._id, fromStage: "Offer", toStage: "Hired", actorId: recruiterUser._id },
    ]);

    const res = await request(app)
      .get("/api/v1/analytics/overview")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    // Denominator = 1 resolved offer (app2). App 1 is unresolved so excluded. Rate = 1/1 = 1.0 (100%)
    expect(res.body.data.offerAcceptanceRate).toBe(1.0);
  });

  it("8. Computes average stage duration in milliseconds from completed transitions", async () => {
    const job = await createJob();
    const cand = await createCandidate();
    const testApp = await Application.create({
      candidateId: cand._id,
      jobId: job._id,
      recruiterId: recruiterUser._id,
      currentStage: "Interview",
      status: "Active",
      createdBy: recruiterUser._id,
      updatedBy: recruiterUser._id,
    });

    // Durations: Applied = 100,000ms, Screening = 200,000ms
    await InterviewStageHistory.create([
      {
        applicationId: testApp._id,
        fromStage: null,
        toStage: "Applied",
        actorId: recruiterUser._id,
      },
      {
        applicationId: testApp._id,
        fromStage: "Applied",
        toStage: "Screening",
        actorId: recruiterUser._id,
        durationMsFromPreviousStage: 100000,
      },
      {
        applicationId: testApp._id,
        fromStage: "Screening",
        toStage: "Interview",
        actorId: recruiterUser._id,
        durationMsFromPreviousStage: 200000,
      },
    ]);

    const res = await request(app)
      .get("/api/v1/analytics/overview")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.averageTimeInStageMs.Applied).toBe(100000);
    expect(res.body.data.averageTimeInStageMs.Screening).toBe(200000);
    expect(res.body.data.averageTimeInStageMs.Interview).toBeNull();
  });

  it("9. Computes candidate sourcing distribution and percentages accurately", async () => {
    const job = await createJob();
    const candLinkedIn = await createCandidate({ source: "LinkedIn" });
    const candReferral = await createCandidate({ source: "Referral" });

    await Application.create([
      {
        candidateId: candLinkedIn._id,
        jobId: job._id,
        source: "LinkedIn",
        recruiterId: recruiterUser._id,
        currentStage: "Applied",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        candidateId: (await createCandidate({ source: "LinkedIn" }))._id,
        jobId: job._id,
        source: "LinkedIn",
        recruiterId: recruiterUser._id,
        currentStage: "Applied",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        candidateId: candReferral._id,
        jobId: job._id,
        source: "Referral",
        recruiterId: recruiterUser._id,
        currentStage: "Applied",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
    ]);

    const res = await request(app)
      .get("/api/v1/analytics/overview")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    const { sourcing } = res.body.data;
    expect(sourcing).toEqual(
      expect.arrayContaining([
        { source: "LinkedIn", count: 2, percentage: 66.7 },
        { source: "Referral", count: 1, percentage: 33.3 },
      ])
    );
  });

  it("10. Filters applications by date range correctly", async () => {
    const job = await createJob();

    // 1 Application in January 2026
    await Application.create({
      candidateId: (await createCandidate())._id,
      jobId: job._id,
      recruiterId: recruiterUser._id,
      currentStage: "Applied",
      appliedAt: new Date("2026-01-15T10:00:00.000Z"),
      status: "Active",
      createdBy: recruiterUser._id,
      updatedBy: recruiterUser._id,
    });

    // 1 Application in March 2026
    await Application.create({
      candidateId: (await createCandidate())._id,
      jobId: job._id,
      recruiterId: recruiterUser._id,
      currentStage: "Applied",
      appliedAt: new Date("2026-03-20T10:00:00.000Z"),
      status: "Active",
      createdBy: recruiterUser._id,
      updatedBy: recruiterUser._id,
    });

    // Query for February–April 2026
    const res = await request(app)
      .get("/api/v1/analytics/overview?from=2026-02-01&to=2026-04-01")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.totals.activeApplications).toBe(1);
  });

  it("11. Rejects invalid date format and reversed date range with 422 VALIDATION_ERROR", async () => {
    // Invalid date format
    const resInvalid = await request(app)
      .get("/api/v1/analytics/overview?from=not-a-date")
      .set("Cookie", recruiterCookie);

    expect(resInvalid.status).toBe(422);
    expect(resInvalid.body.error.code).toBe("VALIDATION_ERROR");

    // Reversed date range (from > to)
    const resReversed = await request(app)
      .get("/api/v1/analytics/overview?from=2026-12-31&to=2026-01-01")
      .set("Cookie", recruiterCookie);

    expect(resReversed.status).toBe(422);
    expect(resReversed.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("12. Requires authentication to access analytics endpoints", async () => {
    const res = await request(app).get("/api/v1/analytics/overview");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("13. GET /api/v1/analytics/funnel returns detailed stage conversion and dropoff metrics", async () => {
    const job = await createJob();
    const cand = await createCandidate();

    const appDoc = await Application.create({
      candidateId: cand._id,
      jobId: job._id,
      recruiterId: recruiterUser._id,
      currentStage: "Screening",
      status: "Active",
      createdBy: recruiterUser._id,
      updatedBy: recruiterUser._id,
    });

    await InterviewStageHistory.create([
      { applicationId: appDoc._id, fromStage: null, toStage: "Applied", actorId: recruiterUser._id },
      { applicationId: appDoc._id, fromStage: "Applied", toStage: "Screening", actorId: recruiterUser._id },
    ]);

    const res = await request(app)
      .get("/api/v1/analytics/funnel")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalCohortApplications).toBe(1);

    const stages = res.body.data.stages;
    expect(stages).toHaveLength(5);
    expect(stages[0].stage).toBe("Applied");
    expect(stages[0].count).toBe(1);
    expect(stages[0].conversionRate).toBe(1.0);

    expect(stages[1].stage).toBe("Screening");
    expect(stages[1].count).toBe(1);
    expect(stages[1].conversionRate).toBe(1.0);

    expect(stages[2].stage).toBe("Interview");
    expect(stages[2].count).toBe(0);
    expect(stages[2].conversionRate).toBe(0);
    expect(stages[2].dropoffRate).toBe(1.0);
  });

  it("14. GET /api/v1/dashboard/metrics alias returns identical contract to analytics/overview", async () => {
    const res = await request(app)
      .get("/api/v1/dashboard/metrics")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totals).toBeDefined();
    expect(res.body.data.applicationsByStage).toBeDefined();
    expect(res.body.data.conversion).toBeDefined();
    expect(res.body.data.generatedAt).toBeDefined();
  });

  it("15. Allows admin role to access analytics overview endpoints", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/overview")
      .set("Cookie", adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totals.totalCandidates).toBeDefined();
  });
});

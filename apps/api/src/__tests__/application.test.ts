import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { Application } from "../models/application.model.js";
import { InterviewStageHistory } from "../models/stageHistory.model.js";
import { Candidate } from "../models/candidate.model.js";
import { Job } from "../models/job.model.js";
import { User, IUserDocument } from "../models/user.model.js";
import { signToken, AUTH_COOKIE_NAME } from "../utils/jwt.js";

const TEST_DB_URI = process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/earlyai_ats_test";

describe("Phase 5 — Applications, Hiring Pipeline & Stage History Integration Test Suite", () => {
  let app: ReturnType<typeof createApp>;

  let adminUser: IUserDocument;
  let recruiterUser: IUserDocument;
  let hiringManagerUser: IUserDocument;

  let adminCookie: string;
  let recruiterCookie: string;
  let hiringManagerCookie: string;

  beforeAll(async () => {
    await connectDB(TEST_DB_URI);
    app = createApp();

    await User.deleteMany({});

    adminUser = await User.create({
      name: "Admin User",
      email: "admin.pipeline@example.com",
      passwordHash: await User.hashPassword("StrongPass!234"),
      role: "admin",
      isActive: true,
    });

    recruiterUser = await User.create({
      name: "Recruiter User",
      email: "recruiter.pipeline@example.com",
      passwordHash: await User.hashPassword("StrongPass!234"),
      role: "recruiter",
      isActive: true,
    });

    hiringManagerUser = await User.create({
      name: "Hiring Manager",
      email: "hm.pipeline@example.com",
      passwordHash: await User.hashPassword("StrongPass!234"),
      role: "hiring_manager",
      isActive: true,
    });

    adminCookie = `${AUTH_COOKIE_NAME}=${signToken({ id: adminUser.id, role: adminUser.role })}`;
    recruiterCookie = `${AUTH_COOKIE_NAME}=${signToken({ id: recruiterUser.id, role: recruiterUser.role })}`;
    hiringManagerCookie = `${AUTH_COOKIE_NAME}=${signToken({ id: hiringManagerUser.id, role: hiringManagerUser.role })}`;
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

    // Ensure fixture users are intact
    await User.updateOne({ _id: adminUser._id }, { $set: { isActive: true } });
    await User.updateOne({ _id: recruiterUser._id }, { $set: { isActive: true } });
    await User.updateOne({ _id: hiringManagerUser._id }, { $set: { isActive: true } });
  });

  // Helper to create a valid test candidate
  const createTestCandidate = async (email = "mira.test@example.com") => {
    return await Candidate.create({
      name: "Mira Test",
      fullName: "Mira Test",
      email,
      experienceYears: 4,
      skills: ["React", "TypeScript"],
      source: "Referral",
      createdBy: recruiterUser._id,
      updatedBy: recruiterUser._id,
    });
  };

  // Helper to create a test job
  const createTestJob = async (status: "Open" | "Paused" | "Closed" | "Archived" = "Open") => {
    return await Job.create({
      title: "Senior Frontend Engineer",
      department: "Engineering",
      location: "Bengaluru",
      employmentType: "FullTime",
      description: "Build exceptional user interfaces using React and TypeScript.",
      requirements: ["React", "TypeScript", "Node.js"],
      status,
      ownerId: adminUser._id,
      openedAt: new Date(),
    });
  };

  describe("Application Creation and Reference Validation", () => {
    it("1. Creates an application using valid candidate and job references", async () => {
      const candidate = await createTestCandidate();
      const job = await createTestJob("Open");

      const res = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({
          candidateId: candidate.id,
          jobId: job.id,
          source: "LinkedIn",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application).toBeDefined();
      expect(res.body.data.application.candidateId.id || res.body.data.application.candidateId._id).toBe(candidate.id);
      expect(res.body.data.application.jobId.id || res.body.data.application.jobId._id).toBe(job.id);
      expect(res.body.data.application.stage).toBe("Applied");
      expect(res.body.data.application.currentStage).toBe("Applied");
      expect(res.body.data.application.status).toBe("Active");
    });

    it("2. Rejects missing candidate or job references", async () => {
      const res1 = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({ jobId: new mongoose.Types.ObjectId().toString() });

      expect(res1.status).toBe(422);
      expect(res1.body.success).toBe(false);

      const res2 = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({ candidateId: new mongoose.Types.ObjectId().toString() });

      expect(res2.status).toBe(422);
      expect(res2.body.success).toBe(false);
    });

    it("3. Rejects malformed IDs", async () => {
      const candidate = await createTestCandidate();

      const res = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({
          candidateId: "invalid-candidate-id",
          jobId: candidate.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_ID");
    });

    it("4. Rejects nonexistent candidates", async () => {
      const job = await createTestJob("Open");
      const fakeCandidateId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({
          candidateId: fakeCandidateId,
          jobId: job.id,
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("CANDIDATE_NOT_FOUND");
    });

    it("5. Rejects nonexistent jobs", async () => {
      const candidate = await createTestCandidate();
      const fakeJobId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({
          candidateId: candidate.id,
          jobId: fakeJobId,
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("JOB_NOT_FOUND");
    });

    it("6. Applies documented rule for paused/closed/archived jobs (rejects application)", async () => {
      const candidate1 = await createTestCandidate("c1@example.com");
      const candidate2 = await createTestCandidate("c2@example.com");
      const candidate3 = await createTestCandidate("c3@example.com");

      const pausedJob = await createTestJob("Paused");
      const closedJob = await createTestJob("Closed");
      const archivedJob = await createTestJob("Archived");

      const resPaused = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({ candidateId: candidate1.id, jobId: pausedJob.id });
      expect(resPaused.status).toBe(422);
      expect(resPaused.body.error.code).toBe("JOB_NOT_OPEN");

      const resClosed = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({ candidateId: candidate2.id, jobId: closedJob.id });
      expect(resClosed.status).toBe(422);
      expect(resClosed.body.error.code).toBe("JOB_NOT_OPEN");

      const resArchived = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({ candidateId: candidate3.id, jobId: archivedJob.id });
      expect(resArchived.status).toBe(422);
      expect(resArchived.body.error.code).toBe("JOB_NOT_OPEN");
    });

    it("7. Prevents duplicate active applications for same candidate and job", async () => {
      const candidate = await createTestCandidate();
      const job = await createTestJob("Open");

      const firstRes = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({ candidateId: candidate.id, jobId: job.id });
      expect(firstRes.status).toBe(201);

      const duplicateRes = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({ candidateId: candidate.id, jobId: job.id });
      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.error.code).toBe("DUPLICATE_APPLICATION");
    });

    it("8. Prevents concurrent requests from creating duplicate active applications", async () => {
      const candidate = await createTestCandidate();
      const job = await createTestJob("Open");

      const [resA, resB] = await Promise.all([
        request(app)
          .post("/api/v1/applications")
          .set("Cookie", recruiterCookie)
          .send({ candidateId: candidate.id, jobId: job.id }),
        request(app)
          .post("/api/v1/applications")
          .set("Cookie", recruiterCookie)
          .send({ candidateId: candidate.id, jobId: job.id }),
      ]);

      const statuses = [resA.status, resB.status];
      expect(statuses).toContain(201);
      expect(statuses).toContain(409);

      const count = await Application.countDocuments({
        candidateId: candidate._id,
        jobId: job._id,
      });
      expect(count).toBe(1);
    });

    it("9. Sets initial stage to 'Applied'", async () => {
      const candidate = await createTestCandidate();
      const job = await createTestJob("Open");

      const res = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({ candidateId: candidate.id, jobId: job.id });

      expect(res.status).toBe(201);
      expect(res.body.data.application.stage).toBe("Applied");
      expect(res.body.data.application.currentStage).toBe("Applied");
    });

    it("10. Records initial stage history according to architecture (fromStage: null, toStage: 'Applied')", async () => {
      const candidate = await createTestCandidate();
      const job = await createTestJob("Open");

      const res = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({ candidateId: candidate.id, jobId: job.id });

      const applicationId = res.body.data.application.id;

      const historyRecords = await InterviewStageHistory.find({ applicationId });
      expect(historyRecords.length).toBe(1);
      expect(historyRecords[0].fromStage).toBeNull();
      expect(historyRecords[0].toStage).toBe("Applied");
      expect(historyRecords[0].actorId.toString()).toBe(recruiterUser.id);
    });
  });

  describe("Hiring Stage State Machine Transitions", () => {
    let testApplicationId: string;

    beforeEach(async () => {
      const candidate = await createTestCandidate();
      const job = await createTestJob("Open");

      const res = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({ candidateId: candidate.id, jobId: job.id });
      testApplicationId = res.body.data.application.id;
    });

    it("11. Permits transition Applied -> Screening", async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Screening", reason: "Passed initial profile match" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application.stage).toBe("Screening");
      expect(res.body.data.application.currentStage).toBe("Screening");
      expect(res.body.data.historyEvent.fromStage).toBe("Applied");
      expect(res.body.data.historyEvent.toStage).toBe("Screening");
    });

    it("12. Permits transition Screening -> Interview", async () => {
      await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Screening" });

      const res = await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Interview", reason: "Recruiter phone screen cleared" });

      expect(res.status).toBe(200);
      expect(res.body.data.application.stage).toBe("Interview");
      expect(res.body.data.historyEvent.fromStage).toBe("Screening");
      expect(res.body.data.historyEvent.toStage).toBe("Interview");
    });

    it("13. Permits transition Interview -> Offer", async () => {
      await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Screening" });
      await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Interview" });

      const res = await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Offer", reason: "All technical rounds cleared with strong hire" });

      expect(res.status).toBe(200);
      expect(res.body.data.application.stage).toBe("Offer");
      expect(res.body.data.historyEvent.fromStage).toBe("Interview");
      expect(res.body.data.historyEvent.toStage).toBe("Offer");
    });

    it("14. Permits transition Offer -> Hired (terminal stage)", async () => {
      await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Screening" });
      await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Interview" });
      await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Offer" });

      const res = await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Hired", reason: "Offer accepted by candidate" });

      expect(res.status).toBe(200);
      expect(res.body.data.application.stage).toBe("Hired");
      expect(res.body.data.application.hiredAt).toBeDefined();
      expect(res.body.data.historyEvent.toStage).toBe("Hired");
    });

    it("15. Permits rejection from every nonterminal stage", async () => {
      // Rejection from Applied
      const candidate1 = await createTestCandidate("rej1@example.com");
      const job1 = await createTestJob("Open");
      const app1 = (
        await request(app)
          .post("/api/v1/applications")
          .set("Cookie", recruiterCookie)
          .send({ candidateId: candidate1.id, jobId: job1.id })
      ).body.data.application;

      const rej1 = await request(app)
        .patch(`/api/v1/applications/${app1.id}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Rejected", reason: "Profile not aligned" });
      expect(rej1.status).toBe(200);
      expect(rej1.body.data.application.stage).toBe("Rejected");
      expect(rej1.body.data.application.rejectedAt).toBeDefined();

      // Rejection from Screening
      const candidate2 = await createTestCandidate("rej2@example.com");
      const app2 = (
        await request(app)
          .post("/api/v1/applications")
          .set("Cookie", recruiterCookie)
          .send({ candidateId: candidate2.id, jobId: job1.id })
      ).body.data.application;
      await request(app)
        .patch(`/api/v1/applications/${app2.id}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Screening" });
      const rej2 = await request(app)
        .patch(`/api/v1/applications/${app2.id}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Rejected", reason: "Screening failed" });
      expect(rej2.status).toBe(200);
      expect(rej2.body.data.application.stage).toBe("Rejected");

      // Rejection from Interview
      const candidate3 = await createTestCandidate("rej3@example.com");
      const app3 = (
        await request(app)
          .post("/api/v1/applications")
          .set("Cookie", recruiterCookie)
          .send({ candidateId: candidate3.id, jobId: job1.id })
      ).body.data.application;
      await request(app).patch(`/api/v1/applications/${app3.id}/stage`).set("Cookie", recruiterCookie).send({ toStage: "Screening" });
      await request(app).patch(`/api/v1/applications/${app3.id}/stage`).set("Cookie", recruiterCookie).send({ toStage: "Interview" });
      const rej3 = await request(app)
        .patch(`/api/v1/applications/${app3.id}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Rejected", reason: "Technical round failed" });
      expect(rej3.status).toBe(200);
      expect(rej3.body.data.application.stage).toBe("Rejected");

      // Rejection from Offer
      const candidate4 = await createTestCandidate("rej4@example.com");
      const app4 = (
        await request(app)
          .post("/api/v1/applications")
          .set("Cookie", recruiterCookie)
          .send({ candidateId: candidate4.id, jobId: job1.id })
      ).body.data.application;
      await request(app).patch(`/api/v1/applications/${app4.id}/stage`).set("Cookie", recruiterCookie).send({ toStage: "Screening" });
      await request(app).patch(`/api/v1/applications/${app4.id}/stage`).set("Cookie", recruiterCookie).send({ toStage: "Interview" });
      await request(app).patch(`/api/v1/applications/${app4.id}/stage`).set("Cookie", recruiterCookie).send({ toStage: "Offer" });
      const rej4 = await request(app)
        .patch(`/api/v1/applications/${app4.id}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Rejected", reason: "Candidate declined offer" });
      expect(rej4.status).toBe(200);
      expect(rej4.body.data.application.stage).toBe("Rejected");
    });

    it("16. Rejects skipped or backward transitions with 422 INVALID_STAGE_TRANSITION", async () => {
      // Skipped transition: Applied -> Interview
      const skipRes = await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Interview" });
      expect(skipRes.status).toBe(422);
      expect(skipRes.body.error.code).toBe("INVALID_STAGE_TRANSITION");

      // Advance to Screening
      await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Screening" });

      // Backward transition: Screening -> Applied
      const backwardRes = await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Applied" });
      expect(backwardRes.status).toBe(422);
      expect(backwardRes.body.error.code).toBe("INVALID_STAGE_TRANSITION");
    });

    it("17. Rejects transitions from terminal stages (Hired and Rejected)", async () => {
      // Rejection terminal test
      await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Rejected", reason: "Disqualified" });

      const fromRejected = await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Applied" });
      expect(fromRejected.status).toBe(422);
      expect(fromRejected.body.error.code).toBe("INVALID_STAGE_TRANSITION");

      // Hired terminal test
      const candidate2 = await createTestCandidate("hired.term@example.com");
      const job = await createTestJob("Open");
      const app2 = (
        await request(app)
          .post("/api/v1/applications")
          .set("Cookie", recruiterCookie)
          .send({ candidateId: candidate2.id, jobId: job.id })
      ).body.data.application;

      await request(app).patch(`/api/v1/applications/${app2.id}/stage`).set("Cookie", recruiterCookie).send({ toStage: "Screening" });
      await request(app).patch(`/api/v1/applications/${app2.id}/stage`).set("Cookie", recruiterCookie).send({ toStage: "Interview" });
      await request(app).patch(`/api/v1/applications/${app2.id}/stage`).set("Cookie", recruiterCookie).send({ toStage: "Offer" });
      await request(app).patch(`/api/v1/applications/${app2.id}/stage`).set("Cookie", recruiterCookie).send({ toStage: "Hired" });

      const fromHired = await request(app)
        .patch(`/api/v1/applications/${app2.id}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Offer" });
      expect(fromHired.status).toBe(422);
      expect(fromHired.body.error.code).toBe("INVALID_STAGE_TRANSITION");
    });

    it("18. Rejects arbitrary stage changes through general PATCH endpoint", async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${testApplicationId}`)
        .set("Cookie", recruiterCookie)
        .send({ stage: "Hired" });

      expect(res.status).toBe(422);

      // Verify stage remained unchanged
      const checkApp = await Application.findById(testApplicationId);
      expect(checkApp?.stage).toBe("Applied");
    });
  });

  describe("Security, Auditing and History Integrity", () => {
    let testApplicationId: string;

    beforeEach(async () => {
      const candidate = await createTestCandidate();
      const job = await createTestJob("Open");

      const res = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({ candidateId: candidate.id, jobId: job.id });
      testApplicationId = res.body.data.application.id;
    });

    it("19. Records authenticated actor in stage transition history", async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", adminCookie)
        .send({ toStage: "Screening", reason: "Admin moved candidate" });

      expect(res.status).toBe(200);

      const history = await InterviewStageHistory.find({
        applicationId: testApplicationId,
        toStage: "Screening",
      });

      expect(history.length).toBe(1);
      expect(history[0].actorId.toString()).toBe(adminUser.id);
      expect(history[0].reason).toBe("Admin moved candidate");
    });

    it("20. Rejects unauthenticated requests", async () => {
      const resGet = await request(app).get("/api/v1/applications");
      expect(resGet.status).toBe(401);

      const resPost = await request(app)
        .post("/api/v1/applications")
        .send({ candidateId: "123", jobId: "456" });
      expect(resPost.status).toBe(401);

      const resPatch = await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .send({ toStage: "Screening" });
      expect(resPatch.status).toBe(401);
    });

    it("21. Rejects unauthorized transition requests (e.g. Hiring Manager attempting to modify stage)", async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", hiringManagerCookie)
        .send({ toStage: "Screening" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("22. Verifies application stage and history remain consistent when transition fails", async () => {
      const initialHistoryCount = await InterviewStageHistory.countDocuments({
        applicationId: testApplicationId,
      });

      // Attempt invalid transition
      const failedRes = await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Offer" }); // Invalid from Applied

      expect(failedRes.status).toBe(422);

      // Verify DB state
      const appDoc = await Application.findById(testApplicationId);
      expect(appDoc?.stage).toBe("Applied");

      const postHistoryCount = await InterviewStageHistory.countDocuments({
        applicationId: testApplicationId,
      });
      expect(postHistoryCount).toBe(initialHistoryCount);
    });

    it("23. Retrieves history in deterministic order", async () => {
      // Step 1: Applied -> Screening
      await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Screening", reason: "Step 1" });

      // Step 2: Screening -> Interview
      await request(app)
        .patch(`/api/v1/applications/${testApplicationId}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Interview", reason: "Step 2" });

      const res = await request(app)
        .get(`/api/v1/applications/${testApplicationId}/history`)
        .set("Cookie", recruiterCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.history.length).toBe(3);

      expect(res.body.data.history[0].toStage).toBe("Applied");
      expect(res.body.data.history[1].toStage).toBe("Screening");
      expect(res.body.data.history[2].toStage).toBe("Interview");
    });

    it("24. Preserves existing Candidate, Job, Auth, and Health API behavior", async () => {
      const healthRes = await request(app).get("/api/v1/health");
      expect(healthRes.status).toBe(200);

      const meRes = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", recruiterCookie);
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.email).toBe(recruiterUser.email);

      const jobsRes = await request(app)
        .get("/api/v1/jobs")
        .set("Cookie", recruiterCookie);
      expect(jobsRes.status).toBe(200);

      const candidatesRes = await request(app)
        .get("/api/v1/candidates")
        .set("Cookie", recruiterCookie);
      expect(candidatesRes.status).toBe(200);
    });
  });

  describe("Application Query and Listing Filters", () => {
    it("Filters applications by jobId and stage", async () => {
      const candidate1 = await createTestCandidate("list1@example.com");
      const candidate2 = await createTestCandidate("list2@example.com");
      const jobA = await createTestJob("Open");
      const jobB = await createTestJob("Open");

      const appA = (
        await request(app)
          .post("/api/v1/applications")
          .set("Cookie", recruiterCookie)
          .send({ candidateId: candidate1.id, jobId: jobA.id })
      ).body.data.application;

      await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({ candidateId: candidate2.id, jobId: jobB.id });

      // Move appA to Screening
      await request(app)
        .patch(`/api/v1/applications/${appA.id}/stage`)
        .set("Cookie", recruiterCookie)
        .send({ toStage: "Screening" });

      // Query by jobId=jobA.id
      const resJobA = await request(app)
        .get(`/api/v1/applications?jobId=${jobA.id}`)
        .set("Cookie", recruiterCookie);
      expect(resJobA.status).toBe(200);
      expect(resJobA.body.data.applications.length).toBe(1);

      // Query by stage=Screening
      const resScreening = await request(app)
        .get("/api/v1/applications?stage=Screening")
        .set("Cookie", recruiterCookie);
      expect(resScreening.status).toBe(200);
      expect(resScreening.body.data.applications.length).toBe(1);
      expect(resScreening.body.data.applications[0].stage).toBe("Screening");
    });
  });
});

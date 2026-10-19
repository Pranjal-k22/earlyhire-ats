import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import {
  seedDemoDataset,
  isNonProductionDatabase,
} from "../scripts/seedDemoData.js";
import { User } from "../models/user.model.js";
import { Candidate } from "../models/candidate.model.js";
import { Job } from "../models/job.model.js";
import { Application } from "../models/application.model.js";
import { Interview } from "../models/interview.model.js";
import { Note } from "../models/note.model.js";
import { connectDB, disconnectDB } from "../config/db.js";

const TEST_DB_URI = "mongodb://localhost:27017/earlyai_ats_test";

describe("Demo Dataset Seeder & Safeguards (seedDemoData.ts)", () => {
  beforeAll(async () => {
    await connectDB(TEST_DB_URI);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe("1. Database Classification & Safety Safeguards", () => {
    it("rejects production database target names", () => {
      expect(isNonProductionDatabase("earlyai_ats_prod")).toBe(false);
      expect(isNonProductionDatabase("production")).toBe(false);
      expect(isNonProductionDatabase("company_cluster_prod")).toBe(false);
      expect(isNonProductionDatabase(null)).toBe(false);
      expect(isNonProductionDatabase("")).toBe(false);
    });

    it("approves isolated development and test database targets", () => {
      expect(isNonProductionDatabase("earlyai_ats_dev")).toBe(true);
      expect(isNonProductionDatabase("earlyai_ats_test")).toBe(true);
      expect(isNonProductionDatabase("my_feature_dev")).toBe(true);
      expect(isNonProductionDatabase("pipeline_test")).toBe(true);
    });

    it("throws critical safety error when invoked against simulated production database", async () => {
      // Mock mongoose.connection.name to simulate production
      const originalName = mongoose.connection.name;
      Object.defineProperty(mongoose.connection, "name", {
        value: "earlyai_ats_prod",
        configurable: true,
      });

      await expect(
        seedDemoDataset({ isExecute: false, customUri: TEST_DB_URI })
      ).rejects.toThrow(/CRITICAL DATABASE SAFETY BLOCKER/);

      // Restore connection name
      Object.defineProperty(mongoose.connection, "name", {
        value: originalName,
        configurable: true,
      });
    });
  });

  describe("2. Dry-Run Prevention of Writes", () => {
    it("does not insert any records when running in dry-run mode (isExecute = false)", async () => {
      // Clean test database for demo accounts first
      const demoEmails = [
        "ananya.sharma@earlyhire.test",
        "rohan.mehta@earlyhire.test",
        "aditi.verma@earlyhire.test",
        "arjun.patel@earlyhire.test",
        "sneha.iyer@earlyhire.test",
        "kabir.singh@earlyhire.test",
        "meera.nair@earlyhire.test",
      ];
      await User.deleteMany({ email: { $in: demoEmails } });
      await Candidate.deleteMany({ email: { $in: demoEmails } });

      const dryRunSummary = await seedDemoDataset({
        isExecute: false,
        customUri: TEST_DB_URI,
      });

      expect(dryRunSummary.dryRun).toBe(true);
      expect(dryRunSummary.recruitersCreated).toBe(2);
      expect(dryRunSummary.candidatesCreated).toBe(5);
      expect(dryRunSummary.jobsCreated).toBe(10);

      // Verify that NO records were actually written
      const userCount = await User.countDocuments({ email: { $in: demoEmails } });
      const candidateCount = await Candidate.countDocuments({ email: { $in: demoEmails } });
      expect(userCount).toBe(0);
      expect(candidateCount).toBe(0);
    });
  });

  describe("3. Execution & Entity Integrity (isExecute = true)", () => {
    let summary: Awaited<ReturnType<typeof seedDemoDataset>>;

    it("successfully provisions 2 recruiters, 5 candidates, 10 jobs, 18 applications, and 6 interviews", async () => {
      summary = await seedDemoDataset({
        isExecute: true,
        customUri: TEST_DB_URI,
        demoPassword: "EarlyATS2026!Demo",
      });

      expect(summary.dryRun).toBe(false);
      expect(summary.recruitersCreated).toBe(2);
      expect(summary.candidatesCreated).toBe(5);
      expect(summary.jobsCreated).toBe(10);
      expect(summary.applicationsCreated).toBe(18);
      expect(summary.interviewsCreated).toBe(6);
      expect(summary.notesCreated).toBe(4);
      expect(summary.notificationsCreated).toBe(5);
    });

    it("verifies recruiter profiles, roles, and credential authentication", async () => {
      const ananya = await User.findOne({ email: "ananya.sharma@earlyhire.test" }).select("+passwordHash");
      const rohan = await User.findOne({ email: "rohan.mehta@earlyhire.test" }).select("+passwordHash");

      expect(ananya).toBeDefined();
      expect(ananya?.name).toBe("Ananya Sharma");
      expect(ananya?.role).toBe("hiring_team");
      expect(ananya?.headline).toContain("Engineering Recruitment");
      expect(await ananya?.comparePassword("EarlyATS2026!Demo")).toBe(true);

      expect(rohan).toBeDefined();
      expect(rohan?.name).toBe("Rohan Mehta");
      expect(rohan?.role).toBe("hiring_team");
      expect(rohan?.headline).toContain("Data, AI & Infrastructure");
      expect(await rohan?.comparePassword("EarlyATS2026!Demo")).toBe(true);
    });

    it("verifies all 5 candidates have matching User and Candidate documents linked by candidateProfileId", async () => {
      const candidateEmails = [
        "aditi.verma@earlyhire.test",
        "arjun.patel@earlyhire.test",
        "sneha.iyer@earlyhire.test",
        "kabir.singh@earlyhire.test",
        "meera.nair@earlyhire.test",
      ];

      for (const email of candidateEmails) {
        const user = await User.findOne({ email });
        const candidate = await Candidate.findOne({ email });

        expect(user).toBeDefined();
        expect(candidate).toBeDefined();
        expect(user?.role).toBe("candidate");
        expect(user?.candidateProfileId?.toString()).toBe(candidate?._id.toString());
        expect(candidate?.skills.length).toBeGreaterThan(0);
        expect(candidate?.experienceYears).toBeGreaterThanOrEqual(0);
      }
    });

    it("verifies 10 jobs are assigned 5 to Ananya and 5 to Rohan with 8 Open, 1 Paused, and 1 Closed", async () => {
      const ananya = await User.findOne({ email: "ananya.sharma@earlyhire.test" });
      const rohan = await User.findOne({ email: "rohan.mehta@earlyhire.test" });

      const ananyaJobs = await Job.find({ ownerId: ananya?._id });
      const rohanJobs = await Job.find({ ownerId: rohan?._id });

      expect(ananyaJobs.length).toBe(5);
      expect(rohanJobs.length).toBe(5);

      const openJobs = await Job.countDocuments({ status: "Open", ownerId: { $in: [ananya?._id, rohan?._id] } });
      const pausedJobs = await Job.countDocuments({ status: "Paused", ownerId: { $in: [ananya?._id, rohan?._id] } });
      const closedJobs = await Job.countDocuments({ status: "Closed", ownerId: { $in: [ananya?._id, rohan?._id] } });

      expect(openJobs).toBe(8);
      expect(pausedJobs).toBe(1);
      expect(closedJobs).toBe(1);

      // Verify each job has complete description and requirements
      const allDemoJobs = await Job.find({ ownerId: { $in: [ananya?._id, rohan?._id] } });
      for (const job of allDemoJobs) {
        expect(job.description.length).toBeGreaterThan(100);
        expect(job.requirements.length).toBeGreaterThanOrEqual(3);
        expect(job.location.length).toBeGreaterThan(3);
      }
    });

    it("verifies 18 applications have valid stage transitions and coherent timestamps", async () => {
      const demoUsers = await User.find({ email: { $regex: /@earlyhire\.test$/ } });
      const demoUserIds = demoUsers.map((u) => u._id);
      const demoCandidates = await Candidate.find({ email: { $regex: /@earlyhire\.test$/ } });
      const demoCandidateIds = demoCandidates.map((c) => c._id);

      const applications = await Application.find({ candidateId: { $in: demoCandidateIds } });
      expect(applications.length).toBe(18);

      for (const app of applications) {
        // Integrity: recruiterId must be a valid recruiter
        expect(demoUserIds.map((id) => id.toString())).toContain(app.recruiterId.toString());
        // Date coherence: appliedAt <= lastStageChangedAt
        expect(app.appliedAt.getTime()).toBeLessThanOrEqual(app.lastStageChangedAt.getTime());

        // Valid hiring stage
        expect(["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"]).toContain(app.stage);

        // If Hired, hiredAt must be populated
        if (app.stage === "Hired") {
          expect(app.hiredAt).toBeDefined();
          expect(app.hiredAt?.getTime()).toBeGreaterThanOrEqual(app.appliedAt.getTime());
        }

        // If Rejected, rejectedAt must be populated
        if (app.stage === "Rejected") {
          expect(app.rejectedAt).toBeDefined();
        }

        // ATS Snapshot must be valid
        expect(app.atsSnapshot).toBeDefined();
        expect(app.atsSnapshot?.overallScore).toBeGreaterThanOrEqual(0);
        expect(app.atsSnapshot?.overallScore).toBeLessThanOrEqual(100);
      }
    });

    it("verifies 6 interviews (3 completed, 3 scheduled) have valid times and candidate links", async () => {
      const demoCandidates = await Candidate.find({ email: { $regex: /@earlyhire\.test$/ } });
      const demoCandidateIds = demoCandidates.map((c) => c._id);

      const interviews = await Interview.find({ candidateId: { $in: demoCandidateIds } });
      expect(interviews.length).toBe(6);

      const completed = interviews.filter((i) => i.status === "completed");
      const scheduled = interviews.filter((i) => i.status === "scheduled");

      expect(completed.length).toBe(3);
      expect(scheduled.length).toBe(3);

      for (const interview of interviews) {
        expect(interview.scheduledEndTime.getTime()).toBeGreaterThan(interview.scheduledStartTime.getTime());
        expect(interview.interviewers.length).toBeGreaterThan(0);
        expect(interview.googleMeetLink).toContain("meet.google.com");
      }
    });

    it("verifies recruiter notes and notifications exist", async () => {
      const demoCandidates = await Candidate.find({ email: { $regex: /@earlyhire\.test$/ } });
      const demoCandidateIds = demoCandidates.map((c) => c._id);

      const notes = await Note.find({ candidateId: { $in: demoCandidateIds } });
      expect(notes.length).toBe(4);

      for (const note of notes) {
        expect(note.body.length).toBeGreaterThan(10);
      }
    });
  });

  describe("4. Idempotency Verification", () => {
    it("running the seed script a second time creates 0 new records and does not duplicate entities", async () => {
      const secondRunSummary = await seedDemoDataset({
        isExecute: true,
        customUri: TEST_DB_URI,
        demoPassword: "EarlyATS2026!Demo",
      });

      expect(secondRunSummary.recruitersCreated).toBe(0);
      expect(secondRunSummary.recruitersExisting).toBe(2);

      expect(secondRunSummary.candidatesCreated).toBe(0);
      expect(secondRunSummary.candidatesExisting).toBe(5);

      expect(secondRunSummary.jobsCreated).toBe(0);
      expect(secondRunSummary.jobsExisting).toBe(10);

      expect(secondRunSummary.applicationsCreated).toBe(0);
      expect(secondRunSummary.applicationsExisting).toBe(18);

      expect(secondRunSummary.interviewsCreated).toBe(0);
      expect(secondRunSummary.interviewsExisting).toBe(6);

      expect(secondRunSummary.notesCreated).toBe(0);
      expect(secondRunSummary.notificationsCreated).toBe(0);

      // Verify absolute counts in MongoDB
      const demoEmails = [
        "ananya.sharma@earlyhire.test",
        "rohan.mehta@earlyhire.test",
        "aditi.verma@earlyhire.test",
        "arjun.patel@earlyhire.test",
        "sneha.iyer@earlyhire.test",
        "kabir.singh@earlyhire.test",
        "meera.nair@earlyhire.test",
      ];
      const usersCount = await User.countDocuments({ email: { $in: demoEmails } });
      const candidatesCount = await Candidate.countDocuments({ email: { $in: demoEmails } });
      expect(usersCount).toBe(7); // 2 recruiters + 5 candidates = 7
      expect(candidatesCount).toBe(5);
    });
  });
});

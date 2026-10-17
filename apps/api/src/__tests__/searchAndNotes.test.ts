import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { Note } from "../models/note.model.js";
import { Candidate } from "../models/candidate.model.js";
import { Job } from "../models/job.model.js";
import { Application } from "../models/application.model.js";
import { User, IUserDocument } from "../models/user.model.js";
import { signToken, AUTH_COOKIE_NAME } from "../utils/jwt.js";

const TEST_DB_URI = process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/earlyai_ats_test";

describe("Phase 6 — Search, Advanced Filters & Recruiter Notes Test Suite", () => {
  let app: ReturnType<typeof createApp>;

  let adminUser: IUserDocument;
  let recruiterUser: IUserDocument;
  let otherRecruiterUser: IUserDocument;
  let hiringManagerUser: IUserDocument;

  let adminCookie: string;
  let recruiterCookie: string;
  let otherRecruiterCookie: string;
  let hiringManagerCookie: string;

  beforeAll(async () => {
    await connectDB(TEST_DB_URI);
    app = createApp();

    await User.deleteMany({});

    adminUser = await User.create({
      name: "Admin Reviewer",
      email: "admin.notes@example.com",
      passwordHash: await User.hashPassword("StrongPass!234"),
      role: "admin",
      isActive: true,
    });

    recruiterUser = await User.create({
      name: "Primary Recruiter",
      email: "recruiter.notes@example.com",
      passwordHash: await User.hashPassword("StrongPass!234"),
      role: "recruiter",
      isActive: true,
    });

    otherRecruiterUser = await User.create({
      name: "Secondary Recruiter",
      email: "other.recruiter@example.com",
      passwordHash: await User.hashPassword("StrongPass!234"),
      role: "recruiter",
      isActive: true,
    });

    hiringManagerUser = await User.create({
      name: "Hiring Manager Lead",
      email: "hm.notes@example.com",
      passwordHash: await User.hashPassword("StrongPass!234"),
      role: "hiring_manager",
      isActive: true,
    });

    adminCookie = `${AUTH_COOKIE_NAME}=${signToken({ id: adminUser.id, role: adminUser.role })}`;
    recruiterCookie = `${AUTH_COOKIE_NAME}=${signToken({ id: recruiterUser.id, role: recruiterUser.role })}`;
    otherRecruiterCookie = `${AUTH_COOKIE_NAME}=${signToken({ id: otherRecruiterUser.id, role: otherRecruiterUser.role })}`;
    hiringManagerCookie = `${AUTH_COOKIE_NAME}=${signToken({ id: hiringManagerUser.id, role: hiringManagerUser.role })}`;
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await disconnectDB();
    }
  });

  beforeEach(async () => {
    await Note.deleteMany({});
    await Application.deleteMany({});
    await Candidate.deleteMany({});
    await Job.deleteMany({});
  });

  const createCandidateFixture = async (override: Record<string, unknown> = {}) => {
    return await Candidate.create({
      name: "Aarav Patel",
      fullName: "Aarav Patel",
      email: "aarav.patel@example.com",
      experienceYears: 5,
      skills: ["React", "TypeScript", "Node.js"],
      source: "Referral",
      currentTitle: "Full Stack Developer",
      createdBy: recruiterUser._id,
      updatedBy: recruiterUser._id,
      ...override,
    });
  };

  const createJobFixture = async (override: Record<string, unknown> = {}) => {
    return await Job.create({
      title: "Backend Platform Engineer",
      department: "Engineering",
      location: "Bengaluru / Hybrid",
      employmentType: "FullTime",
      description: "Build distributed microservices.",
      requirements: ["Node.js", "TypeScript", "MongoDB"],
      status: "Open",
      ownerId: adminUser._id,
      openedAt: new Date(),
      ...override,
    });
  };

  describe("Recruiter Notes API & Lifecycle", () => {
    it("1. Creates a valid recruiter note on a candidate", async () => {
      const candidate = await createCandidateFixture();

      const res = await request(app)
        .post(`/api/v1/candidates/${candidate.id}/notes`)
        .set("Cookie", recruiterCookie)
        .send({
          body: "Spoke with Aarav today. Strong technical background and clear communication.",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.note).toBeDefined();
      expect(res.body.data.note.body).toContain("Strong technical background");
      expect(res.body.data.note.authorId.name).toBe("Primary Recruiter");
    });

    it("2. Rejects empty note text", async () => {
      const candidate = await createCandidateFixture();

      const res = await request(app)
        .post(`/api/v1/candidates/${candidate.id}/notes`)
        .set("Cookie", recruiterCookie)
        .send({ body: "   " });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it("3. Rejects overlong note text (> 5000 characters)", async () => {
      const candidate = await createCandidateFixture();
      const longText = "a".repeat(5001);

      const res = await request(app)
        .post(`/api/v1/candidates/${candidate.id}/notes`)
        .set("Cookie", recruiterCookie)
        .send({ body: longText });

      expect(res.status).toBe(422);
    });

    it("4. Verifies author derives strictly from authenticated user session", async () => {
      const candidate = await createCandidateFixture();
      const fakeAuthorId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post(`/api/v1/candidates/${candidate.id}/notes`)
        .set("Cookie", hiringManagerCookie)
        .send({
          body: "Hiring Manager evaluation notes.",
          authorId: fakeAuthorId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.note.authorId._id || res.body.data.note.authorId.id).toBe(
        hiringManagerUser.id
      );
    });

    it("5. Rejects unauthenticated note writes", async () => {
      const candidate = await createCandidateFixture();

      const res = await request(app)
        .post(`/api/v1/candidates/${candidate.id}/notes`)
        .send({ body: "Unauthenticated note" });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("6. Lists notes in deterministic order (chronological by default)", async () => {
      const candidate = await createCandidateFixture();

      await Note.create([
        {
          candidateId: candidate._id,
          authorId: recruiterUser._id,
          body: "First Note",
          createdAt: new Date("2026-10-17T10:00:00.000Z"),
        },
        {
          candidateId: candidate._id,
          authorId: recruiterUser._id,
          body: "Second Note",
          createdAt: new Date("2026-10-17T11:00:00.000Z"),
        },
      ]);

      const resDesc = await request(app)
        .get(`/api/v1/candidates/${candidate.id}/notes?order=desc`)
        .set("Cookie", recruiterCookie);

      expect(resDesc.status).toBe(200);
      expect(resDesc.body.data.notes[0].body).toBe("Second Note");
      expect(resDesc.body.data.notes[1].body).toBe("First Note");
    });

    it("7. Excludes soft-deleted notes from ordinary results", async () => {
      const candidate = await createCandidateFixture();

      const note = await Note.create({
        candidateId: candidate._id,
        authorId: recruiterUser._id,
        body: "Note to be soft deleted",
      });

      // Soft delete note
      const delRes = await request(app)
        .delete(`/api/v1/notes/${note.id}`)
        .set("Cookie", recruiterCookie);
      expect(delRes.status).toBe(200);
      expect(delRes.body.data.deletedAt).toBeDefined();

      // Retrieve notes
      const listRes = await request(app)
        .get(`/api/v1/candidates/${candidate.id}/notes`)
        .set("Cookie", recruiterCookie);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.notes.length).toBe(0);

      // Verify database retains the record
      const rawNote = await Note.findById(note.id);
      expect(rawNote?.deletedAt).not.toBeNull();
    });

    it("8. Rejects invalid candidate and note IDs with 400 INVALID_ID", async () => {
      const resCandidate = await request(app)
        .get("/api/v1/candidates/invalid-id/notes")
        .set("Cookie", recruiterCookie);
      expect(resCandidate.status).toBe(400);
      expect(resCandidate.body.error.code).toBe("INVALID_ID");

      const resNote = await request(app)
        .delete("/api/v1/notes/invalid-note-id")
        .set("Cookie", recruiterCookie);
      expect(resNote.status).toBe(400);
      expect(resNote.body.error.code).toBe("INVALID_ID");
    });

    it("9. Handles nonexistent candidate references with 404 CANDIDATE_NOT_FOUND", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post(`/api/v1/candidates/${fakeId}/notes`)
        .set("Cookie", recruiterCookie)
        .send({ body: "Valid body text" });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("CANDIDATE_NOT_FOUND");
    });

    it("10. Rejects executable script tags in note text", async () => {
      const candidate = await createCandidateFixture();

      const res = await request(app)
        .post(`/api/v1/candidates/${candidate.id}/notes`)
        .set("Cookie", recruiterCookie)
        .send({ body: "<script>alert('xss')</script> Hello Recruiter" });

      expect(res.status).toBe(422);
    });

    it("Author or Admin permission matrix for note deletion", async () => {
      const candidate = await createCandidateFixture();

      const note = await Note.create({
        candidateId: candidate._id,
        authorId: recruiterUser._id,
        body: "Primary recruiter note",
      });

      // Non-author non-admin (hiring manager) should be blocked (403 FORBIDDEN)
      const hmRes = await request(app)
        .delete(`/api/v1/notes/${note.id}`)
        .set("Cookie", hiringManagerCookie);
      expect(hmRes.status).toBe(403);
      expect(hmRes.body.error.code).toBe("FORBIDDEN");

      // Non-author recruiter should be blocked (403 FORBIDDEN)
      const otherRecruiterRes = await request(app)
        .delete(`/api/v1/notes/${note.id}`)
        .set("Cookie", otherRecruiterCookie);
      expect(otherRecruiterRes.status).toBe(403);

      // Admin can delete any note
      const adminRes = await request(app)
        .delete(`/api/v1/notes/${note.id}`)
        .set("Cookie", adminCookie);
      expect(adminRes.status).toBe(200);
    });
  });

  describe("Candidate Search & Advanced Filtering", () => {
    beforeEach(async () => {
      await Candidate.create([
        {
          name: "Deepa Menon",
          fullName: "Deepa Menon",
          email: "deepa.menon@example.com",
          currentTitle: "Staff React Engineer",
          experienceYears: 8,
          skills: ["React", "TypeScript", "Next.js"],
          source: "LinkedIn",
          createdAt: new Date("2026-10-10T10:00:00.000Z"),
          createdBy: recruiterUser._id,
          updatedBy: recruiterUser._id,
        },
        {
          name: "Rohan Gupta",
          fullName: "Rohan Gupta",
          email: "rohan.g@example.com",
          currentTitle: "Junior Frontend Developer",
          experienceYears: 2,
          skills: ["React", "JavaScript", "HTML"],
          source: "CompanyWebsite",
          createdAt: new Date("2026-10-15T10:00:00.000Z"),
          createdBy: recruiterUser._id,
          updatedBy: recruiterUser._id,
        },
        {
          name: "Ananya Sharma",
          fullName: "Ananya Sharma",
          email: "ananya.s@example.com",
          currentTitle: "Backend Node Architect",
          experienceYears: 10,
          skills: ["Node.js", "TypeScript", "Docker"],
          source: "Referral",
          createdAt: new Date("2026-10-16T10:00:00.000Z"),
          archivedAt: new Date(),
          createdBy: recruiterUser._id,
          updatedBy: recruiterUser._id,
        },
      ]);
    });

    it("11. Searches candidates by name (case-insensitive)", async () => {
      const res = await request(app)
        .get("/api/v1/candidates?search=deepa")
        .set("Cookie", recruiterCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("Deepa Menon");
    });

    it("12. Searches candidates by email", async () => {
      const res = await request(app)
        .get("/api/v1/candidates?search=rohan.g")
        .set("Cookie", recruiterCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("Rohan Gupta");
    });

    it("13. Searches and filters candidates by skills", async () => {
      const res = await request(app)
        .get("/api/v1/candidates?skill=TypeScript")
        .set("Cookie", recruiterCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("Deepa Menon");
    });

    it("14. Filters candidates by source", async () => {
      const res = await request(app)
        .get("/api/v1/candidates?source=CompanyWebsite")
        .set("Cookie", recruiterCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("Rohan Gupta");
    });

    it("15. Filters candidates by date range", async () => {
      const res = await request(app)
        .get("/api/v1/candidates?createdFrom=2026-10-14&createdTo=2026-10-16")
        .set("Cookie", recruiterCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("Rohan Gupta");
    });

    it("16. Combines multiple filters (search + skill + experience range)", async () => {
      const res = await request(app)
        .get("/api/v1/candidates?search=React&experienceMin=5&experienceMax=10")
        .set("Cookie", recruiterCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("Deepa Menon");
    });

    it("17. Enforces pagination bounds", async () => {
      const resLimit = await request(app)
        .get("/api/v1/candidates?limit=150") // max 100
        .set("Cookie", recruiterCookie);

      expect(resLimit.status).toBe(422);

      const resValid = await request(app)
        .get("/api/v1/candidates?limit=1&page=1")
        .set("Cookie", recruiterCookie);

      expect(resValid.status).toBe(200);
      expect(resValid.body.data.length).toBe(1);
      expect(resValid.body.pagination.total).toBe(2); // Active candidates
    });

    it("18. Safely handles sorting parameters", async () => {
      const resSort = await request(app)
        .get("/api/v1/candidates?sort=experienceYears&order=desc")
        .set("Cookie", recruiterCookie);

      expect(resSort.status).toBe(200);
      expect(resSort.body.data[0].experienceYears).toBe(8);
      expect(resSort.body.data[1].experienceYears).toBe(2);
    });

    it("19. Excludes archived candidates by default and includes on request", async () => {
      const resDefault = await request(app)
        .get("/api/v1/candidates")
        .set("Cookie", recruiterCookie);
      expect(resDefault.body.data.some((c: { name: string }) => c.name === "Ananya Sharma")).toBe(false);

      const resArchived = await request(app)
        .get("/api/v1/candidates?includeArchived=true")
        .set("Cookie", recruiterCookie);
      expect(resArchived.body.data.some((c: { name: string }) => c.name === "Ananya Sharma")).toBe(true);
    });

    it("20. Prevents regex injection and input abuse", async () => {
      const resRegex = await request(app)
        .get("/api/v1/candidates?search=.*")
        .set("Cookie", recruiterCookie);

      expect(resRegex.status).toBe(200);
      expect(resRegex.body.data.length).toBe(0); // Escaped literal match, does not dump whole table
    });
  });

  describe("Job Search & Status Filters", () => {
    beforeEach(async () => {
      await Job.create([
        {
          title: "Frontend Lead",
          department: "Engineering",
          location: "Remote",
          employmentType: "FullTime",
          description: "Lead UI engineers",
          requirements: ["React"],
          status: "Open",
          ownerId: adminUser._id,
        },
        {
          title: "Product Designer",
          department: "Design",
          location: "Bengaluru",
          employmentType: "Contract",
          description: "Design ATS pipelines",
          requirements: ["Figma"],
          status: "Paused",
          ownerId: adminUser._id,
        },
        {
          title: "DevOps Engineer",
          department: "Operations",
          location: "Remote",
          employmentType: "FullTime",
          description: "Kubernetes and CI/CD",
          requirements: ["Docker"],
          status: "Archived",
          archivedAt: new Date(),
          ownerId: adminUser._id,
        },
      ]);
    });

    it("21. Searches jobs by title, department, or location", async () => {
      const resTitle = await request(app).get("/api/v1/jobs?search=Frontend").set("Cookie", recruiterCookie);
      expect(resTitle.status).toBe(200);
      expect(resTitle.body.data.length).toBe(1);
      expect(resTitle.body.data[0].title).toBe("Frontend Lead");

      const resDept = await request(app).get("/api/v1/jobs?department=Design").set("Cookie", recruiterCookie);
      expect(resDept.status).toBe(200);
      expect(resDept.body.data.length).toBe(1);
      expect(resDept.body.data[0].title).toBe("Product Designer");
    });

    it("22. Filters jobs by status", async () => {
      const resPaused = await request(app).get("/api/v1/jobs?status=Paused").set("Cookie", recruiterCookie);
      expect(resPaused.status).toBe(200);
      expect(resPaused.body.data.length).toBe(1);
      expect(resPaused.body.data[0].status).toBe("Paused");
    });

    it("23. Excludes archived jobs by default", async () => {
      const resDefault = await request(app).get("/api/v1/jobs").set("Cookie", recruiterCookie);
      expect(resDefault.body.data.some((j: { status: string }) => j.status === "Archived")).toBe(false);

      const resArchived = await request(app).get("/api/v1/jobs?includeArchived=true").set("Cookie", recruiterCookie);
      expect(resArchived.body.data.some((j: { status: string }) => j.status === "Archived")).toBe(true);
    });
  });

  describe("Application and Pipeline Filters & Uniqueness Policy", () => {
    it("24. Filters applications by hiring stage", async () => {
      const candidate = await createCandidateFixture();
      const job = await createJobFixture();

      const appDoc = await Application.create({
        candidateId: candidate._id,
        jobId: job._id,
        recruiterId: recruiterUser._id,
        stage: "Screening",
        currentStage: "Screening",
        status: "Active",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      });

      const res = await request(app)
        .get("/api/v1/applications?stage=Screening")
        .set("Cookie", recruiterCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.applications.length).toBe(1);
      expect(res.body.data.applications[0].id).toBe(appDoc.id);
    });

    it("25. Filters applications by job opening", async () => {
      const candidate1 = await createCandidateFixture({ email: "cand1@test.com" });
      const candidate2 = await createCandidateFixture({ email: "cand2@test.com" });
      const jobA = await createJobFixture({ title: "Job Alpha" });
      const jobB = await createJobFixture({ title: "Job Beta" });

      await Application.create([
        {
          candidateId: candidate1._id,
          jobId: jobA._id,
          recruiterId: recruiterUser._id,
          stage: "Applied",
          currentStage: "Applied",
          status: "Active",
          createdBy: recruiterUser._id,
          updatedBy: recruiterUser._id,
        },
        {
          candidateId: candidate2._id,
          jobId: jobB._id,
          recruiterId: recruiterUser._id,
          stage: "Applied",
          currentStage: "Applied",
          status: "Active",
          createdBy: recruiterUser._id,
          updatedBy: recruiterUser._id,
        },
      ]);

      const res = await request(app)
        .get(`/api/v1/applications?jobId=${jobA.id}`)
        .set("Cookie", recruiterCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.applications.length).toBe(1);
      expect(res.body.data.applications[0].jobId.id || res.body.data.applications[0].jobId._id).toBe(jobA.id);
    });

    it("26. Combines pipeline search and stage filters", async () => {
      const candidate1 = await createCandidateFixture({ name: "Kiran Rao", email: "kiran@example.com" });
      const candidate2 = await createCandidateFixture({ name: "Sameer Sen", email: "sameer@example.com" });
      const job = await createJobFixture();

      await Application.create([
        {
          candidateId: candidate1._id,
          jobId: job._id,
          recruiterId: recruiterUser._id,
          stage: "Applied",
          currentStage: "Applied",
          status: "Active",
          createdBy: recruiterUser._id,
          updatedBy: recruiterUser._id,
        },
        {
          candidateId: candidate2._id,
          jobId: job._id,
          recruiterId: recruiterUser._id,
          stage: "Applied",
          currentStage: "Applied",
          status: "Active",
          createdBy: recruiterUser._id,
          updatedBy: recruiterUser._id,
        },
      ]);

      const res = await request(app)
        .get(`/api/v1/applications?stage=Applied&search=Kiran`)
        .set("Cookie", recruiterCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.applications.length).toBe(1);
      expect(res.body.data.applications[0].candidateId.name).toBe("Kiran Rao");
    });

    it("27. Preserves duplicate active application rejection (409 DUPLICATE_APPLICATION)", async () => {
      const candidate = await createCandidateFixture();
      const job = await createJobFixture();

      const res1 = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({ candidateId: candidate.id, jobId: job.id });
      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({ candidateId: candidate.id, jobId: job.id });
      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe("DUPLICATE_APPLICATION");
    });

    it("28. Permits reapplication when prior application is Withdrawn or Archived (Partial Unique Index)", async () => {
      const candidate = await createCandidateFixture();
      const job = await createJobFixture();

      // Create initial application
      const firstAppRes = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({ candidateId: candidate.id, jobId: job.id });
      expect(firstAppRes.status).toBe(201);

      const firstAppId = firstAppRes.body.data.application.id;

      // Withdraw or archive initial application
      await Application.updateOne({ _id: firstAppId }, { $set: { status: "Withdrawn" } });

      // Reapply candidate to the same job
      const reapplyRes = await request(app)
        .post("/api/v1/applications")
        .set("Cookie", recruiterCookie)
        .send({ candidateId: candidate.id, jobId: job.id });

      expect(reapplyRes.status).toBe(201);
      expect(reapplyRes.body.data.application.status).toBe("Active");

      // Verify total applications in DB is 2 (1 Withdrawn, 1 Active)
      const count = await Application.countDocuments({ candidateId: candidate._id, jobId: job._id });
      expect(count).toBe(2);
    });
  });

  describe("Regression Integrity", () => {
    it("29. Authentication, Jobs, Candidates, and Health remain functional", async () => {
      const health = await request(app).get("/api/v1/health");
      expect(health.status).toBe(200);

      const auth = await request(app).get("/api/v1/auth/me").set("Cookie", recruiterCookie);
      expect(auth.status).toBe(200);

      const jobs = await request(app).get("/api/v1/jobs").set("Cookie", recruiterCookie);
      expect(jobs.status).toBe(200);

      const candidates = await request(app).get("/api/v1/candidates").set("Cookie", recruiterCookie);
      expect(candidates.status).toBe(200);
    });
  });
});

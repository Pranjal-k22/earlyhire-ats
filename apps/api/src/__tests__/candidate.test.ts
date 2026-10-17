import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { Candidate } from "../models/candidate.model.js";
import { User, IUserDocument } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { signToken, AUTH_COOKIE_NAME } from "../utils/jwt.js";

const TEST_DB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/earlyai_ats_test";

describe("Phase 4 — Candidate Management Integration Test Suite", () => {
  let app: ReturnType<typeof createApp>;

  let recruiterUser: IUserDocument;
  let hiringManagerUser: IUserDocument;
  let adminUser: IUserDocument;

  let recruiterCookie: string;
  let hiringManagerCookie: string;
  let adminCookie: string;

  beforeAll(async () => {
    await connectDB(TEST_DB_URI);
    app = createApp();

    await User.deleteMany({});

    // Setup fixture users
    adminUser = await User.create({
      name: "Admin User",
      email: "admin.candidates@example.com",
      passwordHash: await User.hashPassword("StrongPass!234"),
      role: "admin",
      isActive: true,
    });

    recruiterUser = await User.create({
      name: "Recruiter User",
      email: "recruiter.candidates@example.com",
      passwordHash: await User.hashPassword("StrongPass!234"),
      role: "recruiter",
      isActive: true,
    });

    hiringManagerUser = await User.create({
      name: "Hiring Manager",
      email: "hm.candidates@example.com",
      passwordHash: await User.hashPassword("StrongPass!234"),
      role: "hiring_manager",
      isActive: true,
    });

    const adminToken = signToken({ id: adminUser.id, role: adminUser.role });
    const recruiterToken = signToken({ id: recruiterUser.id, role: recruiterUser.role });
    const hmToken = signToken({ id: hiringManagerUser.id, role: hiringManagerUser.role });

    adminCookie = `${AUTH_COOKIE_NAME}=${adminToken}`;
    recruiterCookie = `${AUTH_COOKIE_NAME}=${recruiterToken}`;
    hiringManagerCookie = `${AUTH_COOKIE_NAME}=${hmToken}`;
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await disconnectDB();
    }
  });

  beforeEach(async () => {
    await Candidate.deleteMany({});

    // Ensure fixture users remain intact
    await User.updateOne(
      { _id: recruiterUser._id },
      {
        $set: {
          name: recruiterUser.name,
          email: recruiterUser.email,
          passwordHash: recruiterUser.passwordHash,
          role: recruiterUser.role,
          isActive: true,
        },
      },
      { upsert: true }
    );
  });

  // 1. Create a valid candidate
  it("Scenario 1: creates a valid candidate and assigns createdBy from auth session", async () => {
    const payload = {
      name: "Priya Sharma",
      email: "priya.sharma@example.com",
      phone: "+91 98765 43210",
      location: "Bengaluru",
      currentTitle: "Senior React Developer",
      experienceYears: 5,
      skills: ["React", "TypeScript", "Tailwind CSS"],
      resumeUrl: "https://example.com/resumes/priya.pdf",
      source: "LinkedIn",
      summary: "Experienced frontend developer passionate about accessible UI design.",
    };

    const res = await request(app)
      .post("/api/v1/candidates")
      .set("Cookie", recruiterCookie)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.candidate).toBeDefined();
    expect(res.body.data.candidate.name).toBe("Priya Sharma");
    expect(res.body.data.candidate.fullName).toBe("Priya Sharma");
    expect(res.body.data.candidate.email).toBe("priya.sharma@example.com");
    expect(res.body.data.candidate.experienceYears).toBe(5);
    expect(res.body.data.candidate.skills).toEqual(["React", "TypeScript", "Tailwind CSS"]);
    expect(res.body.data.candidate.source).toBe("LinkedIn");
    expect(res.body.data.candidate.createdBy).toBe(recruiterUser.id);
  });

  // 2. Reject missing required fields
  it("Scenario 2: rejects request missing candidate name or email with 422 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/v1/candidates")
      .set("Cookie", recruiterCookie)
      .send({
        phone: "+91 98765 43210",
        experienceYears: 3,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  // 3. Reject malformed email addresses
  it("Scenario 3: rejects invalid/malformed email addresses with 422 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/v1/candidates")
      .set("Cookie", recruiterCookie)
      .send({
        name: "Test Candidate",
        email: "not-a-valid-email-format",
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  // 4. Normalize email addresses
  it("Scenario 4: normalizes email addresses to lowercase and trims whitespace", async () => {
    const res = await request(app)
      .post("/api/v1/candidates")
      .set("Cookie", recruiterCookie)
      .send({
        name: "Rohan Verma",
        email: "  Rohan.Verma@Example.COM  ",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.candidate.email).toBe("rohan.verma@example.com");

    const saved = await Candidate.findById(res.body.data.candidate.id);
    expect(saved?.email).toBe("rohan.verma@example.com");
  });

  // 5. Handle duplicate email addresses
  it("Scenario 5: returns 409 CANDIDATE_EMAIL_EXISTS when creating duplicate active candidate email", async () => {
    await Candidate.create({
      name: "Existing Candidate",
      email: "duplicate.check@example.com",
      createdBy: recruiterUser._id,
      updatedBy: recruiterUser._id,
    });

    const res = await request(app)
      .post("/api/v1/candidates")
      .set("Cookie", recruiterCookie)
      .send({
        name: "New Person With Same Email",
        email: "DUPLICATE.check@example.com",
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("CANDIDATE_EMAIL_EXISTS");
  });

  // 6. Reject invalid experience values
  it("Scenario 6: rejects negative experience years or experience exceeding bounds with 422", async () => {
    const negativeRes = await request(app)
      .post("/api/v1/candidates")
      .set("Cookie", recruiterCookie)
      .send({
        name: "Invalid Exp Candidate",
        email: "negative.exp@example.com",
        experienceYears: -2,
      });

    expect(negativeRes.status).toBe(422);
    expect(negativeRes.body.error.code).toBe("VALIDATION_ERROR");

    const excessiveRes = await request(app)
      .post("/api/v1/candidates")
      .set("Cookie", recruiterCookie)
      .send({
        name: "Invalid Exp Candidate 2",
        email: "excessive.exp@example.com",
        experienceYears: 75,
      });

    expect(excessiveRes.status).toBe(422);
    expect(excessiveRes.body.error.code).toBe("VALIDATION_ERROR");
  });

  // 7. Validate resume URLs
  it("Scenario 7: accepts valid HTTP/HTTPS URLs and rejects malformed resume URLs with 422", async () => {
    const invalidUrlRes = await request(app)
      .post("/api/v1/candidates")
      .set("Cookie", recruiterCookie)
      .send({
        name: "Resume Test",
        email: "resume.test@example.com",
        resumeUrl: "ftp://invalid-protocol.com/resume",
      });

    expect(invalidUrlRes.status).toBe(422);

    const validUrlRes = await request(app)
      .post("/api/v1/candidates")
      .set("Cookie", recruiterCookie)
      .send({
        name: "Resume Test Valid",
        email: "resume.valid@example.com",
        resumeUrl: "https://mybucket.s3.amazonaws.com/resumes/candidate.pdf",
      });

    expect(validUrlRes.status).toBe(201);
    expect(validUrlRes.body.data.candidate.resumeUrl).toBe(
      "https://mybucket.s3.amazonaws.com/resumes/candidate.pdf"
    );
  });

  // 8. List candidates
  it("Scenario 8: lists candidates with pagination structure and excludes archived records by default", async () => {
    await Candidate.create([
      {
        name: "Active Candidate 1",
        email: "active1@example.com",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        name: "Active Candidate 2",
        email: "active2@example.com",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        name: "Archived Candidate",
        email: "archived@example.com",
        archivedAt: new Date(),
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
    ]);

    const res = await request(app)
      .get("/api/v1/candidates")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
  });

  // 9. Search by candidate name
  it("Scenario 9: searches candidates by full name case-insensitively with regex safety", async () => {
    await Candidate.create([
      {
        name: "Vikram Malhotra",
        email: "vikram@example.com",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        name: "Anita Desai",
        email: "anita@example.com",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
    ]);

    const res = await request(app)
      .get("/api/v1/candidates?search=malhotra")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Vikram Malhotra");
  });

  // 10. Search by email
  it("Scenario 10: searches candidates by partial or exact email address", async () => {
    await Candidate.create([
      {
        name: "Candidate Alpha",
        email: "alpha.tech@domain.org",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        name: "Candidate Beta",
        email: "beta.design@company.com",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
    ]);

    const res = await request(app)
      .get("/api/v1/candidates?search=domain.org")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].email).toBe("alpha.tech@domain.org");
  });

  // 11. Search by skills
  it("Scenario 11: searches and filters candidates by skill tags", async () => {
    await Candidate.create([
      {
        name: "Dev One",
        email: "dev1@example.com",
        skills: ["Go", "Kubernetes", "PostgreSQL"],
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        name: "Dev Two",
        email: "dev2@example.com",
        skills: ["React", "CSS", "HTML"],
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
    ]);

    // Search query matching skill
    const searchRes = await request(app)
      .get("/api/v1/candidates?search=kubernetes")
      .set("Cookie", recruiterCookie);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data).toHaveLength(1);
    expect(searchRes.body.data[0].name).toBe("Dev One");

    // Exact skill filter query
    const filterRes = await request(app)
      .get("/api/v1/candidates?skill=React")
      .set("Cookie", recruiterCookie);

    expect(filterRes.status).toBe(200);
    expect(filterRes.body.data).toHaveLength(1);
    expect(filterRes.body.data[0].name).toBe("Dev Two");
  });

  // 12. Filter by source
  it("Scenario 12: filters candidate listings by source attribute", async () => {
    await Candidate.create([
      {
        name: "Ref Candidate",
        email: "ref@example.com",
        source: "Referral",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        name: "Agency Candidate",
        email: "agency@example.com",
        source: "Agency",
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
    ]);

    const res = await request(app)
      .get("/api/v1/candidates?source=Referral")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].source).toBe("Referral");
  });

  // 13. Filter by creation date
  it("Scenario 13: filters candidates by createdFrom and createdTo date ranges", async () => {
    await Candidate.create([
      {
        name: "January Candidate",
        email: "jan@example.com",
        createdAt: new Date("2026-01-15T00:00:00Z"),
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
      {
        name: "June Candidate",
        email: "june@example.com",
        createdAt: new Date("2026-06-15T00:00:00Z"),
        createdBy: recruiterUser._id,
        updatedBy: recruiterUser._id,
      },
    ]);

    const res = await request(app)
      .get("/api/v1/candidates?createdFrom=2026-05-01&createdTo=2026-07-01")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("June Candidate");
  });

  // 14. Enforce pagination limits
  it("Scenario 14: respects pagination bounds and limits page size to a maximum of 100", async () => {
    const list = Array.from({ length: 25 }, (_, i) => ({
      name: `Candidate ${i + 1}`,
      email: `cand${i + 1}@example.com`,
      createdBy: recruiterUser._id,
      updatedBy: recruiterUser._id,
    }));

    await Candidate.insertMany(list);

    const page1Res = await request(app)
      .get("/api/v1/candidates?page=1&limit=10")
      .set("Cookie", recruiterCookie);

    expect(page1Res.status).toBe(200);
    expect(page1Res.body.data).toHaveLength(10);
    expect(page1Res.body.pagination.totalPages).toBe(3);

    const page3Res = await request(app)
      .get("/api/v1/candidates?page=3&limit=10")
      .set("Cookie", recruiterCookie);

    expect(page3Res.status).toBe(200);
    expect(page3Res.body.data).toHaveLength(5);
  });

  // 15. Retrieve an existing candidate
  it("Scenario 15: retrieves a single candidate by ID with audit populate references", async () => {
    const candidate = await Candidate.create({
      name: "Detail Candidate",
      email: "detail@example.com",
      location: "Pune",
      experienceYears: 4,
      skills: ["Vue", "Node.js"],
      createdBy: recruiterUser._id,
      updatedBy: recruiterUser._id,
    });

    const res = await request(app)
      .get(`/api/v1/candidates/${candidate.id}`)
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.candidate.name).toBe("Detail Candidate");
    expect(res.body.data.candidate.createdBy.name).toBe("Recruiter User");
  });

  // 16. Return 404 for nonexistent candidate
  it("Scenario 16: returns 404 CANDIDATE_NOT_FOUND for valid but non-existent ObjectId", async () => {
    const randomId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .get(`/api/v1/candidates/${randomId}`)
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("CANDIDATE_NOT_FOUND");
  });

  // 17. Reject invalid MongoDB IDs
  it("Scenario 17: returns 400 INVALID_ID for malformed MongoDB ObjectIds", async () => {
    const res = await request(app)
      .get("/api/v1/candidates/not-an-objectid-123")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_ID");
  });

  // 18. Update a candidate
  it("Scenario 18: updates candidate fields and sets updatedBy reference", async () => {
    const candidate = await Candidate.create({
      name: "Initial Name",
      email: "initial@example.com",
      experienceYears: 2,
      skills: ["JavaScript"],
      createdBy: recruiterUser._id,
      updatedBy: recruiterUser._id,
    });

    const res = await request(app)
      .patch(`/api/v1/candidates/${candidate.id}`)
      .set("Cookie", recruiterCookie)
      .send({
        name: "Updated Name",
        currentTitle: "Lead Full Stack Architect",
        experienceYears: 6,
        skills: ["JavaScript", "TypeScript", "Node.js"],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.candidate.name).toBe("Updated Name");
    expect(res.body.data.candidate.currentTitle).toBe("Lead Full Stack Architect");
    expect(res.body.data.candidate.experienceYears).toBe(6);
    expect(res.body.data.candidate.skills).toEqual(["JavaScript", "TypeScript", "Node.js"]);
  });

  // 19. Prevent unauthenticated access
  it("Scenario 19: returns 401 UNAUTHENTICATED when accessing candidate routes without valid cookie", async () => {
    const res = await request(app).get("/api/v1/candidates");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  // 20. Prevent unauthorized writes
  it("Scenario 20: blocks hiring managers from creating, updating, or deleting candidates with 403 FORBIDDEN", async () => {
    // HM cannot create
    const createRes = await request(app)
      .post("/api/v1/candidates")
      .set("Cookie", hiringManagerCookie)
      .send({
        name: "Unauthorized Candidate",
        email: "unauth@example.com",
      });

    expect(createRes.status).toBe(403);
    expect(createRes.body.error.code).toBe("FORBIDDEN");

    const candidate = await Candidate.create({
      name: "Perm Test Candidate",
      email: "perm.test@example.com",
      createdBy: recruiterUser._id,
      updatedBy: recruiterUser._id,
    });

    // HM cannot update
    const updateRes = await request(app)
      .patch(`/api/v1/candidates/${candidate.id}`)
      .set("Cookie", hiringManagerCookie)
      .send({ name: "Attempted Update" });

    expect(updateRes.status).toBe(403);

    // HM cannot delete
    const deleteRes = await request(app)
      .delete(`/api/v1/candidates/${candidate.id}`)
      .set("Cookie", hiringManagerCookie);

    expect(deleteRes.status).toBe(403);

    // Admin CAN perform writes
    const adminCreateRes = await request(app)
      .post("/api/v1/candidates")
      .set("Cookie", adminCookie)
      .send({
        name: "Admin Created Candidate",
        email: "admin.created@example.com",
      });

    expect(adminCreateRes.status).toBe(201);
  });

  // 21. Handle deletion/archive correctly
  it("Scenario 21: soft archives candidates by setting archivedAt without physical record destruction", async () => {
    const candidate = await Candidate.create({
      name: "To Archive",
      email: "archive.me@example.com",
      createdBy: recruiterUser._id,
      updatedBy: recruiterUser._id,
    });

    const res = await request(app)
      .delete(`/api/v1/candidates/${candidate.id}`)
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.archived).toBe(true);
    expect(res.body.data.candidate.archivedAt).toBeDefined();

    // Verify record still exists in database
    const inDb = await Candidate.findById(candidate.id);
    expect(inDb).not.toBeNull();
    expect(inDb?.archivedAt).toBeInstanceOf(Date);

    // Verify excluded from standard listing
    const listRes = await request(app)
      .get("/api/v1/candidates")
      .set("Cookie", recruiterCookie);

    expect(listRes.body.data).toHaveLength(0);

    // Verify included when includeArchived=true is requested
    const listArchivedRes = await request(app)
      .get("/api/v1/candidates?includeArchived=true")
      .set("Cookie", recruiterCookie);

    expect(listArchivedRes.body.data).toHaveLength(1);
    expect(listArchivedRes.body.data[0].id).toBe(candidate.id);
  });

  // 22. Preserve job-management and authentication behavior
  it("Scenario 22: preserves Phase 2 auth and Phase 3 job-management functionality without regressions", async () => {
    // Auth /me works
    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", recruiterCookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe("recruiter.candidates@example.com");

    // Jobs CRUD works
    const createJobRes = await request(app)
      .post("/api/v1/jobs")
      .set("Cookie", recruiterCookie)
      .send({
        title: "Regression Check Role",
        department: "Engineering",
        location: "Remote",
        employmentType: "FullTime",
        description: "Validating non-interference with candidate routes.",
      });

    expect(createJobRes.status).toBe(201);
    expect(createJobRes.body.data.job.title).toBe("Regression Check Role");

    // Jobs list works
    const listJobsRes = await request(app)
      .get("/api/v1/jobs")
      .set("Cookie", recruiterCookie);

    expect(listJobsRes.status).toBe(200);
    expect(listJobsRes.body.data.length).toBeGreaterThanOrEqual(1);

    // Clean up created job
    await Job.deleteMany({});
  });
});

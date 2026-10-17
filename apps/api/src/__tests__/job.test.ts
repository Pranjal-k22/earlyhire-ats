import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { User, IUserDocument } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { signToken, AUTH_COOKIE_NAME } from "../utils/jwt.js";

const TEST_DB_URI = "mongodb://localhost:27017/earlyai_ats_test";

describe("Phase 3 — Job Management Integration Test Suite", { timeout: 15000 }, () => {
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
      email: "admin.jobs@example.com",
      passwordHash: await User.hashPassword("StrongPass!234"),
      role: "admin",
      isActive: true,
    });

    recruiterUser = await User.create({
      name: "Recruiter User",
      email: "recruiter.jobs@example.com",
      passwordHash: await User.hashPassword("StrongPass!234"),
      role: "recruiter",
      isActive: true,
    });

    hiringManagerUser = await User.create({
      name: "Hiring Manager User",
      email: "hm.jobs@example.com",
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
    await Job.deleteMany({});

    // Ensure fixture users remain intact regardless of test suite isolation
    await User.findByIdAndUpdate(
      adminUser._id,
      {
        name: adminUser.name,
        email: adminUser.email,
        passwordHash: adminUser.passwordHash,
        role: "admin",
        isActive: true,
      },
      { upsert: true }
    );

    await User.findByIdAndUpdate(
      recruiterUser._id,
      {
        name: recruiterUser.name,
        email: recruiterUser.email,
        passwordHash: recruiterUser.passwordHash,
        role: "recruiter",
        isActive: true,
      },
      { upsert: true }
    );

    await User.findByIdAndUpdate(
      hiringManagerUser._id,
      {
        name: hiringManagerUser.name,
        email: hiringManagerUser.email,
        passwordHash: hiringManagerUser.passwordHash,
        role: "hiring_manager",
        isActive: true,
      },
      { upsert: true }
    );
  });

  // 1. Creating a valid job
  it("Scenario 1: allows an authorized recruiter to create a valid job", async () => {
    const payload = {
      title: "Senior Full Stack Engineer",
      department: "Engineering",
      location: "Bengaluru / Hybrid",
      employmentType: "FullTime",
      description: "Build robust ATS backend and modern React interfaces.",
      requirements: ["TypeScript", "Node.js", "React", "MongoDB"],
      experienceMin: 3,
      experienceMax: 7,
      status: "Open",
    };

    const res = await request(app)
      .post("/api/v1/jobs")
      .set("Cookie", recruiterCookie)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.job).toMatchObject({
      title: "Senior Full Stack Engineer",
      department: "Engineering",
      location: "Bengaluru / Hybrid",
      employmentType: "FullTime",
      status: "Open",
      experienceMin: 3,
      experienceMax: 7,
    });
    expect(res.body.data.job.id).toBeDefined();
    expect(res.body.data.job.ownerId).toBe(recruiterUser.id);
  });

  // 2. Rejecting invalid job input
  it("Scenario 2: rejects invalid job creation payloads with 422 VALIDATION_ERROR", async () => {
    // Missing required title
    const resNoTitle = await request(app)
      .post("/api/v1/jobs")
      .set("Cookie", recruiterCookie)
      .send({
        description: "Missing title",
      });
    expect(resNoTitle.status).toBe(422);
    expect(resNoTitle.body.error.code).toBe("VALIDATION_ERROR");

    // Title too short (< 2 chars)
    const resShortTitle = await request(app)
      .post("/api/v1/jobs")
      .set("Cookie", recruiterCookie)
      .send({
        title: "A",
        description: "Short title test",
      });
    expect(resShortTitle.status).toBe(422);

    // experienceMax < experienceMin
    const resBadExp = await request(app)
      .post("/api/v1/jobs")
      .set("Cookie", recruiterCookie)
      .send({
        title: "Valid Title",
        description: "Testing invalid experience bounds",
        experienceMin: 5,
        experienceMax: 2,
      });
    expect(resBadExp.status).toBe(422);
  });

  // 3. Listing jobs and filtering
  it("Scenario 3: lists jobs with text search and department filtering", async () => {
    await Job.create([
      {
        title: "Frontend Architect",
        department: "Engineering",
        location: "Remote",
        employmentType: "FullTime",
        description: "React and UI design system.",
        requirements: ["React", "CSS"],
        status: "Open",
        ownerId: recruiterUser._id,
      },
      {
        title: "Backend Lead",
        department: "Engineering",
        location: "Bengaluru",
        employmentType: "FullTime",
        description: "Node.js and microservices.",
        requirements: ["Node.js", "Express"],
        status: "Open",
        ownerId: recruiterUser._id,
      },
      {
        title: "Talent Acquisition Partner",
        department: "Human Resources",
        location: "Mumbai",
        employmentType: "FullTime",
        description: "Recruitment lead.",
        requirements: ["Sourcing", "Screening"],
        status: "Open",
        ownerId: recruiterUser._id,
      },
    ]);

    // Search query
    const searchRes = await request(app)
      .get("/api/v1/jobs?search=Architect")
      .set("Cookie", recruiterCookie);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.success).toBe(true);
    expect(searchRes.body.data).toHaveLength(1);
    expect(searchRes.body.data[0].title).toBe("Frontend Architect");

    // Department filter
    const deptRes = await request(app)
      .get("/api/v1/jobs?department=Human Resources")
      .set("Cookie", recruiterCookie);

    expect(deptRes.status).toBe(200);
    expect(deptRes.body.data).toHaveLength(1);
    expect(deptRes.body.data[0].department).toBe("Human Resources");
  });

  // 4. Pagination behavior
  it("Scenario 4: paginates job lists correctly", async () => {
    const jobsData = Array.from({ length: 25 }, (_, i) => ({
      title: `Job Position ${i + 1}`,
      department: "Operations",
      location: "Remote",
      employmentType: "FullTime" as const,
      description: `Job description for position ${i + 1}`,
      status: "Open" as const,
      ownerId: recruiterUser._id,
      openedAt: new Date(2026, 0, i + 1),
    }));

    await Job.insertMany(jobsData);

    const page1Res = await request(app)
      .get("/api/v1/jobs?page=1&limit=10")
      .set("Cookie", recruiterCookie);

    expect(page1Res.status).toBe(200);
    expect(page1Res.body.data).toHaveLength(10);
    expect(page1Res.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
    });

    const page3Res = await request(app)
      .get("/api/v1/jobs?page=3&limit=10")
      .set("Cookie", recruiterCookie);

    expect(page3Res.status).toBe(200);
    expect(page3Res.body.data).toHaveLength(5);
  });

  // 5. Retrieving a job by ID
  it("Scenario 5: retrieves a single job by valid ID with owner populated", async () => {
    const created = await Job.create({
      title: "DevOps Engineer",
      department: "Infrastructure",
      location: "Remote",
      employmentType: "Contract",
      description: "Kubernetes and CI/CD pipelines.",
      status: "Open",
      ownerId: recruiterUser._id,
    });

    const res = await request(app)
      .get(`/api/v1/jobs/${created.id}`)
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.job.title).toBe("DevOps Engineer");
    expect(res.body.data.job.ownerId).toMatchObject({
      name: "Recruiter User",
      email: "recruiter.jobs@example.com",
    });
  });

  // 6. Handling a nonexistent job
  it("Scenario 6: returns 404 JOB_NOT_FOUND when requesting a nonexistent job ID", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/v1/jobs/${fakeId}`)
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("JOB_NOT_FOUND");
  });

  // 7. Updating a job
  it("Scenario 7: allows authorized roles to update existing job fields", async () => {
    const job = await Job.create({
      title: "Junior Designer",
      department: "Design",
      location: "Delhi",
      employmentType: "FullTime",
      description: "Figma and design systems.",
      status: "Open",
      ownerId: recruiterUser._id,
    });

    const res = await request(app)
      .patch(`/api/v1/jobs/${job.id}`)
      .set("Cookie", recruiterCookie)
      .send({
        title: "Product Designer II",
        location: "Delhi / Hybrid",
        requirements: ["Figma", "Design Tokens", "Wireframing"],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.job.title).toBe("Product Designer II");
    expect(res.body.data.job.location).toBe("Delhi / Hybrid");
    expect(res.body.data.job.requirements).toEqual(["Figma", "Design Tokens", "Wireframing"]);
  });

  // 8. Preventing unauthorized writes
  it("Scenario 8: rejects job creation, update, and deletion by hiring managers with 403 FORBIDDEN", async () => {
    // HM cannot create a job
    const createRes = await request(app)
      .post("/api/v1/jobs")
      .set("Cookie", hiringManagerCookie)
      .send({
        title: "Unauthorized Job",
        description: "Should fail RBAC",
      });
    expect(createRes.status).toBe(403);
    expect(createRes.body.error.code).toBe("FORBIDDEN");

    const existingJob = await Job.create({
      title: "Existing Job",
      department: "Sales",
      description: "Sales executive",
      status: "Open",
      ownerId: recruiterUser._id,
    });

    // HM cannot update a job
    const updateRes = await request(app)
      .patch(`/api/v1/jobs/${existingJob.id}`)
      .set("Cookie", hiringManagerCookie)
      .send({ title: "Hacked Title" });
    expect(updateRes.status).toBe(403);

    // HM cannot delete/archive a job
    const deleteRes = await request(app)
      .delete(`/api/v1/jobs/${existingJob.id}`)
      .set("Cookie", hiringManagerCookie);
    expect(deleteRes.status).toBe(403);

    // Admin CAN create jobs
    const adminCreateRes = await request(app)
      .post("/api/v1/jobs")
      .set("Cookie", adminCookie)
      .send({
        title: "Admin Created Role",
        department: "Executive",
        location: "Bengaluru",
        employmentType: "FullTime",
        description: "High level role created by admin.",
      });
    expect(adminCreateRes.status).toBe(201);
  });

  // 9. Rejecting invalid identifiers
  it("Scenario 9: returns 400 INVALID_ID for malformed MongoDB ObjectIds", async () => {
    const res = await request(app)
      .get("/api/v1/jobs/not-a-valid-object-id")
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_ID");
  });

  // 10. Updating job status
  it("Scenario 10: updates status between Open, Paused, and Closed", async () => {
    const job = await Job.create({
      title: "QA Automation Engineer",
      description: "Playwright and Vitest testing.",
      status: "Open",
      ownerId: recruiterUser._id,
    });

    const pauseRes = await request(app)
      .patch(`/api/v1/jobs/${job.id}`)
      .set("Cookie", recruiterCookie)
      .send({ status: "Paused" });

    expect(pauseRes.status).toBe(200);
    expect(pauseRes.body.data.job.status).toBe("Paused");

    const closeRes = await request(app)
      .patch(`/api/v1/jobs/${job.id}`)
      .set("Cookie", recruiterCookie)
      .send({ status: "Closed" });

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.job.status).toBe("Closed");
  });

  // 11. Documented archive/deletion behavior (soft delete)
  it("Scenario 11: soft archives job on DELETE without permanently deleting record", async () => {
    const job = await Job.create({
      title: "Legacy Role",
      description: "Role to be archived.",
      status: "Open",
      ownerId: recruiterUser._id,
    });

    const res = await request(app)
      .delete(`/api/v1/jobs/${job.id}`)
      .set("Cookie", recruiterCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.archived).toBe(true);
    expect(res.body.data.job.status).toBe("Archived");

    // Verify record still exists in database with archivedAt set
    const jobInDb = await Job.findById(job.id);
    expect(jobInDb).not.toBeNull();
    expect(jobInDb?.status).toBe("Archived");
    expect(jobInDb?.archivedAt).toBeInstanceOf(Date);
  });

  // 12. Restricting archived jobs in default listing
  it("Scenario 12: excludes archived jobs from standard listing unless explicitly requested", async () => {
    await Job.create([
      {
        title: "Active Role",
        description: "Active",
        status: "Open",
        ownerId: recruiterUser._id,
      },
      {
        title: "Archived Role",
        description: "Archived",
        status: "Archived",
        archivedAt: new Date(),
        ownerId: recruiterUser._id,
      },
    ]);

    // Standard listing should exclude Archived
    const defaultRes = await request(app)
      .get("/api/v1/jobs")
      .set("Cookie", recruiterCookie);

    expect(defaultRes.status).toBe(200);
    expect(defaultRes.body.data).toHaveLength(1);
    expect(defaultRes.body.data[0].title).toBe("Active Role");

    // Explicit archived filter should return archived job
    const archivedRes = await request(app)
      .get("/api/v1/jobs?status=Archived")
      .set("Cookie", recruiterCookie);

    expect(archivedRes.status).toBe(200);
    expect(archivedRes.body.data).toHaveLength(1);
    expect(archivedRes.body.data[0].title).toBe("Archived Role");
  });

  // 13. Rejecting requests without authentication
  it("Scenario 13: rejects anonymous requests to job endpoints with 401 UNAUTHENTICATED", async () => {
    const resList = await request(app).get("/api/v1/jobs");
    expect(resList.status).toBe(401);
    expect(resList.body.error.code).toBe("UNAUTHENTICATED");

    const resCreate = await request(app)
      .post("/api/v1/jobs")
      .send({ title: "Unauthenticated" });
    expect(resCreate.status).toBe(401);
  });

  // 14. Preserving existing health and auth functionality
  it("Scenario 14: regression check preserves existing health and auth endpoints", async () => {
    const healthRes = await request(app).get("/api/v1/health");
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.service).toBe("earlyai-ats-api");

    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", recruiterCookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe("recruiter.jobs@example.com");
  });
});

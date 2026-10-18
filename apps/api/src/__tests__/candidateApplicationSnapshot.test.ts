import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { ResumeFile } from "../models/resume.model.js";
import { AtsAnalysis } from "../models/atsAnalysis.model.js";
import { Application } from "../models/application.model.js";
import { AIUsageRecord } from "../models/aiUsage.model.js";
import { signToken, AUTH_COOKIE_NAME } from "../utils/jwt.js";

const TEST_DB_URI = "mongodb://localhost:27017/earlyai_ats_test";

describe("Candidate ATS Pre-Check, Improvement Workflow & Immutable Application Snapshot Suite", { timeout: 30000 }, () => {
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
    await AtsAnalysis.deleteMany({});
    await Application.deleteMany({});
    await AIUsageRecord.deleteMany({});
  });

  const getSessionCookie = (user: { id: string; role: string }) => {
    const token = signToken({ id: user.id, role: user.role });
    return `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax`;
  };

  it("completes full end-to-end ATS workflow: pre-check, low-score improvement, application snapshot, and recruiter review", async () => {
    // 1. Create Recruiter and Published Job
    const recruiter = await User.create({
      name: "Recruiter Alice",
      email: "recruiter_alice@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "hiring_team",
    });

    const job = await Job.create({
      title: "Senior Full Stack Engineer",
      department: "Engineering",
      location: "Remote",
      employmentType: "FullTime",
      description: "Looking for an experienced engineer with TypeScript, React, Node.js, PostgreSQL, and Docker.",
      requirements: ["TypeScript", "React", "Node.js", "PostgreSQL", "Docker"],
      status: "Open",
      ownerId: recruiter.id,
      openedAt: new Date(),
    });

    // 2. Register Candidate A
    const candidateA = await User.create({
      name: "Candidate Bob",
      email: "bob_candidate@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "candidate",
    });

    // 3. Candidate uploads Resume v1 (Missing PostgreSQL & Docker, no quantitative achievements)
    const resumeV1Text = `Bob Candidate
Software Developer
Email: bob@example.com

Summary:
Developer looking for opportunities in web development.

Experience:
Web Developer at Acme Corp
- Built frontend interfaces using React and HTML/CSS.
- Developed minor backend endpoints in Node.js.

Education:
B.S. in Computer Science`;

    const uploadV1Res = await request(app)
      .post("/api/v1/resumes/upload")
      .set("Cookie", getSessionCookie(candidateA))
      .attach("resume", Buffer.from(resumeV1Text, "utf-8"), "resume_v1.txt");

    expect(uploadV1Res.status).toBe(201);
    const resumeV1Id = uploadV1Res.body.data.resume.id;
    expect(resumeV1Id).toBeDefined();

    // 4. Candidate runs Pre-Application ATS Check on Resume v1
    const checkV1Res = await request(app)
      .post("/api/v1/ats/analyze")
      .set("Cookie", getSessionCookie(candidateA))
      .send({
        jobId: job.id,
        resumeId: resumeV1Id,
        forceRefresh: true,
      });

    expect(checkV1Res.status).toBe(200);
    expect(checkV1Res.body.success).toBe(true);
    const analysisV1 = checkV1Res.body.data.analysis;

    // Check pre-application score
    expect(analysisV1.overallScore).toBeLessThan(75);
    expect(analysisV1.requiredSkillsFound).toEqual(expect.arrayContaining(["React", "Node.js"]));
    expect(analysisV1.missingCriteria.some((c: string) => c.includes("PostgreSQL"))).toBe(true);
    expect(analysisV1.missingCriteria.some((c: string) => c.includes("Docker"))).toBe(true);
    expect(analysisV1.concreteSuggestions.length).toBeGreaterThan(0);
    expect(analysisV1.rubricVersion).toBe("v2.0-deterministic-hybrid");

    // 5. Candidate uses Low-Score Suggestions, improves resume, and uploads Resume v2
    // Adds PostgreSQL, Docker, TypeScript, and quantified achievements (+40% speedup, 100k requests/sec)
    const resumeV2Text = `Bob Candidate
Senior Full Stack Engineer
Email: bob@example.com | Phone: 555-0199

Summary:
Experienced engineer specializing in high-performance TypeScript, React, and Node.js microservices with PostgreSQL and Docker.

Skills:
TypeScript, React, Node.js, Express, PostgreSQL, Docker, REST, Git

Experience:
Senior Software Engineer at Acme Corp (2021 - Present)
- Architected enterprise React frontends and Node.js microservices using TypeScript.
- Implemented PostgreSQL query indexing and connection pooling, boosting query throughput by 45%.
- Containerized microservices using Docker, streamlining deployment pipeline to under 5 minutes.
- Scaled distributed backend services handling 100k rps with 99.99% uptime.

Education:
B.S. in Computer Science, State University`;

    const uploadV2Res = await request(app)
      .post("/api/v1/resumes/upload")
      .set("Cookie", getSessionCookie(candidateA))
      .attach("resume", Buffer.from(resumeV2Text, "utf-8"), "resume_v2.txt");

    expect(uploadV2Res.status).toBe(201);
    const resumeV2Id = uploadV2Res.body.data.resume.id;

    // 6. Candidate reruns ATS Check on Resume v2
    const checkV2Res = await request(app)
      .post("/api/v1/ats/analyze")
      .set("Cookie", getSessionCookie(candidateA))
      .send({
        jobId: job.id,
        resumeId: resumeV2Id,
        forceRefresh: true,
      });

    expect(checkV2Res.status).toBe(200);
    const analysisV2 = checkV2Res.body.data.analysis;

    // Resume v2 should score substantially higher than v1
    expect(analysisV2.overallScore).toBeGreaterThan(analysisV1.overallScore);
    expect(analysisV2.overallScore).toBeGreaterThanOrEqual(75);
    expect(analysisV2.requiredSkillsFound).toEqual(
      expect.arrayContaining(["TypeScript", "React", "Node.js", "PostgreSQL", "Docker"])
    );
    expect(analysisV2.breakdown.skillsScore).toBeGreaterThan(analysisV1.breakdown.skillsScore);

    // 7. Candidate applies for the job using Resume v2
    const applyRes = await request(app)
      .post("/api/v1/applications/apply")
      .set("Cookie", getSessionCookie(candidateA))
      .send({
        jobId: job.id,
        resumeId: resumeV2Id,
        notes: "Excited about this role. Improved my resume with full PostgreSQL and Docker deployment metrics.",
      });

    expect(applyRes.status).toBe(201);
    expect(applyRes.body.success).toBe(true);
    const application = applyRes.body.data.application;
    expect(application.id).toBeDefined();
    expect(application.currentStage).toBe("Applied");

    // 8. Verify the immutable ATS Snapshot was created and bound
    const snapshot = application.atsSnapshot;
    expect(snapshot).toBeDefined();
    expect(snapshot.overallScore).toBe(analysisV2.overallScore);
    expect(snapshot.breakdown.skillsScore).toBe(analysisV2.breakdown.skillsScore);
    expect(snapshot.breakdown.experienceScore).toBe(analysisV2.breakdown.experienceScore);
    expect(snapshot.requiredSkillsFound).toEqual(
      expect.arrayContaining(["TypeScript", "React", "Node.js", "PostgreSQL", "Docker"])
    );
    expect(snapshot.rubricVersion).toBe("v2.0-deterministic-hybrid");
    expect(snapshot.snapshotTimestamp).toBeDefined();

    // 9. Verify Duplicate Active Application Protection (409 Conflict)
    const duplicateApplyRes = await request(app)
      .post("/api/v1/applications/apply")
      .set("Cookie", getSessionCookie(candidateA))
      .send({
        jobId: job.id,
        resumeId: resumeV2Id,
      });

    expect(duplicateApplyRes.status).toBe(409);
    expect(duplicateApplyRes.body.error.code).toBe("DUPLICATE_APPLICATION");

    // 10. Candidate uploads a new Resume v3 after submitting application
    const resumeV3Text = `Bob Candidate - Completely Different Resume
Junior Graphic Designer
Photoshop, Illustrator, InDesign`;

    const uploadV3Res = await request(app)
      .post("/api/v1/resumes/upload")
      .set("Cookie", getSessionCookie(candidateA))
      .attach("resume", Buffer.from(resumeV3Text, "utf-8"), "resume_v3.txt");
    expect(uploadV3Res.status).toBe(201);

    // 11. Verify Application Snapshot is IMMUTABLE: fetching the application still has v2 score & snapshot
    const fetchAppRes = await request(app)
      .get(`/api/v1/applications/${application.id}`)
      .set("Cookie", getSessionCookie(candidateA));

    expect(fetchAppRes.status).toBe(200);
    const persistedApp = fetchAppRes.body.data.application;
    expect(persistedApp.atsSnapshot.overallScore).toBe(snapshot.overallScore);
    expect(persistedApp.atsSnapshot.requiredSkillsFound).toEqual(snapshot.requiredSkillsFound);

    // 12. Hiring-Team member accesses application ATS Report Drawer API
    const recruiterReportRes = await request(app)
      .get(`/api/v1/ats/application/${application.id}`)
      .set("Cookie", getSessionCookie(recruiter));

    expect(recruiterReportRes.status).toBe(200);
    expect(recruiterReportRes.body.success).toBe(true);
    expect(recruiterReportRes.body.data.applicationId).toBe(application.id);
    expect(recruiterReportRes.body.data.atsSnapshot.overallScore).toBe(snapshot.overallScore);
    expect(recruiterReportRes.body.data.atsReport).toBeDefined();
    expect(recruiterReportRes.body.data.atsReport.rubricVersion).toBe("v2.0-deterministic-hybrid");

    // 13. RBAC Boundary Enforcement: Another candidate (Candidate C) is FORBIDDEN
    const candidateC = await User.create({
      name: "Candidate Charlie",
      email: "charlie@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "candidate",
    });

    const unauthorizedReportRes = await request(app)
      .get(`/api/v1/ats/application/${application.id}`)
      .set("Cookie", getSessionCookie(candidateC));

    expect(unauthorizedReportRes.status).toBe(403);
    expect(unauthorizedReportRes.body.error.code).toBe("FORBIDDEN");

    const unauthorizedAppRes = await request(app)
      .get(`/api/v1/applications/${application.id}`)
      .set("Cookie", getSessionCookie(candidateC));

    expect(unauthorizedAppRes.status).toBe(403);
  });

  it("automatically generates an ATS analysis and snapshot on-the-fly when candidate applies without prior pre-check", async () => {
    const recruiter = await User.create({
      name: "Recruiter Bob",
      email: "recruiter_bob@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "hiring_team",
    });

    const job = await Job.create({
      title: "Backend Engineer (Go/Node)",
      department: "Backend",
      location: "Remote",
      employmentType: "FullTime",
      description: "Looking for a backend engineer experienced in Node.js, TypeScript, and MongoDB.",
      requirements: ["Node.js", "TypeScript", "MongoDB"],
      status: "Open",
      ownerId: recruiter.id,
      openedAt: new Date(),
    });

    const candidate = await User.create({
      name: "Direct Applicant",
      email: "direct_apply@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "candidate",
    });

    const resumeContent = `Direct Applicant
Backend Developer
Skills: Node.js, TypeScript, MongoDB, Docker
Experience:
- Developed REST microservices with Node.js and MongoDB.
Education: Computer Science`;

    const uploadRes = await request(app)
      .post("/api/v1/resumes/upload")
      .set("Cookie", getSessionCookie(candidate))
      .attach("resume", Buffer.from(resumeContent, "utf-8"), "resume_direct.txt");

    expect(uploadRes.status).toBe(201);
    const resumeId = uploadRes.body.data.resume.id;

    // Apply directly without running /ats/analyze beforehand
    const applyRes = await request(app)
      .post("/api/v1/applications/apply")
      .set("Cookie", getSessionCookie(candidate))
      .send({
        jobId: job.id,
        resumeId,
        notes: "Direct application without prior self-check",
      });

    expect(applyRes.status).toBe(201);
    expect(applyRes.body.success).toBe(true);
    const appDoc = applyRes.body.data.application;
    expect(appDoc.atsSnapshot).toBeDefined();
    expect(appDoc.atsSnapshot.overallScore).toBeGreaterThanOrEqual(60);
    expect(appDoc.atsSnapshot.matchedSkills).toEqual(expect.arrayContaining(["Node.js", "TypeScript", "MongoDB"]));
  });

  it("rejects application when target job is closed or does not exist", async () => {
    const recruiter = await User.create({
      name: "Recruiter Closed",
      email: "recruiter_closed@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "hiring_team",
    });

    const closedJob = await Job.create({
      title: "Archived Role",
      department: "Security",
      location: "Remote",
      employmentType: "FullTime",
      description: "No longer hiring.",
      requirements: ["Security"],
      status: "Closed",
      ownerId: recruiter.id,
      openedAt: new Date(),
    });

    const candidate = await User.create({
      name: "Late Applicant",
      email: "late@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "candidate",
    });

    const uploadRes = await request(app)
      .post("/api/v1/resumes/upload")
      .set("Cookie", getSessionCookie(candidate))
      .attach("resume", Buffer.from("Late Applicant Resume", "utf-8"), "late.txt");

    const resumeId = uploadRes.body.data.resume.id;

    // Attempt to apply to closed job
    const applyClosedRes = await request(app)
      .post("/api/v1/applications/apply")
      .set("Cookie", getSessionCookie(candidate))
      .send({
        jobId: closedJob.id,
        resumeId,
      });

    expect(applyClosedRes.status).toBe(422);
    expect(applyClosedRes.body.error.code).toBe("JOB_NOT_OPEN");

    // Attempt to apply to non-existent job
    const fakeId = new mongoose.Types.ObjectId().toString();
    const applyMissingRes = await request(app)
      .post("/api/v1/applications/apply")
      .set("Cookie", getSessionCookie(candidate))
      .send({
        jobId: fakeId,
        resumeId,
      });

    expect(applyMissingRes.status).toBe(404);
    expect(applyMissingRes.body.error.code).toBe("JOB_NOT_FOUND");
  });
});

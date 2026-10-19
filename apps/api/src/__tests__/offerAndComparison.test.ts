import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { app } from "../app.js";
import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { Candidate } from "../models/candidate.model.js";
import { Application } from "../models/application.model.js";
import { Interview } from "../models/interview.model.js";
import { InterviewFeedback } from "../models/interviewFeedback.model.js";
import { Offer } from "../models/offer.model.js";
import { Notification } from "../models/notification.model.js";
import { InterviewStageHistory } from "../models/stageHistory.model.js";
import { signToken, AUTH_COOKIE_NAME } from "../utils/jwt.js";

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/earlyai_ats_test";

describe("Offer Management, Candidate Comparison & Job Pipeline Stats Suite", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  beforeEach(async () => {
    await Offer.deleteMany({});
    await InterviewFeedback.deleteMany({});
    await Interview.deleteMany({});
    await InterviewStageHistory.deleteMany({});
    await Application.deleteMany({});
    await Job.deleteMany({});
    await Candidate.deleteMany({});
    await User.deleteMany({});
    await Notification.deleteMany({});
  });

  const getSessionCookie = (user: { id: string; role: string }) => {
    const token = signToken({ id: user.id, role: user.role });
    return `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax`;
  };

  it("1. Job Pipeline Stats: returns accurate stage counts and isolates recruiters", async () => {
    const recruiter1 = await User.create({
      name: "Recruiter One",
      email: "recruiter1@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "recruiter",
    });

    const recruiter2 = await User.create({
      name: "Recruiter Two",
      email: "recruiter2@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "recruiter",
    });

    const job1 = await Job.create({
      title: "Senior Full Stack Engineer",
      department: "Engineering",
      location: "Remote",
      employmentType: "FullTime",
      description: "Build robust distributed web applications",
      requirements: ["React", "Node.js", "TypeScript"],
      experienceMin: 4,
      status: "Open",
      ownerId: recruiter1._id,
    });

    const candidateA = await Candidate.create({
      name: "Alice Developer",
      email: "alice@example.com",
      skills: ["React", "TypeScript", "Node.js"],
      source: "JobBoard",
      experienceYears: 4,
      createdBy: recruiter1._id,
      updatedBy: recruiter1._id,
    });

    const candidateB = await Candidate.create({
      name: "Bob Engineer",
      email: "bob@example.com",
      skills: ["Python", "Django"],
      source: "JobBoard",
      experienceYears: 3,
      createdBy: recruiter1._id,
      updatedBy: recruiter1._id,
    });

    await Application.create({
      candidateId: candidateA._id,
      jobId: job1._id,
      recruiterId: recruiter1._id,
      stage: "Interview",
      currentStage: "Interview",
      status: "Active",
      appliedAt: new Date(),
      createdBy: recruiter1._id,
      updatedBy: recruiter1._id,
    });

    await Application.create({
      candidateId: candidateB._id,
      jobId: job1._id,
      recruiterId: recruiter1._id,
      stage: "Applied",
      currentStage: "Applied",
      status: "Active",
      appliedAt: new Date(),
      createdBy: recruiter1._id,
      updatedBy: recruiter1._id,
    });

    // Recruiter 1 fetches stats for their own job: ALLOWED (2 total, 1 Applied, 1 Interview)
    const statsRes = await request(app)
      .get(`/api/v1/jobs/${job1.id}/pipeline-stats`)
      .set("Cookie", getSessionCookie(recruiter1));

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.totalApplications).toBe(2);
    expect(statsRes.body.data.stages.Applied).toBe(1);
    expect(statsRes.body.data.stages.Interview).toBe(1);
    expect(statsRes.body.data.stages.Offer).toBe(0);

    // Recruiter 2 tries to fetch stats for Recruiter 1's job: FORBIDDEN
    const forbiddenRes = await request(app)
      .get(`/api/v1/jobs/${job1.id}/pipeline-stats`)
      .set("Cookie", getSessionCookie(recruiter2));

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.code).toBe("FORBIDDEN");
  });

  it("2. Candidate Comparison: computes 40% ATS + 60% Interview composite score and detects pending states", async () => {
    const recruiter = await User.create({
      name: "Sarah Recruiter",
      email: "sarah@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "recruiter",
    });

    const interviewer = await User.create({
      name: "Ian Interviewer",
      email: "ian@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "hiring_team",
    });

    const job = await Job.create({
      title: "Backend Architect",
      department: "Engineering",
      location: "San Francisco, CA",
      employmentType: "FullTime",
      description: "Architect scalable backend services",
      requirements: ["Go", "Node.js", "MongoDB", "Kubernetes"],
      experienceMin: 5,
      status: "Open",
      ownerId: recruiter._id,
    });

    const candidate = await Candidate.create({
      name: "Clara Candidate",
      email: "clara@example.com",
      skills: ["Go", "Node.js", "MongoDB"],
      source: "JobBoard",
      experienceYears: 5,
      createdBy: recruiter._id,
      updatedBy: recruiter._id,
    });

    const application = await Application.create({
      candidateId: candidate._id,
      jobId: job._id,
      recruiterId: recruiter._id,
      stage: "Interview",
      currentStage: "Interview",
      status: "Active",
      appliedAt: new Date(),
      createdBy: recruiter._id,
      updatedBy: recruiter._id,
      atsSnapshot: {
        overallScore: 85,
        matchedSkills: ["Go", "Node.js", "MongoDB"],
        missingCriteria: ["Kubernetes"],
        breakdown: {
          skillsScore: 90,
          experienceScore: 80,
          educationScore: 85,
          roleRelevanceScore: 80,
        },
      },
    });

    // Step A: When no interview evaluation has been submitted yet -> incomplete status
    const compRes1 = await request(app)
      .get(`/api/v1/applications/${application.id}/comparison`)
      .set("Cookie", getSessionCookie(recruiter));

    expect(compRes1.status).toBe(200);
    expect(compRes1.body.data.atsEvaluation.score).toBe(85);
    expect(compRes1.body.data.interviewEvaluation.hasInterviewScore).toBe(false);
    expect(compRes1.body.data.scoring.compositeScore).toBeNull();
    expect(compRes1.body.data.scoring.evaluationStatus).toBe("pending_interview_evaluation");

    // Step B: Submit Interview Feedback (Overall 4/5 = 80%)
    const interview = await Interview.create({
      applicationId: application._id,
      jobId: job._id,
      candidateUserId: candidate._id,
      candidateId: candidate._id,
      organizerId: recruiter._id,
      interviewers: [{ name: interviewer.name, email: interviewer.email }],
      title: "System Design Round",
      scheduledStartTime: new Date(),
      scheduledEndTime: new Date(Date.now() + 3600000),
      timezone: "UTC",
      meetingType: "google_meet",
      status: "completed",
    });

    await InterviewFeedback.create({
      interviewId: interview._id,
      applicationId: application._id,
      interviewerId: interviewer._id,
      interviewerName: interviewer.name,
      ratings: {
        technicalRating: 4,
        communicationRating: 4,
        problemSolvingRating: 4,
        cultureAndValuesRating: 4,
        overallRating: 4,
      },
      recommendation: "hire",
      strengths: "Exceptional architecture principles and systems reasoning.",
      concerns: "Limited Kubernetes production deployment experience.",
      internalNotes: "Top tier candidate for team alpha.",
      candidateReleasableFeedback: "Strong performance in systems design.",
      isReleasedToCandidate: false,
    });

    // Step C: Check candidate comparison again:
    // ATS: 85 * 0.4 = 34
    // Interview: (4/5 * 100) = 80 * 0.6 = 48
    // Composite: 34 + 48 = 82
    const compRes2 = await request(app)
      .get(`/api/v1/applications/${application.id}/comparison`)
      .set("Cookie", getSessionCookie(recruiter));

    expect(compRes2.status).toBe(200);
    expect(compRes2.body.data.scoring.isComplete).toBe(true);
    expect(compRes2.body.data.scoring.compositeScore).toBe(82);
    expect(compRes2.body.data.interviewEvaluation.normalizedScore).toBe(80);
    expect(compRes2.body.data.interviewEvaluation.rawAverageRating).toBe(4);
    expect(compRes2.body.data.interviewEvaluation.feedbacks.length).toBe(1);
    expect(compRes2.body.data.interviewEvaluation.feedbacks[0].recommendation).toBe("hire");
  });

  it("3. Offer Lifecycle: create draft -> approve -> extend -> candidate accept -> hired state transition", async () => {
    const recruiter = await User.create({
      name: "Morgan Recruiter",
      email: "morgan@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "recruiter",
    });

    const candidateUser = await User.create({
      name: "David Candidate",
      email: "david@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "candidate",
    });

    const job = await Job.create({
      title: "Staff Frontend Engineer",
      department: "Engineering",
      location: "New York, NY",
      employmentType: "FullTime",
      description: "Lead frontend architecture and design systems",
      requirements: ["React", "TypeScript", "Performance"],
      experienceMin: 6,
      status: "Open",
      ownerId: recruiter._id,
    });

    const candidate = await Candidate.create({
      name: "David Candidate",
      email: "david@example.com",
      skills: ["React", "TypeScript", "CSS"],
      source: "JobBoard",
      experienceYears: 6,
      createdBy: recruiter._id,
      updatedBy: recruiter._id,
    });

    const application = await Application.create({
      candidateId: candidate._id,
      jobId: job._id,
      recruiterId: recruiter._id,
      stage: "Interview",
      currentStage: "Interview",
      status: "Active",
      appliedAt: new Date(),
      createdBy: recruiter._id,
      updatedBy: recruiter._id,
    });

    // 1. Create Offer Draft (currency omitted to verify default INR)
    const createRes = await request(app)
      .post("/api/v1/offers")
      .set("Cookie", getSessionCookie(recruiter))
      .send({
        applicationId: application.id,
        title: "Staff Frontend Engineer",
        salary: 2800000,
        employmentType: "FullTime",
        location: "Bengaluru, KA",
        notes: "Includes performance bonus and standard benefits.",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.offer.status).toBe("Draft");
    expect(createRes.body.data.offer.salary).toBe(2800000);
    expect(createRes.body.data.offer.currency).toBe("INR");
    const offerId = createRes.body.data.offer.id;

    // 2. Approve Offer
    const approveRes = await request(app)
      .patch(`/api/v1/offers/${offerId}/approve`)
      .set("Cookie", getSessionCookie(recruiter));

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.offer.status).toBe("Approved");

    // 3. Extend Offer: sets status to Extended, transitions application to 'Offer' stage, creates candidate notification
    const extendRes = await request(app)
      .patch(`/api/v1/offers/${offerId}/extend`)
      .set("Cookie", getSessionCookie(recruiter));

    expect(extendRes.status).toBe(200);
    expect(extendRes.body.data.offer.status).toBe("Extended");

    // Verify application stage transitioned to 'Offer'
    const appAfterExtend = await Application.findById(application.id);
    expect(appAfterExtend?.currentStage).toBe("Offer");

    // Verify Notification generated for candidate
    const notifs = await Notification.find({ recipientUserId: candidateUser._id });
    expect(notifs.length).toBe(1);
    expect(notifs[0].type).toBe("offer_extended");

    // 4. Candidate checks their offers: ALLOWED
    const myOffersRes = await request(app)
      .get("/api/v1/offers/my")
      .set("Cookie", getSessionCookie(candidateUser));

    expect(myOffersRes.status).toBe(200);
    expect(myOffersRes.body.data.offers.length).toBe(1);
    expect(myOffersRes.body.data.offers[0].id).toBe(offerId);

    // 5. Candidate responds: Accepts Offer!
    const respondRes = await request(app)
      .patch(`/api/v1/offers/${offerId}/respond`)
      .set("Cookie", getSessionCookie(candidateUser))
      .send({
        response: "Accepted",
        notes: "Thrilled to join the team! Looking forward to starting on date specified.",
      });

    expect(respondRes.status).toBe(200);
    expect(respondRes.body.data.offer.status).toBe("Accepted");
    expect(respondRes.body.data.offer.candidateResponseNotes).toContain("Thrilled to join");

    // 6. Verify application automatically transitioned to 'Hired'!
    const appAfterAccept = await Application.findById(application.id);
    expect(appAfterAccept?.currentStage).toBe("Hired");
    expect(appAfterAccept?.stage).toBe("Hired");
    expect(appAfterAccept?.hiredAt).toBeDefined();

    // 7. Verify Stage History Audit Trail
    const stageHistories = await InterviewStageHistory.find({
      applicationId: application._id,
      toStage: "Hired",
    });
    expect(stageHistories.length).toBe(1);
    expect(stageHistories[0].reason).toContain("Candidate accepted");
  });

  it("4. Security & Access Isolation: Recruiter B is denied access to Recruiter A's offers, and Candidate B cannot respond to Candidate A's offer", async () => {
    const recruiterA = await User.create({
      name: "Recruiter Alpha",
      email: "alpha@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "recruiter",
    });

    const recruiterB = await User.create({
      name: "Recruiter Beta",
      email: "beta@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "recruiter",
    });

    const candidateUserA = await User.create({
      name: "Candidate Alpha",
      email: "candidate.alpha@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "candidate",
    });

    const candidateUserB = await User.create({
      name: "Candidate Beta",
      email: "candidate.beta@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "candidate",
    });

    const jobA = await Job.create({
      title: "Backend Engineer",
      department: "Core Systems",
      location: "Bengaluru, KA",
      employmentType: "FullTime",
      description: "Core backend development in Node and TypeScript",
      requirements: ["Node.js", "MongoDB"],
      experienceMin: 3,
      status: "Open",
      ownerId: recruiterA._id,
    });

    const candidateA = await Candidate.create({
      name: "Candidate Alpha",
      email: "candidate.alpha@example.com",
      skills: ["Node.js", "MongoDB"],
      source: "LinkedIn",
      experienceYears: 4,
      createdBy: recruiterA._id,
      updatedBy: recruiterA._id,
    });

    const appA = await Application.create({
      candidateId: candidateA._id,
      jobId: jobA._id,
      recruiterId: recruiterA._id,
      stage: "Interview",
      currentStage: "Interview",
      status: "Active",
      appliedAt: new Date(),
      createdBy: recruiterA._id,
      updatedBy: recruiterA._id,
    });

    // 1. Recruiter B attempts to create offer for Recruiter A's job -> FORBIDDEN (403)
    const unauthorizedOfferRes = await request(app)
      .post("/api/v1/offers")
      .set("Cookie", getSessionCookie(recruiterB))
      .send({
        applicationId: appA.id,
        title: "Backend Engineer",
        salary: 2400000,
        currency: "INR",
        employmentType: "FullTime",
        location: "Bengaluru, KA",
      });

    expect(unauthorizedOfferRes.status).toBe(403);

    // 2. Recruiter A legitimately creates and extends the offer
    const legitimateOfferRes = await request(app)
      .post("/api/v1/offers")
      .set("Cookie", getSessionCookie(recruiterA))
      .send({
        applicationId: appA.id,
        title: "Backend Engineer",
        salary: 2400000,
        currency: "INR",
        employmentType: "FullTime",
        location: "Bengaluru, KA",
      });

    expect(legitimateOfferRes.status).toBe(201);
    const offerAId = legitimateOfferRes.body.data.offer.id;

    await request(app)
      .patch(`/api/v1/offers/${offerAId}/approve`)
      .set("Cookie", getSessionCookie(recruiterA));

    await request(app)
      .patch(`/api/v1/offers/${offerAId}/extend`)
      .set("Cookie", getSessionCookie(recruiterA));

    // 3. Candidate B attempts to respond to Candidate A's offer -> FORBIDDEN (403)
    const unauthorizedCandidateRes = await request(app)
      .patch(`/api/v1/offers/${offerAId}/respond`)
      .set("Cookie", getSessionCookie(candidateUserB))
      .send({
        response: "Accepted",
        notes: "Trying to intercept another candidate's offer",
      });

    expect(unauthorizedCandidateRes.status).toBe(403);

    // Verify application stage did NOT transition to Hired for unauthorized attempt
    const appStillPending = await Application.findById(appA.id);
    expect(appStillPending?.currentStage).toBe("Offer");

    // 4. Legitimate Candidate A responds and accepts -> SUCCESS (200)
    const authorizedCandidateRes = await request(app)
      .patch(`/api/v1/offers/${offerAId}/respond`)
      .set("Cookie", getSessionCookie(candidateUserA))
      .send({
        response: "Accepted",
        notes: "Accepted by authentic candidate",
      });

    expect(authorizedCandidateRes.status).toBe(200);
    expect(authorizedCandidateRes.body.data.offer.status).toBe("Accepted");

    const appNowHired = await Application.findById(appA.id);
    expect(appNowHired?.currentStage).toBe("Hired");
  });
});

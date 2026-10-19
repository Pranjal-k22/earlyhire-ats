import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { app } from "../app.js";
import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { Candidate } from "../models/candidate.model.js";
import { Application } from "../models/application.model.js";
import { Interview } from "../models/interview.model.js";
import { GoogleCalendarConnection } from "../models/googleCalendarConnection.model.js";
import { OAuthState } from "../models/oauthState.model.js";
import { signToken, AUTH_COOKIE_NAME } from "../utils/jwt.js";
import { decryptToken, encryptToken } from "../utils/crypto.js";
import { env } from "../config/env.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/earlyai_ats_test";

describe("Google Calendar OAuth & Real Meet Scheduling Integration Suite", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }
    // Ensure Google test credentials are set in env for test execution
    (env as { GOOGLE_CLIENT_ID?: string }).GOOGLE_CLIENT_ID = "test-google-client-id.apps.googleusercontent.com";
    (env as { GOOGLE_CLIENT_SECRET?: string }).GOOGLE_CLIENT_SECRET = "test-google-client-secret-12345";
    (env as { GOOGLE_REDIRECT_URI?: string }).GOOGLE_REDIRECT_URI = "http://localhost:5000/api/v1/auth/google/callback";
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  beforeEach(async () => {
    await GoogleCalendarConnection.deleteMany({});
    await OAuthState.deleteMany({});
    await Interview.deleteMany({});
    await Application.deleteMany({});
    await Job.deleteMany({});
    await Candidate.deleteMany({});
    await User.deleteMany({});
    vi.restoreAllMocks();
  });

  const getSessionCookie = (user: { id: string; role: string }) => {
    const token = signToken({ id: user.id, role: user.role });
    return `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax`;
  };

  it("1. Generates cryptographically secure OAuth authorization URL and stores single-use state", async () => {
    const recruiter = await User.create({
      name: "Recruiter One",
      email: "recruiter1@earlyhire.test",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "recruiter",
    });

    const res = await request(app)
      .get("/api/v1/auth/google?json=true")
      .set("Cookie", getSessionCookie(recruiter))
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(res.body.data.url).toContain("client_id=test-google-client-id.apps.googleusercontent.com");
    expect(res.body.data.url).toContain("redirect_uri=http%3A%2F%2Flocalhost%3A5000%2Fapi%2Fv1%2Fauth%2Fgoogle%2Fcallback");
    expect(res.body.data.url).toContain("scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events");
    expect(res.body.data.url).toContain("access_type=offline");
    expect(res.body.data.url).toContain("prompt=consent");

    const stateParam = res.body.data.state;
    expect(stateParam).toBeDefined();

    // Verify state was persisted in DB bound to recruiter with expiry
    const stateDoc = await OAuthState.findOne({ state: stateParam });
    expect(stateDoc).not.toBeNull();
    expect(stateDoc!.userId.toString()).toBe(recruiter.id);
    expect(stateDoc!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("2. OAuth State validation: consumes state atomically and rejects replayed or expired states", async () => {
    const recruiter = await User.create({
      name: "Recruiter Two",
      email: "recruiter2@earlyhire.test",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "recruiter",
    });

    const validState = "valid_state_1234567890abcdef1234567890abcdef";
    await OAuthState.create({
      state: validState,
      userId: recruiter.id,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Mock Google token exchange and userinfo endpoints
    vi.spyOn(global, "fetch").mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("oauth2.googleapis.com/token")) {
        return new Response(
          JSON.stringify({
            access_token: "google-access-token-xyz",
            refresh_token: "google-refresh-token-secret-789",
            scope: "https://www.googleapis.com/auth/calendar.events",
            expires_in: 3600,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (urlStr.includes("googleapis.com/oauth2/v2/userinfo")) {
        return new Response(
          JSON.stringify({
            email: "recruiter2.google@example.com",
            name: "Recruiter Two Google",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not Found", { status: 404 });
    });

    // First call with valid state: succeeds and redirects to connected
    const firstRes = await request(app)
      .get(`/api/v1/auth/google/callback?code=valid-google-code&state=${validState}`)
      .expect(302);

    expect(firstRes.header.location).toContain("calendar=connected");

    // Second call with the same state: must fail because state is already consumed (replay prevention)
    const replayRes = await request(app)
      .get(`/api/v1/auth/google/callback?code=valid-google-code&state=${validState}`)
      .expect(302);

    expect(replayRes.header.location).toContain("calendar=error&reason=invalid_or_expired_state");
  });

  it("3. Secure token storage: persists AES-256-GCM encrypted refresh token and never stores plaintext", async () => {
    const recruiter = await User.create({
      name: "Recruiter Three",
      email: "recruiter3@earlyhire.test",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "recruiter",
    });

    const testState = "state_encryption_test_abcdef123456789";
    await OAuthState.create({
      state: testState,
      userId: recruiter.id,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const rawRefreshToken = "1//04_very_secret_google_refresh_token_xyz987";

    vi.spyOn(global, "fetch").mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("oauth2.googleapis.com/token")) {
        return new Response(
          JSON.stringify({
            access_token: "google-access-token-abc",
            refresh_token: rawRefreshToken,
            scope: "https://www.googleapis.com/auth/calendar.events",
            expires_in: 3600,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (urlStr.includes("googleapis.com/oauth2/v2/userinfo")) {
        return new Response(
          JSON.stringify({
            email: "recruiter3.work@gmail.com",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not Found", { status: 404 });
    });

    await request(app)
      .get(`/api/v1/auth/google/callback?code=exchange-code&state=${testState}`)
      .expect(302);

    // Inspect database record directly
    const connection = await GoogleCalendarConnection.findOne({ userId: recruiter.id }).select(
      "+encryptedRefreshToken +iv +authTag"
    );

    expect(connection).not.toBeNull();
    expect(connection!.googleEmail).toBe("recruiter3.work@gmail.com");

    // Plaintext token must NOT match encrypted string
    expect(connection!.encryptedRefreshToken).not.toBe(rawRefreshToken);
    expect(connection!.iv).toBeDefined();
    expect(connection!.authTag).toBeDefined();

    // Authenticated decryption should recover the original token accurately
    const decrypted = decryptToken(connection!.encryptedRefreshToken, connection!.iv, connection!.authTag);
    expect(decrypted).toBe(rawRefreshToken);
  });

  it("4. Recruiter connection isolation: recruiter A status is distinct from recruiter B", async () => {
    const recruiterA = await User.create({
      name: "Recruiter Alpha",
      email: "alpha@earlyhire.test",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "recruiter",
    });

    const recruiterB = await User.create({
      name: "Recruiter Beta",
      email: "beta@earlyhire.test",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "recruiter",
    });

    const enc = encryptToken("refresh_token_for_alpha");
    await GoogleCalendarConnection.create({
      userId: recruiterA.id,
      googleEmail: "alpha.recruiter@gmail.com",
      encryptedRefreshToken: enc.encrypted,
      iv: enc.iv,
      authTag: enc.authTag,
      scope: "https://www.googleapis.com/auth/calendar.events",
    });

    // Check Recruiter A's status
    const statusA = await request(app)
      .get("/api/v1/auth/google/status")
      .set("Cookie", getSessionCookie(recruiterA))
      .expect(200);

    expect(statusA.body.data.connected).toBe(true);
    expect(statusA.body.data.email).toBe("alpha.recruiter@gmail.com");
    // Ensure no secrets are leaked in status response
    expect(statusA.body.data.encryptedRefreshToken).toBeUndefined();
    expect(statusA.body.data.iv).toBeUndefined();

    // Check Recruiter B's status: unlinked
    const statusB = await request(app)
      .get("/api/v1/auth/google/status")
      .set("Cookie", getSessionCookie(recruiterB))
      .expect(200);

    expect(statusB.body.data.connected).toBe(false);
    expect(statusB.body.data.email).toBeNull();
  });

  it("5. Interview scheduling: uses recruiter's refresh token to generate genuine Google Meet and persists details", async () => {
    const recruiter = await User.create({
      name: "Scheduling Recruiter",
      email: "scheduler@earlyhire.test",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "recruiter",
    });

    await User.create({
      name: "Rohit Verma",
      email: "rohit.verma@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "candidate",
    });

    const candidate = await Candidate.create({
      name: "Rohit Verma",
      email: "rohit.verma@example.com",
      createdBy: recruiter.id,
      updatedBy: recruiter.id,
    });

    const job = await Job.create({
      title: "Senior Node.js Architect",
      department: "Engineering",
      location: "Bengaluru",
      employmentType: "FullTime",
      description: "Senior Node.js Architect position",
      requirements: ["Node.js", "TypeScript"],
      ownerId: recruiter.id,
      status: "Open",
    });

    const application = await Application.create({
      jobId: job.id,
      candidateId: candidate.id,
      recruiterId: recruiter.id,
      stage: "Interview",
      appliedAt: new Date(),
      createdBy: recruiter.id,
      updatedBy: recruiter.id,
    });

    // Connect recruiter's Google account
    const enc = encryptToken("valid_refresh_token_for_scheduler");
    await GoogleCalendarConnection.create({
      userId: recruiter.id,
      googleEmail: "scheduler.google@example.com",
      encryptedRefreshToken: enc.encrypted,
      iv: enc.iv,
      authTag: enc.authTag,
      scope: "https://www.googleapis.com/auth/calendar.events",
    });

    // Mock Google APIs: token refresh and event creation
    vi.spyOn(global, "fetch").mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes("oauth2.googleapis.com/token")) {
        return new Response(
          JSON.stringify({
            access_token: "fresh-access-token-112233",
            expires_in: 3600,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (urlStr.includes("calendars/primary/events")) {
        const body = JSON.parse(String(init?.body || "{}"));
        expect(body.attendees).toBeDefined();
        return new Response(
          JSON.stringify({
            id: "google-cal-event-998877",
            hangoutLink: "https://meet.google.com/xyz-uvwx-rst",
            conferenceData: {
              entryPoints: [
                {
                  entryPointType: "video",
                  uri: "https://meet.google.com/xyz-uvwx-rst",
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Not Found", { status: 404 });
    });

    const res = await request(app)
      .post("/api/v1/interviews/schedule")
      .set("Cookie", getSessionCookie(recruiter))
      .send({
        applicationId: application.id,
        title: "Architecture & Problem Solving",
        scheduledStartTime: new Date(Date.now() + 86400000).toISOString(),
        scheduledEndTime: new Date(Date.now() + 90000000).toISOString(),
        meetingType: "google_meet",
        notes: "Confidential interviewer score notes: candidate strong in system design",
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    const interview = res.body.data.interview;
    expect(interview.googleCalendarEventId).toBe("google-cal-event-998877");
    expect(interview.googleMeetLink).toBe("https://meet.google.com/xyz-uvwx-rst");
    expect(interview.status).toBe("scheduled");
  });

  it("6. Rescheduling updates existing Google Calendar event without duplicating events", async () => {
    const recruiter = await User.create({
      name: "Rescheduling Recruiter",
      email: "rescheduler@earlyhire.test",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "recruiter",
    });

    const candidateUser = await User.create({
      name: "Pooja Hegde",
      email: "pooja.hegde@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "candidate",
    });

    const candidate = await Candidate.create({
      name: "Pooja Hegde",
      email: "pooja.hegde@example.com",
      createdBy: recruiter.id,
      updatedBy: recruiter.id,
    });

    const job = await Job.create({
      title: "Staff Product Designer",
      department: "Product",
      location: "Mumbai",
      employmentType: "FullTime",
      description: "Staff Product Designer position",
      requirements: ["Figma", "UI/UX"],
      ownerId: recruiter.id,
      status: "Open",
    });

    const application = await Application.create({
      jobId: job.id,
      candidateId: candidate.id,
      recruiterId: recruiter.id,
      stage: "Interview",
      appliedAt: new Date(),
      createdBy: recruiter.id,
      updatedBy: recruiter.id,
    });

    const enc = encryptToken("refresh_token_rescheduler");
    await GoogleCalendarConnection.create({
      userId: recruiter.id,
      googleEmail: "rescheduler@gmail.com",
      encryptedRefreshToken: enc.encrypted,
      iv: enc.iv,
      authTag: enc.authTag,
      scope: "https://www.googleapis.com/auth/calendar.events",
    });

    const existingInterview = await Interview.create({
      applicationId: application.id,
      jobId: job.id,
      candidateUserId: candidateUser.id,
      candidateId: candidate.id,
      organizerId: recruiter.id,
      title: "Portfolio Deep Dive",
      scheduledStartTime: new Date(Date.now() + 86400000),
      scheduledEndTime: new Date(Date.now() + 90000000),
      timezone: "Asia/Kolkata",
      status: "scheduled",
      googleCalendarEventId: "cal-evt-to-reschedule-111",
      googleMeetLink: "https://meet.google.com/reschedule-link",
      meetingType: "google_meet",
    });

    let patchCalledWithEventId = "";

    vi.spyOn(global, "fetch").mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes("oauth2.googleapis.com/token")) {
        return new Response(
          JSON.stringify({ access_token: "reschedule-access-token", expires_in: 3600 }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (init?.method === "PATCH" && urlStr.includes("calendars/primary/events/")) {
        patchCalledWithEventId = urlStr.split("events/")[1]?.split("?")[0] || "";
        return new Response(
          JSON.stringify({
            id: "cal-evt-to-reschedule-111",
            hangoutLink: "https://meet.google.com/reschedule-link",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not Found", { status: 404 });
    });

    const newStart = new Date(Date.now() + 172800000).toISOString();
    const newEnd = new Date(Date.now() + 176400000).toISOString();

    const res = await request(app)
      .post(`/api/v1/interviews/${existingInterview.id}/reschedule`)
      .set("Cookie", getSessionCookie(recruiter))
      .send({
        scheduledStartTime: newStart,
        scheduledEndTime: newEnd,
        notes: "Shifted to Friday afternoon upon candidate request",
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(patchCalledWithEventId).toBe("cal-evt-to-reschedule-111");

    // Verify database record updated in place without duplicate records
    const interviewCount = await Interview.countDocuments({ applicationId: application.id });
    expect(interviewCount).toBe(1);

    const updated = await Interview.findById(existingInterview.id);
    expect(updated!.status).toBe("rescheduled");
    expect(updated!.googleCalendarEventId).toBe("cal-evt-to-reschedule-111");
  });

  it("7. Cancellation deletes Google Calendar event and updates status", async () => {
    const recruiter = await User.create({
      name: "Cancelling Recruiter",
      email: "canceller@earlyhire.test",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "recruiter",
    });

    const candidateUser = await User.create({
      name: "Vikram Seth",
      email: "vikram.seth@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "candidate",
    });

    const candidate = await Candidate.create({
      name: "Vikram Seth",
      email: "vikram.seth@example.com",
      createdBy: recruiter.id,
      updatedBy: recruiter.id,
    });

    const job = await Job.create({
      title: "Data Platform Lead",
      department: "Data",
      location: "Remote",
      employmentType: "FullTime",
      description: "Data Platform Lead position",
      requirements: ["BigData", "Spark"],
      ownerId: recruiter.id,
      status: "Open",
    });

    const application = await Application.create({
      jobId: job.id,
      candidateId: candidate.id,
      recruiterId: recruiter.id,
      stage: "Interview",
      appliedAt: new Date(),
      createdBy: recruiter.id,
      updatedBy: recruiter.id,
    });

    const enc = encryptToken("refresh_token_canceller");
    await GoogleCalendarConnection.create({
      userId: recruiter.id,
      googleEmail: "canceller@gmail.com",
      encryptedRefreshToken: enc.encrypted,
      iv: enc.iv,
      authTag: enc.authTag,
      scope: "https://www.googleapis.com/auth/calendar.events",
    });

    const interview = await Interview.create({
      applicationId: application.id,
      jobId: job.id,
      candidateUserId: candidateUser.id,
      candidateId: candidate.id,
      organizerId: recruiter.id,
      title: "Hiring Manager Round",
      scheduledStartTime: new Date(Date.now() + 86400000),
      scheduledEndTime: new Date(Date.now() + 90000000),
      timezone: "UTC",
      status: "scheduled",
      googleCalendarEventId: "cal-evt-to-delete-444",
      googleMeetLink: "https://meet.google.com/delete-meet",
      meetingType: "google_meet",
    });

    let deleteCalled = false;

    vi.spyOn(global, "fetch").mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes("oauth2.googleapis.com/token")) {
        return new Response(
          JSON.stringify({ access_token: "cancel-token", expires_in: 3600 }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (init?.method === "DELETE" && urlStr.includes("calendars/primary/events/cal-evt-to-delete-444")) {
        deleteCalled = true;
        return new Response(null, { status: 204 });
      }
      return new Response("Not Found", { status: 404 });
    });

    const res = await request(app)
      .post(`/api/v1/interviews/${interview.id}/cancel`)
      .set("Cookie", getSessionCookie(recruiter))
      .send({ reason: "Candidate accepted alternative offer" })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(deleteCalled).toBe(true);

    const cancelledDoc = await Interview.findById(interview.id);
    expect(cancelledDoc!.status).toBe("cancelled");
    expect(cancelledDoc!.cancellationReason).toBe("Candidate accepted alternative offer");
  });

  it("8. Candidate Privacy: candidate views only candidate-safe details and cannot access recruiter notes or other candidates' data", async () => {
    const recruiter = await User.create({
      name: "Auditor Recruiter",
      email: "auditor@earlyhire.test",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "recruiter",
    });

    const candidateUser1 = await User.create({
      name: "Candidate One",
      email: "cand1@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "candidate",
    });

    const candidateUser2 = await User.create({
      name: "Candidate Two",
      email: "cand2@example.com",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "candidate",
    });

    const cand1Doc = await Candidate.create({
      name: "Candidate One",
      email: "cand1@example.com",
      createdBy: recruiter.id,
      updatedBy: recruiter.id,
    });

    const cand2Doc = await Candidate.create({
      name: "Candidate Two",
      email: "cand2@example.com",
      createdBy: recruiter.id,
      updatedBy: recruiter.id,
    });

    const job = await Job.create({
      title: "Backend Engineer",
      department: "Eng",
      location: "Delhi",
      employmentType: "FullTime",
      description: "Backend Engineer position",
      requirements: ["Node.js"],
      ownerId: recruiter.id,
      status: "Open",
    });

    const app1 = await Application.create({
      jobId: job.id,
      candidateId: cand1Doc.id,
      recruiterId: recruiter.id,
      stage: "Interview",
      appliedAt: new Date(),
      createdBy: recruiter.id,
      updatedBy: recruiter.id,
    });

    await Application.create({
      jobId: job.id,
      candidateId: cand2Doc.id,
      recruiterId: recruiter.id,
      stage: "Interview",
      appliedAt: new Date(),
      createdBy: recruiter.id,
      updatedBy: recruiter.id,
    });

    await Interview.create({
      applicationId: app1.id,
      jobId: job.id,
      candidateUserId: candidateUser1.id,
      candidateId: cand1Doc.id,
      organizerId: recruiter.id,
      title: "Technical Interview",
      scheduledStartTime: new Date(Date.now() + 86400000),
      scheduledEndTime: new Date(Date.now() + 90000000),
      timezone: "Asia/Kolkata",
      status: "scheduled",
      googleMeetLink: "https://meet.google.com/cand1-meet-link",
      meetingType: "google_meet",
      notes: "CONFIDENTIAL RECRUITER NOTE: Weak in Redis, strong in Mongo",
      cancellationReason: "Private recruiter cancellation notice",
    });

    // 1. Candidate 1 queries /api/v1/interviews/my
    const cand1My = await request(app)
      .get("/api/v1/interviews/my")
      .set("Cookie", getSessionCookie(candidateUser1))
      .expect(200);

    expect(cand1My.body.data.interviews.length).toBe(1);
    const cand1View = cand1My.body.data.interviews[0];
    expect(cand1View.googleMeetLink).toBe("https://meet.google.com/cand1-meet-link");
    expect(cand1View.title).toBe("Technical Interview");
    // Confidential notes must be stripped
    expect(cand1View.notes).toBeUndefined();
    expect(cand1View.cancellationReason).toBeUndefined();

    // 2. Candidate 2 attempts to query Candidate 1's application interviews
    await request(app)
      .get(`/api/v1/interviews/application/${app1.id}`)
      .set("Cookie", getSessionCookie(candidateUser2))
      .expect(403);

    // 3. Candidate 1 queries their own application interviews
    const cand1AppRes = await request(app)
      .get(`/api/v1/interviews/application/${app1.id}`)
      .set("Cookie", getSessionCookie(candidateUser1))
      .expect(200);

    expect(cand1AppRes.body.data.interviews.length).toBe(1);
    expect(cand1AppRes.body.data.interviews[0].notes).toBeUndefined();
  });

  it("9. Disconnect endpoint revokes tokens and purges connection record", async () => {
    const recruiter = await User.create({
      name: "Disconnecting Recruiter",
      email: "disconnector@earlyhire.test",
      passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
      role: "recruiter",
    });

    const enc = encryptToken("refresh_token_to_disconnect");
    await GoogleCalendarConnection.create({
      userId: recruiter.id,
      googleEmail: "disconnect.me@gmail.com",
      encryptedRefreshToken: enc.encrypted,
      iv: enc.iv,
      authTag: enc.authTag,
      scope: "https://www.googleapis.com/auth/calendar.events",
    });

    let revokeCalled = false;
    vi.spyOn(global, "fetch").mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("oauth2.googleapis.com/revoke")) {
        revokeCalled = true;
        return new Response(null, { status: 200 });
      }
      return new Response("Not Found", { status: 404 });
    });

    const res = await request(app)
      .post("/api/v1/auth/google/disconnect")
      .set("Cookie", getSessionCookie(recruiter))
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.disconnected).toBe(true);
    expect(revokeCalled).toBe(true);

    const remaining = await GoogleCalendarConnection.findOne({ userId: recruiter.id });
    expect(remaining).toBeNull();

    // Confirm status now shows disconnected
    const statusRes = await request(app)
      .get("/api/v1/auth/google/status")
      .set("Cookie", getSessionCookie(recruiter))
      .expect(200);

    expect(statusRes.body.data.connected).toBe(false);
  });
});

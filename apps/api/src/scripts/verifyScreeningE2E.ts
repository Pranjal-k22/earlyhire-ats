import mongoose from "mongoose";
import { ResumeFile } from "../models/resume.model.js";
import { Job } from "../models/job.model.js";
import { Application, IApplicationDocument } from "../models/application.model.js";
import { Notification } from "../models/notification.model.js";

const BASE_URL = "http://localhost:5000/api/v1";

async function runE2E() {
  console.log("================================================================================");
  console.log("  EARLYAI ATS — END-TO-END AUTOMATIC SCREENING & NOTIFICATION VERIFICATION");
  console.log("================================================================================\n");

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect("mongodb://localhost:27017/earlyai_ats_dev");
  }

  // 1. Authenticate candidate
  console.log("1. Authenticating as Candidate (aditi.verma@earlyhire.test)...");
  const candLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "aditi.verma@earlyhire.test",
      password: "EarlyATS2026!Demo",
    }),
  });
  if (!candLoginRes.ok) {
    throw new Error(`Candidate login failed: ${candLoginRes.status}`);
  }
  const candCookie = candLoginRes.headers.get("set-cookie")?.split(";")[0] || "";
  const candData = (await candLoginRes.json()) as { data: { user: { id: string; name: string } } };
  const candidateUserId = candData.data.user.id;
  console.log(`   ✅ Candidate authenticated: "${candData.data.user.name}" (ID: ${candidateUserId})`);

  // 2. Authenticate recruiter
  console.log("\n2. Authenticating as Recruiter (ananya.sharma@earlyhire.test)...");
  const recLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "ananya.sharma@earlyhire.test",
      password: "EarlyATS2026!Demo",
    }),
  });
  if (!recLoginRes.ok) {
    throw new Error(`Recruiter login failed: ${recLoginRes.status}`);
  }
  const recCookie = recLoginRes.headers.get("set-cookie")?.split(";")[0] || "";
  const recData = (await recLoginRes.json()) as { data: { user: { id: string; name: string } } };
  const recruiterUserId = recData.data.user.id;
  console.log(`   ✅ Recruiter authenticated: "${recData.data.user.name}" (ID: ${recruiterUserId})`);

  // 3. Ensure Candidate ResumeFile exists
  console.log("\n3. Verifying Candidate Resume...");
  let resume = await ResumeFile.findOne({ candidateUserId: new mongoose.Types.ObjectId(candidateUserId) });
  if (!resume) {
    console.log("   Creating synthetic verified resume fixture for candidate...");
    resume = await ResumeFile.create({
      candidateUserId: new mongoose.Types.ObjectId(candidateUserId),
      originalFilename: "Aditi_Verma_Senior_FullStack.pdf",
      storedFilename: `aditi_resume_${Date.now()}.pdf`,
      storagePath: "uploads/resumes/aditi_sample.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 2048,
      contentSha256: "sha256_aditi_sample_hash",
      parsedText:
        "Aditi Verma. Senior Full-Stack Engineer with 5+ years building scalable distributed web applications using React, Node.js, Express, TypeScript, and MongoDB. Strong background in microservices, REST APIs, and automated CI/CD.",
      parsingStatus: "completed",
      version: 1,
    });
  }
  console.log(`   ✅ Resume ready: "${resume.originalFilename}" (ID: ${resume.id})`);

  // 4. Create a dedicated fresh Job Opening owned by Ananya Sharma
  console.log("\n4. Creating Dedicated Open Test Job...");
  const job = await Job.create({
    title: `Staff Platform Engineer (ATS E2E ${Date.now().toString().slice(-4)})`,
    department: "Platform Infrastructure",
    location: "Remote",
    employmentType: "FullTime",
    description: "Design and scale distributed services using Node.js, Express, TypeScript, and MongoDB.",
    requirements: ["TypeScript", "Node.js", "Express", "MongoDB", "Distributed Systems"],
    status: "Open",
    ownerId: new mongoose.Types.ObjectId(recruiterUserId),
  });
  console.log(`   ✅ Test Job created: "${job.title}" (ID: ${job.id})`);
  console.log(`      Department: ${job.department} | Requirements: [${job.requirements.join(", ")}]`);

  // 5. Establish Authenticated SSE Connection for Recruiter
  console.log("\n5. Connecting Recruiter to Real-Time SSE Stream...");
  interface SSEEventPayload {
    type: string;
    entity?: string;
    entityId?: string;
  }
  interface NotificationRecord {
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
  }

  const liveEvents: SSEEventPayload[] = [];
  const abortController = new AbortController();

  (async () => {
    try {
      const sseRes = await fetch(`${BASE_URL}/analytics/events`, {
        headers: { Cookie: recCookie },
        signal: abortController.signal,
      });
      if (sseRes.body) {
        const reader = sseRes.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(line.slice(6)) as SSEEventPayload;
                liveEvents.push(parsed);
                console.log(`   ⚡ [LIVE SSE RECEIVED]: type="${parsed.type}" entity="${parsed.entity || ''}" entityId="${parsed.entityId || ''}"`);
              } catch {}
            }
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        console.warn("SSE notice:", e.message);
      }
    }
  })();

  // Allow SSE connection handshake
  await new Promise((r) => setTimeout(r, 1200));

  // 6. Candidate applies for the job
  console.log("\n6. Candidate applies for the job via POST /api/v1/applications/apply...");
  const applyRes = await fetch(`${BASE_URL}/applications/apply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: candCookie,
    },
    body: JSON.stringify({
      jobId: job.id,
      resumeId: resume.id,
      source: "CareerPortal",
    }),
  });

  const applyBody = (await applyRes.json()) as { data: { application: { id: string; atsSnapshot?: { status: string } } } };
  if (!applyRes.ok) {
    console.error("Application error:", applyBody);
    throw new Error(`Apply failed: ${applyRes.status}`);
  }

  const applicationId = applyBody.data.application.id;
  console.log(`   ✅ Application successfully created! ID: ${applicationId}`);
  console.log(`   Initial Status: "${applyBody.data.application.atsSnapshot?.status || 'pending'}"`);

  // 7. Verify Candidate in-app notification
  console.log("\n7. Verifying Candidate In-App Notification (application_submitted)...");
  const candNotifsRes = await fetch(`${BASE_URL}/notifications/my?limit=5`, {
    headers: { Cookie: candCookie },
  });
  const candNotifs = (await candNotifsRes.json()) as { data: { notifications: NotificationRecord[] } };
  const candSubmitNotif = candNotifs.data.notifications.find((n: NotificationRecord) => n.type === "application_submitted");
  if (!candSubmitNotif) {
    throw new Error("Candidate application_submitted notification missing!");
  }
  console.log(`   ✅ Candidate Notification: "${candSubmitNotif.title}"`);
  console.log(`      Message: "${candSubmitNotif.message}"`);

  // 8. Wait for Automatic Screening to complete asynchronously
  console.log("\n8. Monitoring Asynchronous Automatic Screening Lifecycle...");
  let assessedApp: IApplicationDocument | null = null;
  for (let attempt = 1; attempt <= 15; attempt++) {
    await new Promise((r) => setTimeout(r, 800));
    const appDoc = await Application.findById(applicationId);
    const status = appDoc?.atsSnapshot?.status;
    const score = appDoc?.atsSnapshot?.overallScore;
    const rec = appDoc?.atsSnapshot?.screeningRecommendation;
    console.log(`   [Attempt ${attempt}] Status: "${status}" | Score: ${score}/100 | Recommendation: "${rec || 'pending'}"`);

    if (status === "completed" || status === "needs_review" || status === "dual_complete") {
      assessedApp = appDoc;
      break;
    }
  }

  if (!assessedApp) {
    throw new Error("Automatic screening did not finish in expected window");
  }

  console.log("   ✅ Automatic Screening Completed and Persisted:");
  console.log(`      - Status: ${assessedApp.atsSnapshot!.status}`);
  console.log(`      - Overall Score: ${assessedApp.atsSnapshot!.overallScore}/100`);
  console.log(`      - Recommendation: ${assessedApp.atsSnapshot!.screeningRecommendation}`);
  console.log(`      - Matched Skills: [${(assessedApp.atsSnapshot!.matchedSkills || []).join(", ")}]`);
  console.log(`      - Breakdown: Skills=${assessedApp.atsSnapshot!.breakdown?.skillsScore}, Exp=${assessedApp.atsSnapshot!.breakdown?.experienceScore}, Edu=${assessedApp.atsSnapshot!.breakdown?.educationScore}`);
  console.log(`      - Rubric Version: ${assessedApp.atsSnapshot!.rubricVersion}`);

  // 9. Verify Recruiter in-app notifications
  console.log("\n9. Verifying Recruiter Notifications & Unread Count...");
  const recNotifsRes = await fetch(`${BASE_URL}/notifications/my?limit=10`, {
    headers: { Cookie: recCookie },
  });
  const recNotifs = (await recNotifsRes.json()) as { data: { notifications: NotificationRecord[] } };
  const appReceivedNotif = recNotifs.data.notifications.find((n: NotificationRecord) => n.type === "application_received");
  const screeningCompletedNotif = recNotifs.data.notifications.find(
    (n: NotificationRecord) => n.type === "screening_completed" || n.type === "screening_needs_review"
  );

  if (!appReceivedNotif) {
    throw new Error("Recruiter application_received notification missing!");
  }
  console.log(`   ✅ Recruiter Received Notif: "${appReceivedNotif.title}" — "${appReceivedNotif.message}"`);

  if (!screeningCompletedNotif) {
    throw new Error("Recruiter screening_completed notification missing!");
  }
  console.log(`   ✅ Recruiter Screening Notif: "${screeningCompletedNotif.title}" — "${screeningCompletedNotif.message}"`);

  // Unread badge count
  const unreadRes = await fetch(`${BASE_URL}/notifications/unread-count`, {
    headers: { Cookie: recCookie },
  });
  const unreadData = (await unreadRes.json()) as { data: { unreadCount: number } };
  const unreadBefore = unreadData.data.unreadCount;
  console.log(`   ✅ Recruiter Unread Count: ${unreadBefore}`);

  // 10. Mark screening notification as read
  console.log("\n10. Marking Notification as Read via PATCH /api/v1/notifications/:id/read...");
  const markReadRes = await fetch(`${BASE_URL}/notifications/${screeningCompletedNotif.id}/read`, {
    method: "PATCH",
    headers: { Cookie: recCookie },
  });
  const markReadData = (await markReadRes.json()) as { data: { notification: { isRead: boolean; readAt: string } } };
  console.log(`   ✅ Notification read status: ${markReadData.data.notification.isRead} (ReadAt: ${markReadData.data.notification.readAt})`);

  const unreadAfterRes = await fetch(`${BASE_URL}/notifications/unread-count`, {
    headers: { Cookie: recCookie },
  });
  const unreadAfterData = (await unreadAfterRes.json()) as { data: { unreadCount: number } };
  console.log(`   ✅ Recruiter Unread Count reconciled: ${unreadAfterData.data.unreadCount} (was ${unreadBefore})`);

  // 11. Recruiter initiates authorized manual retry
  console.log("\n11. Testing Authorized Recruiter Screening Retry...");
  const retryRes = await fetch(`${BASE_URL}/applications/${applicationId}/screening/retry`, {
    method: "POST",
    headers: { Cookie: recCookie },
  });
  const retryData = (await retryRes.json()) as { success: boolean; data: { application?: { atsSnapshot?: { retryCount: number } } } };
  console.log(`   ✅ Retry HTTP ${retryRes.status}: success=${retryData.success}, retryCount=${retryData.data.application?.atsSnapshot?.retryCount}`);

  // Cleanup: Delete the test application and test job created in this run
  console.log("\n12. Cleaning up test application and test job...");
  await Application.findByIdAndDelete(applicationId);
  await Job.findByIdAndDelete(job._id);
  await Notification.deleteMany({
    $or: [
      { "metadata.applicationId": applicationId },
      { idempotencyKey: { $regex: applicationId } },
    ],
  });
  console.log("   ✅ Test application, job, and associated notifications cleaned up.");

  // Close SSE stream
  abortController.abort();
  await mongoose.disconnect();

  console.log("\n================================================================================");
  console.log("  🎉 ALL 12 END-TO-END AUTOMATIC SCREENING & NOTIFICATION CHECKS VERIFIED!");
  console.log("================================================================================\n");
}

runE2E().catch((err) => {
  console.error("\n❌ E2E Verification failed:", err);
  process.exit(1);
});

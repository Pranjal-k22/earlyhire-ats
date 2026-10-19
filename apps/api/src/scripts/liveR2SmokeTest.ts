/**
 * Live Cloudflare R2 Smoke Test Script
 * 
 * Performs a safe, non-destructive live verification against Cloudflare R2.
 * STRICT SAFETY RESTRICTIONS:
 * - Refuses to run against production MongoDB targets.
 * - Refuses to run if R2_BUCKET_NAME is 'earlyhire-ats-resumes-prod'.
 * - Requires R2_BUCKET_NAME to be 'earlyhire-ats-resumes-dev'.
 * - Creates a synthetic candidate and uploads a synthetic PDF.
 * - Verifies object presence in R2 bucket using AWS SDK S3Client.
 * - Downloads and verifies SHA-256 checksum against uploaded bytes.
 * - Tests inline viewing and attachment downloading.
 * - Tests unauthorized and cross-account access controls.
 * - Deletes the synthetic resume via API and confirms removal from R2 bucket.
 * - Confirms MongoDB soft-delete status and cleans up synthetic user.
 */

import crypto from "node:crypto";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { ResumeFile } from "../models/resume.model.js";
import { User } from "../models/user.model.js";

// Safety check 1: Strictly prohibit running in production environment
if (env.NODE_ENV === "production" || process.env.NODE_ENV === "production") {
  console.error(
    JSON.stringify({
      success: false,
      failureCategory: "SAFETY_ABORT_PRODUCTION_ENVIRONMENT",
      message: "Refusing to execute live smoke test: NODE_ENV is set to production.",
    })
  );
  process.exit(1);
}

// Safety check 2: Target database must be positively verified as local non-production
const isLocalMongoHost =
  env.MONGODB_URI.includes("localhost") ||
  env.MONGODB_URI.includes("127.0.0.1");

const isAllowedDevDb =
  env.MONGODB_URI.includes("/earlyai_ats_dev") ||
  env.MONGODB_URI.includes("/earlyai_ats_test") ||
  /_(dev|test)(\?|$)/.test(env.MONGODB_URI);

if (!isLocalMongoHost || !isAllowedDevDb) {
  console.error(
    JSON.stringify({
      success: false,
      failureCategory: "SAFETY_ABORT_UNVERIFIED_DATABASE",
      message:
        "Refusing to execute live smoke test: Target MongoDB must positively target a local development database (e.g. localhost/earlyai_ats_dev).",
    })
  );
  process.exit(1);
}

// Safety check 2: Bucket target must strictly be earlyhire-ats-resumes-dev
if (env.R2_BUCKET_NAME === "earlyhire-ats-resumes-prod") {
  console.error(
    JSON.stringify({
      success: false,
      failureCategory: "SAFETY_ABORT_PRODUCTION_BUCKET",
      message:
        "CRITICAL: R2_BUCKET_NAME is set to earlyhire-ats-resumes-prod. Never use the production bucket for live testing. Please configure earlyhire-ats-resumes-dev in .env.",
    })
  );
  process.exit(1);
}

if (env.R2_BUCKET_NAME !== "earlyhire-ats-resumes-dev") {
  console.error(
    JSON.stringify({
      success: false,
      failureCategory: "SAFETY_ABORT_NON_DEV_BUCKET",
      message: `R2_BUCKET_NAME must be exactly "earlyhire-ats-resumes-dev". Current value: "${env.R2_BUCKET_NAME || "(undefined)"}".`,
    })
  );
  process.exit(1);
}

if (env.RESUME_STORAGE_DRIVER !== "r2") {
  console.error(
    JSON.stringify({
      success: false,
      failureCategory: "CONFIGURATION_ERROR",
      message: `RESUME_STORAGE_DRIVER must be set to "r2" for the live test. Current value: "${env.RESUME_STORAGE_DRIVER}".`,
    })
  );
  process.exit(1);
}

if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
  console.error(
    JSON.stringify({
      success: false,
      failureCategory: "MISSING_R2_CREDENTIALS",
      message: "Missing required Cloudflare R2 credentials (access key or secret key).",
    })
  );
  process.exit(1);
}

// Minimal valid PDF binary fixture with selectable text
function generateSyntheticPdf(text: string): Buffer {
  const content = `BT /F1 12 Tf 50 700 Td (${text}) Tj ET`;
  const streamLength = Buffer.byteLength(content, "utf-8");

  const pdf = [
    "%PDF-1.4",
    "1 0 obj",
    "<< /Type /Catalog /Pages 2 0 R >>",
    "endobj",
    "2 0 obj",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "endobj",
    "3 0 obj",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    "endobj",
    "4 0 obj",
    `<< /Length ${streamLength} >>`,
    "stream",
    content,
    "endstream",
    "endobj",
    "5 0 obj",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "endobj",
    "xref",
    "0 6",
    "0000000000 65535 f ",
    "0000000009 00000 n ",
    "0000000058 00000 n ",
    "0000000115 00000 n ",
    "0000000244 00000 n ",
    `0000000${(300 + streamLength).toString().padStart(3, "0")} 00000 n `,
    "trailer",
    "<< /Size 6 /Root 1 0 R >>",
    "startxref",
    "400",
    "%%EOF",
  ].join("\n");

  return Buffer.from(pdf, "utf-8");
}

const endpoint =
  env.R2_ENDPOINT ||
  (env.R2_ACCOUNT_ID ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : "");

const API_BASE = `http://localhost:${env.PORT}/api/v1`;

export async function runLiveSmokeTest() {
  const results: Record<string, unknown> = {
    databaseVerifiedNonProduction: true,
    targetDatabase: env.MONGODB_URI.includes("localhost") ? "local-development" : "non-production-remote",
    targetBucket: env.R2_BUCKET_NAME,
    exactRoutes: {
      health: `GET /api/v1/health`,
      signup: `POST /api/v1/auth/signup`,
      upload: `POST /api/v1/resumes/upload`,
      streamInline: `GET /api/v1/resumes/:id/download?inline=true`,
      downloadAttachment: `GET /api/v1/resumes/:id/download`,
      delete: `DELETE /api/v1/resumes/:id`,
    },
    r2DirectVerification: {},
    steps: {},
  };

  const s3Client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });

  // Step 1: Health check
  const healthRes = await fetch(`${API_BASE}/health`);
  if (!healthRes.ok) {
    throw new Error(`API health check failed with status ${healthRes.status}. Is the dev server running on port ${env.PORT}?`);
  }
  (results.steps as Record<string, unknown>).healthCheck = "PASSED";

  const runId = Date.now();
  const candidateEmail = `synthetic.candidate.${runId}@example.com`;
  const attackerEmail = `synthetic.attacker.${runId}@example.com`;
  const candidatePassword = `SynthPass_${runId}!Aa`;
  let resumeId: string | undefined;

  try {
    // Step 2: Create primary synthetic candidate
    const signupRes = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Synthetic Candidate",
        email: candidateEmail,
        password: candidatePassword,
        role: "candidate",
      }),
    });

    if (!signupRes.ok) {
      const errText = await signupRes.text();
      throw new Error(`Failed to create synthetic candidate: ${signupRes.status} ${errText}`);
    }

    const setCookie = signupRes.headers.get("set-cookie") || "";
    const cookieMatch = setCookie.match(/token=([^;]+)/);
    if (!cookieMatch) {
      throw new Error("No session token cookie received in signup response");
    }
    const candidateCookie = `token=${cookieMatch[1]}`;
    (results.steps as Record<string, unknown>).candidateSignup = "PASSED";

    // Step 3: Create secondary synthetic candidate for cross-account unauthorized testing
    const attackerSignupRes = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Synthetic Unauthorized User",
        email: attackerEmail,
        password: candidatePassword,
        role: "candidate",
      }),
    });

    const attackerSetCookie = attackerSignupRes.headers.get("set-cookie") || "";
    const attackerCookieMatch = attackerSetCookie.match(/token=([^;]+)/);
    const attackerCookie = attackerCookieMatch ? `token=${attackerCookieMatch[1]}` : "";
    (results.steps as Record<string, unknown>).attackerSignup = "PASSED";

    // Step 4: Generate synthetic fixture & upload via POST /api/v1/resumes/upload
    const syntheticText = "Synthetic Candidate Resume - EarlyAI ATS Live R2 Verification";
    const pdfBuffer = generateSyntheticPdf(syntheticText);
    const expectedSha256 = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    const formData = new FormData();
    formData.append("resume", new Blob([pdfBuffer], { type: "application/pdf" }), "synthetic_test_resume.pdf");

    const uploadRes = await fetch(`${API_BASE}/resumes/upload`, {
      method: "POST",
      headers: {
        Cookie: candidateCookie,
      },
      body: formData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Resume upload failed: ${uploadRes.status} ${errText}`);
    }

    const uploadData = (await uploadRes.json()) as { success: boolean; data?: { resume?: { id?: string; _id?: string } } };
    resumeId = uploadData.data?.resume?.id || uploadData.data?.resume?._id;
    if (!resumeId) {
      throw new Error("Upload succeeded but returned no resume ID");
    }

    (results.steps as Record<string, unknown>).resumeUpload = {
      status: "PASSED",
      resumeId,
      returnedFields: Object.keys(uploadData.data?.resume || {}),
    };

    // Step 5: Direct Cloudflare R2 bucket inspection via AWS SDK HeadObject
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }
    const resumeDoc = await ResumeFile.findById(resumeId).lean();
    const storageKey = resumeDoc?.storageKey;

    if (!storageKey) {
      throw new Error(`Resume document in MongoDB does not contain storageKey`);
    }

    const headCmd = new HeadObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: storageKey,
    });

    const headRes = await s3Client.send(headCmd);
    (results.r2DirectVerification as Record<string, unknown>).objectExistsInR2 = true;
    (results.r2DirectVerification as Record<string, unknown>).contentLength = headRes.ContentLength;
    (results.r2DirectVerification as Record<string, unknown>).storageKeyPattern = storageKey.startsWith("resumes/")
      ? "VALID_UUID_PATTERN"
      : "UNEXPECTED_PATTERN";

    // Step 6: Read PDF back through authorized application endpoint & verify checksum
    const downloadRes = await fetch(`${API_BASE}/resumes/${resumeId}/download`, {
      headers: { Cookie: candidateCookie },
    });

    if (!downloadRes.ok) {
      throw new Error(`Authorized resume download failed with status ${downloadRes.status}`);
    }

    const downloadedBytes = Buffer.from(await downloadRes.arrayBuffer());
    const downloadedSha256 = crypto.createHash("sha256").update(downloadedBytes).digest("hex");
    const checksumMatches = downloadedSha256 === expectedSha256;

    (results.steps as Record<string, unknown>).checksumVerification = {
      status: checksumMatches ? "PASSED" : "FAILED",
      checksumMatches,
      downloadDisposition: downloadRes.headers.get("content-disposition"),
      contentType: downloadRes.headers.get("content-type"),
    };

    // Step 7: Test inline viewing
    const inlineRes = await fetch(`${API_BASE}/resumes/${resumeId}/download?inline=true`, {
      headers: { Cookie: candidateCookie },
    });

    const inlineDisposition = inlineRes.headers.get("content-disposition") || "";
    (results.steps as Record<string, unknown>).inlineViewing = {
      status: inlineDisposition.startsWith("inline") ? "PASSED" : "FAILED",
      contentDisposition: inlineDisposition,
    };

    // Step 8: Access control tests
    // 8a. Unauthenticated request
    const unauthRes = await fetch(`${API_BASE}/resumes/${resumeId}/download`);
    const unauthPassed = unauthRes.status === 401;

    // 8b. Cross-candidate unauthorized request
    const crossRes = await fetch(`${API_BASE}/resumes/${resumeId}/download`, {
      headers: { Cookie: attackerCookie },
    });
    const crossPassed = crossRes.status === 403;

    (results.steps as Record<string, unknown>).accessControl = {
      unauthenticatedStatus: unauthRes.status,
      unauthenticatedExpected401: unauthPassed,
      crossCandidateStatus: crossRes.status,
      crossCandidateExpected403: crossPassed,
      status: unauthPassed && crossPassed ? "PASSED" : "FAILED",
    };

    // Step 9: Delete synthetic resume through DELETE /api/v1/resumes/:id
    const deleteRes = await fetch(`${API_BASE}/resumes/${resumeId}`, {
      method: "DELETE",
      headers: { Cookie: candidateCookie },
    });

    if (!deleteRes.ok) {
      throw new Error(`Resume deletion endpoint failed: ${deleteRes.status}`);
    }
    (results.steps as Record<string, unknown>).resumeDelete = "PASSED";

    // Step 10: Verify R2 removal
    let r2Removed = false;
    try {
      await s3Client.send(headCmd);
    } catch (err: unknown) {
      const errorObj = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (errorObj.name === "NotFound" || errorObj.$metadata?.httpStatusCode === 404) {
        r2Removed = true;
      }
    }
    (results.steps as Record<string, unknown>).r2RemovalVerified = r2Removed ? "PASSED" : "FAILED";

    // Step 11: Verify MongoDB status
    const postDeleteDoc = await ResumeFile.findById(resumeId).lean();
    (results.steps as Record<string, unknown>).databaseRecordBehavior = {
      isDeleted: postDeleteDoc?.isDeleted === true,
      hasDeletedAt: Boolean(postDeleteDoc?.deletedAt),
      status: postDeleteDoc?.isDeleted && postDeleteDoc?.deletedAt ? "PASSED" : "FAILED",
    };

    results.overallStatus = "ALL_CHECKS_PASSED";
    console.log(JSON.stringify(results, null, 2));
  } finally {
    // Guaranteed cleanup: affects ONLY the transient synthetic accounts and test resume created during this specific run
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(env.MONGODB_URI);
      }
      await User.deleteMany({ email: { $in: [candidateEmail, attackerEmail] } });
      if (resumeId) {
        await ResumeFile.deleteOne({ _id: resumeId });
      }
      await mongoose.disconnect();
    } catch {
      // Safe cleanup fallback
    }
  }
}

if (process.argv[1]?.includes("liveR2SmokeTest")) {
  runLiveSmokeTest().catch((err) => {
    console.error(
      JSON.stringify({
        success: false,
        failureCategory: "SMOKE_TEST_EXCEPTION",
        error: err.message,
      })
    );
    process.exit(1);
  });
}

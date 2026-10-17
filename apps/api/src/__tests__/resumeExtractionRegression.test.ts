import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/user.model.js";
import { ResumeFile } from "../models/resume.model.js";
import { resumeStorage } from "../services/storage/resumeStorage.js";
import { signToken, AUTH_COOKIE_NAME } from "../utils/jwt.js";

const TEST_DB_URI = "mongodb://localhost:27017/earlyai_ats_test";

/**
 * Generates an in-memory synthetic PDF buffer with embedded text without external fixtures.
 */
function createSyntheticPdf(text: string): Buffer {
  const sanitized = text.replace(/[()]/g, "");
  const stream = `BT\n/F1 12 Tf\n100 700 Td\n(${sanitized}) Tj\nET`;
  const streamLength = Buffer.byteLength(stream);

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${stream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000300 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
380
%%EOF`;

  return Buffer.from(pdf, "utf-8");
}

/**
 * Generates an in-memory synthetic scanned PDF buffer (pages present, but no text stream).
 */
function createSyntheticScannedPdf(): Buffer {
  const stream = `q\n10 10 500 700 re\nS\nQ`;
  const streamLength = Buffer.byteLength(stream);

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${stream}
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000200 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
280
%%EOF`;

  return Buffer.from(pdf, "utf-8");
}

describe("Resume Extraction, PDF Parsing & Security Regression Suite", () => {
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
    await ResumeFile.deleteMany({});
  });

  const getSessionCookie = (user: { id: string; role: string }) => {
    const token = signToken({ id: user.id, role: user.role });
    return `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax`;
  };

  describe("1. Text Extraction Service Unit Behavior", () => {
    it("extracts and normalizes text from a valid text-based PDF", async () => {
      const syntheticPdf = createSyntheticPdf("Engineering Leader experienced in Node.js, TypeScript, and MongoDB");
      const extracted = await resumeStorage.extractText(syntheticPdf, "application/pdf");

      expect(extracted).toContain("Engineering Leader");
      expect(extracted).toContain("TypeScript");
      expect(extracted).toContain("MongoDB");
    });

    it("detects a scanned/image-only PDF with pages but no text and reports OCR is required", async () => {
      const scannedPdf = createSyntheticScannedPdf();
      await expect(resumeStorage.extractText(scannedPdf, "application/pdf")).rejects.toThrow(
        /scanned image or document\. OCR is required/i
      );
    });

    it("rejects an empty PDF or corrupted buffer with actionable error", async () => {
      const corruptPdf = Buffer.from("%PDF-1.4 corrupted invalid bytes without trailer or objects", "utf-8");
      await expect(resumeStorage.extractText(corruptPdf, "application/pdf")).rejects.toThrow(
        /Failed to parse resume content/i
      );
    });

    it("enforces 50,000-character extraction limit", () => {
      const massiveString = "A".repeat(60000);
      const sanitized = resumeStorage.sanitizeText(massiveString);
      expect(sanitized.characterCount).toBe(50000);
      expect(sanitized.text.length).toBe(50000);
    });
  });

  describe("2. HTTP Upload Endpoint Regression & Error Handling", () => {
    it("successfully uploads and parses synthetic text-based PDF", async () => {
      const candidate = await User.create({
        name: "Test Candidate",
        email: "cand_pdf@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      const syntheticPdf = createSyntheticPdf("Senior Backend Engineer specializing in Distributed Systems and Cloud Architecture.");

      const res = await request(app)
        .post("/api/v1/resumes/upload")
        .set("Cookie", getSessionCookie(candidate))
        .attach("resume", syntheticPdf, "resume.pdf");

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resume.originalFilename).toBe("resume.pdf");
      expect(res.body.data.resume.parsingStatus).toBe("completed");
      expect(res.body.data.resume.parsedText).toContain("Senior Backend Engineer");
      expect(res.body.data.resume.fileSizeBytes).toBe(syntheticPdf.length);
    });

    it("rejects scanned PDF with 422 stating OCR is required", async () => {
      const candidate = await User.create({
        name: "Scanned Candidate",
        email: "cand_scanned@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      const scannedPdf = createSyntheticScannedPdf();

      const res = await request(app)
        .post("/api/v1/resumes/upload")
        .set("Cookie", getSessionCookie(candidate))
        .attach("resume", scannedPdf, "scanned_resume.pdf");

      expect(res.status).toBe(422);
      expect(res.body.error.message).toMatch(/scanned image or document\. OCR is required/i);
    });

    it("rejects empty file upload with 400", async () => {
      const candidate = await User.create({
        name: "Empty File Candidate",
        email: "cand_empty@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      const res = await request(app)
        .post("/api/v1/resumes/upload")
        .set("Cookie", getSessionCookie(candidate))
        .attach("resume", Buffer.alloc(0), "empty.pdf");

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/empty/i);
    });

    it("rejects oversized resumes (> 5MB) with 400", async () => {
      const candidate = await User.create({
        name: "Oversized Candidate",
        email: "cand_oversized@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      // 5MB + 1KB buffer
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024, "a");

      const res = await request(app)
        .post("/api/v1/resumes/upload")
        .set("Cookie", getSessionCookie(candidate))
        .attach("resume", largeBuffer, "large.txt");

      // Multer limits ceiling or content validation
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("prevents unauthorized access to another candidate's resume", async () => {
      const owner = await User.create({
        name: "Owner",
        email: "owner@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      const attacker = await User.create({
        name: "Attacker",
        email: "attacker@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      const uploadRes = await request(app)
        .post("/api/v1/resumes/upload")
        .set("Cookie", getSessionCookie(owner))
        .attach("resume", Buffer.from("Owner Confidential Resume Details", "utf-8"), "owner.txt");

      const resumeId = uploadRes.body.data.resume.id;

      // Attacker attempts to download owner resume
      const downloadRes = await request(app)
        .get(`/api/v1/resumes/${resumeId}/download`)
        .set("Cookie", getSessionCookie(attacker));

      expect(downloadRes.status).toBe(403);
      expect(downloadRes.body.error.code).toBe("FORBIDDEN");

      // Attacker attempts to delete owner resume
      const deleteRes = await request(app)
        .delete(`/api/v1/resumes/${resumeId}`)
        .set("Cookie", getSessionCookie(attacker));

      expect(deleteRes.status).toBe(403);
      expect(deleteRes.body.error.code).toBe("FORBIDDEN");
    });
  });
});

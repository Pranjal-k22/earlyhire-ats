import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { Readable } from "node:stream";
import { createApp } from "../app.js";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/user.model.js";
import { ResumeFile } from "../models/resume.model.js";
import { Candidate } from "../models/candidate.model.js";
import { signToken, AUTH_COOKIE_NAME } from "../utils/jwt.js";
import { LocalStorageAdapter } from "../services/storage/localStorageAdapter.js";
import { CloudflareR2StorageAdapter } from "../services/storage/cloudflareR2Adapter.js";
import { resumeStorage } from "../services/storage/resumeStorage.js";
import { IResumeStorageAdapter, StoredResumeResult } from "../services/storage/types.js";
import { AppError } from "../middleware/errorHandler.js";
import { z } from "zod";

const TEST_DB_URI = process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/earlyai_ats_test";

// Helper to construct a synthetic PDF with valid magic bytes and minimal text structure
const createSyntheticPdf = (text: string): Buffer => {
  const streamData = `BT /F1 12 Tf 50 700 Td (${text}) Tj ET`;
  const streamLength = Buffer.byteLength(streamData);
  const pdfSource = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${streamData}
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000300 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
450
%%EOF`;
  return Buffer.from(pdfSource, "utf-8");
};

describe("Cloudflare R2 Resume Storage & Abstraction Suite", { timeout: 25000 }, () => {
  let app: ReturnType<typeof createApp>;
  let defaultAdapter: IResumeStorageAdapter;

  beforeAll(async () => {
    await connectDB(TEST_DB_URI);
    app = createApp();
    defaultAdapter = resumeStorage.getAdapter();
  });

  afterAll(async () => {
    resumeStorage.setAdapter(defaultAdapter);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await disconnectDB();
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Candidate.deleteMany({});
    await ResumeFile.deleteMany({});
    vi.restoreAllMocks();
  });

  const getSessionCookie = (user: { id: string; role: string }) => {
    const token = signToken({ id: user.id, role: user.role as "candidate" | "hiring_team" | "platform_manager" });
    return `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax`;
  };

  describe("1. LocalStorageAdapter Unit Behavior", () => {
    it("saves a synthetic buffer to disk with computed sha256 and unique UUID", async () => {
      const adapter = new LocalStorageAdapter("uploads/test_resumes");
      const buffer = Buffer.from("Synthetic developer resume content");
      const result = await adapter.saveFile(buffer, "developer.txt", "text/plain");

      expect(result.driver).toBe("local");
      expect(result.storedFilename).toMatch(/^[0-9a-f-]+\.txt$/i);
      expect(result.contentSha256).toHaveLength(64);

      const exists = await adapter.fileExists(result.storagePath);
      expect(exists).toBe(true);

      const stream = await adapter.getReadStream(result.storagePath);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      expect(Buffer.concat(chunks).toString()).toBe("Synthetic developer resume content");

      await adapter.deleteFile(result.storagePath);
      expect(await adapter.fileExists(result.storagePath)).toBe(false);
    });

    it("throws 404 FILE_NOT_FOUND when attempting to read a non-existent file", async () => {
      const adapter = new LocalStorageAdapter("uploads/test_resumes");
      await expect(adapter.getReadStream("non_existent_uuid_123.pdf")).rejects.toThrow("Resume file not found on storage");
    });
  });

  describe("2. CloudflareR2StorageAdapter Unit Behavior (Mocked S3Client)", () => {
    it("fails cleanly on missing bucket name or credentials", () => {
      expect(() => new CloudflareR2StorageAdapter({ bucketName: "" })).toThrow(/R2_BUCKET_NAME is required/);
      expect(
        () =>
          new CloudflareR2StorageAdapter({
            bucketName: "test-bucket",
            accessKeyId: "",
            secretAccessKey: "",
          })
      ).toThrow(/R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required/);
    });

    it("uploads buffer to Cloudflare R2 with random key and metadata", async () => {
      const mockSend = vi.fn().mockResolvedValue({});
      const fakeS3Client = { send: mockSend } as unknown as import("@aws-sdk/client-s3").S3Client;

      const r2Adapter = new CloudflareR2StorageAdapter({
        bucketName: "earlyhire-ats-resumes-prod",
        accessKeyId: "mock-key-id",
        secretAccessKey: "mock-secret-key",
        endpoint: "https://mock-account.r2.cloudflarestorage.com",
        s3Client: fakeS3Client,
      });

      const syntheticPdf = createSyntheticPdf("Senior Engineer experienced in TypeScript and Distributed Systems");
      const result = await r2Adapter.saveFile(syntheticPdf, "my_resume.pdf", "application/pdf");

      expect(result.driver).toBe("r2");
      expect(result.bucket).toBe("earlyhire-ats-resumes-prod");
      expect(result.storageKey).toMatch(/^resumes\/[0-9a-f-]+\.pdf$/i);
      expect(mockSend).toHaveBeenCalledTimes(1);

      const sentCommand = mockSend.mock.calls[0][0];
      expect(sentCommand.input.Bucket).toBe("earlyhire-ats-resumes-prod");
      expect(sentCommand.input.Key).toBe(result.storageKey);
      expect(sentCommand.input.ContentType).toBe("application/pdf");
      expect(sentCommand.input.Metadata["content-sha256"]).toBe(result.contentSha256);
    });

    it("reads object stream from R2 and handles missing object with 404", async () => {
      const fakeStream = Readable.from([Buffer.from("PDF streamed bytes")]);
      const mockSend = vi.fn().mockImplementation((command) => {
        if (command.input.Key === "resumes/found.pdf") {
          return Promise.resolve({ Body: fakeStream });
        }
        const error = new Error("NoSuchKey");
        error.name = "NoSuchKey";
        return Promise.reject(error);
      });

      const fakeS3Client = { send: mockSend } as unknown as import("@aws-sdk/client-s3").S3Client;
      const r2Adapter = new CloudflareR2StorageAdapter({
        bucketName: "earlyhire-ats-resumes-prod",
        s3Client: fakeS3Client,
      });

      const stream = await r2Adapter.getReadStream("resumes/found.pdf");
      expect(stream).toBeDefined();

      await expect(r2Adapter.getReadStream("resumes/missing.pdf")).rejects.toThrow("Resume file not found on storage");
    });

    it("deletes object from R2 and behaves idempotently on NoSuchKey", async () => {
      const mockSend = vi.fn().mockImplementation((command) => {
        if (command.input.Key === "resumes/missing.pdf") {
          const err = new Error("NoSuchKey");
          err.name = "NoSuchKey";
          return Promise.reject(err);
        }
        return Promise.resolve({});
      });

      const fakeS3Client = { send: mockSend } as unknown as import("@aws-sdk/client-s3").S3Client;
      const r2Adapter = new CloudflareR2StorageAdapter({
        bucketName: "earlyhire-ats-resumes-prod",
        s3Client: fakeS3Client,
      });

      // Existing file delete succeeds
      await expect(r2Adapter.deleteFile("resumes/existing.pdf")).resolves.not.toThrow();
      // Missing file delete is idempotent and does not throw
      await expect(r2Adapter.deleteFile("resumes/missing.pdf")).resolves.not.toThrow();
    });

    it("throws AppError on fatal storage deletion failure", async () => {
      const mockSend = vi.fn().mockRejectedValue(new Error("AccessDenied"));
      const fakeS3Client = { send: mockSend } as unknown as import("@aws-sdk/client-s3").S3Client;
      const r2Adapter = new CloudflareR2StorageAdapter({
        bucketName: "earlyhire-ats-resumes-prod",
        s3Client: fakeS3Client,
      });

      await expect(r2Adapter.deleteFile("resumes/forbidden.pdf")).rejects.toThrow("Failed to delete resume file from Cloudflare R2 storage");
    });
  });

  describe("3. Environment Validation & Startup Guards", () => {
    it("validates that RESUME_STORAGE_DRIVER=r2 requires bucket and credentials", () => {
      const schema = z
        .object({
          RESUME_STORAGE_DRIVER: z.enum(["local", "r2"]).default("local"),
          R2_BUCKET_NAME: z.string().optional(),
          R2_ACCESS_KEY_ID: z.string().optional(),
          R2_SECRET_ACCESS_KEY: z.string().optional(),
          R2_ENDPOINT: z.string().optional(),
          R2_ACCOUNT_ID: z.string().optional(),
        })
        .superRefine((data, ctx) => {
          if (data.RESUME_STORAGE_DRIVER === "r2") {
            if (!data.R2_BUCKET_NAME) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["R2_BUCKET_NAME"], message: "Missing bucket" });
            if (!data.R2_ACCESS_KEY_ID) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["R2_ACCESS_KEY_ID"], message: "Missing key" });
            if (!data.R2_SECRET_ACCESS_KEY) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["R2_SECRET_ACCESS_KEY"], message: "Missing secret" });
            if (!data.R2_ENDPOINT && !data.R2_ACCOUNT_ID) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["R2_ENDPOINT"], message: "Missing endpoint" });
          }
        });

      const invalidResult = schema.safeParse({ RESUME_STORAGE_DRIVER: "r2" });
      expect(invalidResult.success).toBe(false);

      const validResult = schema.safeParse({
        RESUME_STORAGE_DRIVER: "r2",
        R2_BUCKET_NAME: "earlyhire-ats-resumes-prod",
        R2_ACCESS_KEY_ID: "valid_key",
        R2_SECRET_ACCESS_KEY: "valid_secret",
        R2_ACCOUNT_ID: "account_123",
      });
      expect(validResult.success).toBe(true);
    });

    it("verifies production rejects silent fallback to local storage", () => {
      const schema = z
        .object({
          NODE_ENV: z.enum(["development", "production", "test"]),
          RESUME_STORAGE_DRIVER: z.enum(["local", "r2"]).default("local"),
        })
        .superRefine((data, ctx) => {
          if (data.NODE_ENV === "production" && data.RESUME_STORAGE_DRIVER !== "r2") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["RESUME_STORAGE_DRIVER"],
              message: "Production environment requires RESUME_STORAGE_DRIVER=r2",
            });
          }
        });

      const prodFallback = schema.safeParse({ NODE_ENV: "production", RESUME_STORAGE_DRIVER: "local" });
      expect(prodFallback.success).toBe(false);
      if (!prodFallback.success) {
        expect(prodFallback.error.issues[0].message).toContain("Production environment requires RESUME_STORAGE_DRIVER=r2");
      }
    });
  });

  describe("4. End-to-End API Integration with Cloudflare R2 Adapter", () => {
    let mockR2Store: Map<string, Buffer>;
    let mockR2Adapter: IResumeStorageAdapter;

    beforeEach(() => {
      mockR2Store = new Map();
      mockR2Adapter = {
        driver: "r2",
        saveFile: vi.fn(async (buffer: Buffer, _originalFilename: string) => {
          const storedFilename = `mock-${Date.now()}.pdf`;
          const storageKey = `resumes/${storedFilename}`;
          mockR2Store.set(storageKey, buffer);
          return {
            storedFilename,
            storageKey,
            storagePath: storageKey,
            contentSha256: "fake-sha256-hash-value-mocked-for-test",
            driver: "r2",
            bucket: "earlyhire-ats-resumes-prod",
          } satisfies StoredResumeResult;
        }),
        getReadStream: vi.fn(async (key: string) => {
          const buf = mockR2Store.get(key);
          if (!buf) {
            throw new AppError("Resume file not found on storage", 404, "FILE_NOT_FOUND");
          }
          return Readable.from([buf]);
        }),
        deleteFile: vi.fn(async (key: string) => {
          if (key.includes("force_fail")) {
            throw new AppError("Simulated R2 delete error", 502, "STORAGE_DELETE_FAILED");
          }
          mockR2Store.delete(key);
        }),
        fileExists: vi.fn(async (key: string) => mockR2Store.has(key)),
      };

      resumeStorage.setAdapter(mockR2Adapter);
    });

    it("uploads resume via R2, persists metadata, and strips private storage fields from response", async () => {
      const candidate = await User.create({
        name: "Cloud Candidate",
        email: "cloud.cand@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      const syntheticPdf = createSyntheticPdf("Engineering Specialist with Cloudflare R2 and TypeScript");

      const res = await request(app)
        .post("/api/v1/resumes/upload")
        .set("Cookie", getSessionCookie(candidate))
        .attach("resume", syntheticPdf, "engineering_resume.pdf");

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resume).toHaveProperty("id");
      expect(res.body.data.resume.originalFilename).toBe("engineering_resume.pdf");
      expect(res.body.data.resume.parsingStatus).toBe("completed");

      // Verify privacy: internal storage keys, paths, and buckets must be stripped
      expect(res.body.data.resume.storagePath).toBeUndefined();
      expect(res.body.data.resume.storageKey).toBeUndefined();
      expect(res.body.data.resume.storageBucket).toBeUndefined();
      expect(res.body.data.resume.storedFilename).toBeUndefined();

      // Verify DB record contains driver and storageKey
      const dbResume = await ResumeFile.findById(res.body.data.resume.id);
      expect(dbResume).toBeDefined();
      expect(dbResume?.storageDriver).toBe("r2");
      expect(dbResume?.storageKey).toMatch(/^resumes\/mock-\d+\.pdf$/);
      expect(dbResume?.storageBucket).toBe("earlyhire-ats-resumes-prod");
    });

    it("performs compensation cleanup on storage if MongoDB metadata persistence fails", async () => {
      const candidate = await User.create({
        name: "Rollback Candidate",
        email: "rollback.cand@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      // Force MongoDB ResumeFile.create to throw
      vi.spyOn(ResumeFile, "create").mockRejectedValueOnce(new Error("Simulated Database Outage"));

      const syntheticPdf = createSyntheticPdf("Test Compensation Resume");

      const res = await request(app)
        .post("/api/v1/resumes/upload")
        .set("Cookie", getSessionCookie(candidate))
        .attach("resume", syntheticPdf, "test_rollback.pdf");

      expect(res.status).toBe(500);

      // Verify compensation rollback was executed on the storage adapter
      expect(mockR2Adapter.deleteFile).toHaveBeenCalledTimes(1);
    });

    it("serves authorized candidate inline viewing and attachment download", async () => {
      const candidate = await User.create({
        name: "Alex Viewer",
        email: "alex.viewer@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      const syntheticPdf = createSyntheticPdf("Alex Viewer Curriculum Vitae Content");
      const storageRes = await mockR2Adapter.saveFile(syntheticPdf, "alex_cv.pdf", "application/pdf");

      const resumeDoc = await ResumeFile.create({
        candidateUserId: candidate.id,
        originalFilename: "alex_cv.pdf",
        storedFilename: storageRes.storedFilename,
        storagePath: storageRes.storagePath,
        storageKey: storageRes.storageKey,
        storageDriver: "r2",
        storageBucket: storageRes.bucket,
        mimeType: "application/pdf",
        fileSizeBytes: syntheticPdf.length,
        contentSha256: storageRes.contentSha256,
        parsedText: "Alex Viewer Curriculum Vitae Content",
        parsingStatus: "completed",
      });

      // 1. Inline viewing (?inline=true)
      const inlineRes = await request(app)
        .get(`/api/v1/resumes/${resumeDoc.id}/download?inline=true`)
        .set("Cookie", getSessionCookie(candidate));

      expect(inlineRes.status).toBe(200);
      expect(inlineRes.headers["content-type"]).toBe("application/pdf");
      expect(inlineRes.headers["content-disposition"]).toBe('inline; filename="alex_cv.pdf"');
      expect(inlineRes.body.length).toBe(syntheticPdf.length);

      // 2. Attachment download (default)
      const attachRes = await request(app)
        .get(`/api/v1/resumes/${resumeDoc.id}/download`)
        .set("Cookie", getSessionCookie(candidate));

      expect(attachRes.status).toBe(200);
      expect(attachRes.headers["content-disposition"]).toBe('attachment; filename="alex_cv.pdf"');
    });

    it("allows authorized hiring_team access and blocks cross-candidate unauthorized access", async () => {
      const candidateA = await User.create({
        name: "Candidate A",
        email: "cand.a@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      const candidateB = await User.create({
        name: "Candidate B",
        email: "cand.b@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      const recruiter = await User.create({
        name: "Rachel Recruiter",
        email: "rachel.recruiter@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "hiring_team",
      });

      const syntheticPdf = createSyntheticPdf("Candidate A Protected Resume");
      const storageRes = await mockR2Adapter.saveFile(syntheticPdf, "protected.pdf", "application/pdf");

      const resumeDoc = await ResumeFile.create({
        candidateUserId: candidateA.id,
        originalFilename: "protected.pdf",
        storedFilename: storageRes.storedFilename,
        storagePath: storageRes.storagePath,
        storageKey: storageRes.storageKey,
        storageDriver: "r2",
        mimeType: "application/pdf",
        fileSizeBytes: syntheticPdf.length,
        contentSha256: storageRes.contentSha256,
        parsedText: "Protected Content",
        parsingStatus: "completed",
      });

      // Candidate B (cross-candidate attempt) -> 403 Forbidden
      const unauthorizedRes = await request(app)
        .get(`/api/v1/resumes/${resumeDoc.id}/download`)
        .set("Cookie", getSessionCookie(candidateB));
      expect(unauthorizedRes.status).toBe(403);
      expect(unauthorizedRes.body.error.code).toBe("FORBIDDEN");

      // Recruiter -> 200 OK
      const recruiterRes = await request(app)
        .get(`/api/v1/resumes/${resumeDoc.id}/download`)
        .set("Cookie", getSessionCookie(recruiter));
      expect(recruiterRes.status).toBe(200);
    });

    it("preserves MongoDB record if R2 storage object deletion fails", async () => {
      const candidate = await User.create({
        name: "Delete Test Candidate",
        email: "delete.cand@example.com",
        passwordHash: "$2a$10$fakehashfortestplaceholder1234567890",
        role: "candidate",
      });

      const syntheticPdf = createSyntheticPdf("Resume to be deleted safely");
      const storageRes = await mockR2Adapter.saveFile(syntheticPdf, "delete_me.pdf", "application/pdf");

      const resumeDoc = await ResumeFile.create({
        candidateUserId: candidate.id,
        originalFilename: "delete_me.pdf",
        storedFilename: storageRes.storedFilename,
        storagePath: "resumes/force_fail_error.pdf",
        storageKey: "resumes/force_fail_error.pdf",
        storageDriver: "r2",
        mimeType: "application/pdf",
        fileSizeBytes: syntheticPdf.length,
        contentSha256: storageRes.contentSha256,
        parsedText: "Delete me text",
        parsingStatus: "completed",
      });

      const res = await request(app)
        .delete(`/api/v1/resumes/${resumeDoc.id}`)
        .set("Cookie", getSessionCookie(candidate));

      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe("STORAGE_DELETE_FAILED");

      // Verify the record was NOT marked as deleted
      const checkDoc = await ResumeFile.findById(resumeDoc.id);
      expect(checkDoc?.isDeleted).toBe(false);
    });
  });
});

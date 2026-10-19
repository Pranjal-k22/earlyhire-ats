import path from "node:path";
import crypto from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { IResumeStorageAdapter, StoredResumeResult } from "./types.js";
import { AppError } from "../../middleware/errorHandler.js";
import { env } from "../../config/env.js";

export interface CloudflareR2AdapterOptions {
  bucketName?: string;
  accountId?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  s3Client?: S3Client;
}

export class CloudflareR2StorageAdapter implements IResumeStorageAdapter {
  public readonly driver = "r2" as const;
  public readonly bucketName: string;
  private client: S3Client;

  constructor(options: CloudflareR2AdapterOptions = {}) {
    this.bucketName = options.bucketName !== undefined ? options.bucketName : (env.R2_BUCKET_NAME || "");
    if (!this.bucketName) {
      throw new AppError("R2_BUCKET_NAME is required for Cloudflare R2 storage", 500, "STORAGE_CONFIG_ERROR");
    }

    if (options.s3Client) {
      this.client = options.s3Client;
    } else {
      const accessKeyId = options.accessKeyId !== undefined ? options.accessKeyId : env.R2_ACCESS_KEY_ID;
      const secretAccessKey = options.secretAccessKey !== undefined ? options.secretAccessKey : env.R2_SECRET_ACCESS_KEY;
      const accountId = options.accountId !== undefined ? options.accountId : env.R2_ACCOUNT_ID;
      const endpoint = options.endpoint !== undefined ? options.endpoint : (env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined));

      if (!accessKeyId || !secretAccessKey) {
        throw new AppError("R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required for Cloudflare R2 storage", 500, "STORAGE_CONFIG_ERROR");
      }

      if (!endpoint) {
        throw new AppError("Either R2_ENDPOINT or R2_ACCOUNT_ID is required to construct the Cloudflare R2 endpoint", 500, "STORAGE_CONFIG_ERROR");
      }

      this.client = new S3Client({
        region: "auto",
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  private resolveKey(storageKey: string): string {
    const clean = storageKey.replace(/\\/g, "/");
    if (clean.startsWith("resumes/")) {
      return clean;
    }
    const filename = path.basename(clean);
    return `resumes/${filename}`;
  }

  public async saveFile(
    buffer: Buffer,
    originalFilename: string,
    mimeType?: string
  ): Promise<StoredResumeResult> {
    const contentSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const sanitizedExt = path.extname(originalFilename).toLowerCase().replace(/[^a-z0-9.]/g, "");
    const storedFilename = `${crypto.randomUUID()}${sanitizedExt || ".pdf"}`;
    const objectKey = `resumes/${storedFilename}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: objectKey,
          Body: buffer,
          ContentType: mimeType || "application/pdf",
          Metadata: {
            "content-sha256": contentSha256,
            "original-filename": encodeURIComponent(path.basename(originalFilename).slice(0, 100)),
          },
        })
      );

      return {
        storedFilename,
        storageKey: objectKey,
        storagePath: objectKey,
        contentSha256,
        driver: this.driver,
        bucket: this.bucketName,
      };
    } catch (err) {
      console.error("[CloudflareR2Adapter] Failed to upload object to R2:", err instanceof Error ? err.message : "Upload error");
      throw new AppError("Failed to persist resume file in Cloudflare R2 storage", 502, "STORAGE_UPLOAD_ERROR");
    }
  }

  public async getReadStream(storageKey: string): Promise<NodeJS.ReadableStream> {
    const objectKey = this.resolveKey(storageKey);

    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: objectKey,
        })
      );

      if (!response.Body) {
        throw new AppError("Resume file not found on storage", 404, "FILE_NOT_FOUND");
      }

      return response.Body as unknown as NodeJS.ReadableStream;
    } catch (err: unknown) {
      const errorName = (err as { name?: string })?.name;
      const httpStatus = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;

      if (errorName === "NoSuchKey" || errorName === "NotFound" || httpStatus === 404) {
        throw new AppError("Resume file not found on storage", 404, "FILE_NOT_FOUND");
      }

      console.error("[CloudflareR2Adapter] Error retrieving object from R2:", err instanceof Error ? err.message : "Fetch error");
      throw new AppError("Failed to retrieve resume file from storage", 502, "STORAGE_ERROR");
    }
  }

  public async deleteFile(storageKey: string): Promise<void> {
    const objectKey = this.resolveKey(storageKey);

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: objectKey,
        })
      );
    } catch (err: unknown) {
      const errorName = (err as { name?: string })?.name;
      const httpStatus = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;

      // Idempotent: if already deleted or does not exist, consider it successful
      if (errorName === "NoSuchKey" || errorName === "NotFound" || httpStatus === 404) {
        return;
      }

      console.error("[CloudflareR2Adapter] Failed to delete object from R2:", err instanceof Error ? err.message : "Delete error");
      throw new AppError("Failed to delete resume file from Cloudflare R2 storage", 502, "STORAGE_DELETE_FAILED");
    }
  }

  public async fileExists(storageKey: string): Promise<boolean> {
    const objectKey = this.resolveKey(storageKey);

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: objectKey,
        })
      );
      return true;
    } catch (err: unknown) {
      const errorName = (err as { name?: string })?.name;
      const httpStatus = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;

      if (errorName === "NoSuchKey" || errorName === "NotFound" || httpStatus === 404) {
        return false;
      }

      console.warn("[CloudflareR2Adapter] Error checking file existence on R2:", err instanceof Error ? err.message : "Head error");
      return false;
    }
  }
}

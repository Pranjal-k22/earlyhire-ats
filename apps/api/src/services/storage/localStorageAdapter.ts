import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { IResumeStorageAdapter, StoredResumeResult } from "./types.js";
import { AppError } from "../../middleware/errorHandler.js";
import { env } from "../../config/env.js";

export class LocalStorageAdapter implements IResumeStorageAdapter {
  public readonly driver = "local" as const;
  private baseDir: string;

  constructor(customBaseDir?: string) {
    this.baseDir = path.resolve(process.cwd(), customBaseDir || env.RESUME_STORAGE_DIR);
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    if (!fsSync.existsSync(this.baseDir)) {
      fsSync.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolvePath(storageKey: string): string {
    if (path.isAbsolute(storageKey)) {
      return storageKey;
    }
    const clean = storageKey.replace(/\\/g, "/");
    if (clean.includes("resumes/")) {
      const filename = path.basename(clean);
      return path.join(this.baseDir, filename);
    }
    if (clean.startsWith("uploads/resumes") || clean.startsWith("uploads\\resumes")) {
      return path.resolve(process.cwd(), storageKey);
    }
    return path.join(this.baseDir, path.basename(storageKey));
  }

  public async saveFile(
    buffer: Buffer,
    originalFilename: string,
    _mimeType?: string
  ): Promise<StoredResumeResult> {
    this.ensureDirectoryExists();

    const contentSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const sanitizedExt = path.extname(originalFilename).toLowerCase().replace(/[^a-z0-9.]/g, "");
    const storedFilename = `${crypto.randomUUID()}${sanitizedExt || ".bin"}`;
    const storagePath = path.join(this.baseDir, storedFilename);

    await fs.writeFile(storagePath, buffer);

    return {
      storedFilename,
      storageKey: storedFilename,
      storagePath,
      contentSha256,
      driver: this.driver,
      bucket: null,
    };
  }

  public async getReadStream(storageKey: string): Promise<NodeJS.ReadableStream> {
    const filePath = this.resolvePath(storageKey);
    if (!fsSync.existsSync(filePath)) {
      throw new AppError("Resume file not found on storage", 404, "FILE_NOT_FOUND");
    }
    return fsSync.createReadStream(filePath);
  }

  public async deleteFile(storageKey: string): Promise<void> {
    try {
      const filePath = this.resolvePath(storageKey);
      if (fsSync.existsSync(filePath)) {
        await fs.unlink(filePath);
      }
    } catch (err) {
      console.warn(`[LocalStorageAdapter] Could not delete file at ${storageKey}:`, err);
    }
  }

  public async fileExists(storageKey: string): Promise<boolean> {
    const filePath = this.resolvePath(storageKey);
    return fsSync.existsSync(filePath);
  }
}

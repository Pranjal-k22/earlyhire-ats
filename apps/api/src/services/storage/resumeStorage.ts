import { PDFParse } from "pdf-parse";
import { AppError } from "../../middleware/errorHandler.js";
import { env } from "../../config/env.js";
import { IResumeStorageAdapter, StoredResumeResult, ResumeStorageDriver } from "./types.js";
import { LocalStorageAdapter } from "./localStorageAdapter.js";
import { CloudflareR2StorageAdapter } from "./cloudflareR2Adapter.js";

export interface FileValidationResult {
  isValid: boolean;
  mimeType: string;
  error?: string;
}

export interface ExtractedResumeText {
  text: string;
  wordCount: number;
  characterCount: number;
}

export class ResumeStorageService {
  private adapter: IResumeStorageAdapter;

  constructor(customAdapter?: IResumeStorageAdapter) {
    if (customAdapter) {
      this.adapter = customAdapter;
    } else if (env.RESUME_STORAGE_DRIVER === "r2") {
      this.adapter = new CloudflareR2StorageAdapter();
    } else {
      this.adapter = new LocalStorageAdapter();
    }
  }

  /**
   * Allows injecting or swapping the storage adapter for testing or environment transitions.
   */
  public setAdapter(adapter: IResumeStorageAdapter): void {
    this.adapter = adapter;
  }

  /**
   * Returns the currently active storage adapter.
   */
  public getAdapter(): IResumeStorageAdapter {
    return this.adapter;
  }

  /**
   * Returns the active storage driver name ('local' | 'r2').
   */
  public get driver(): ResumeStorageDriver {
    return this.adapter.driver;
  }

  /**
   * Inspects magic bytes to verify content rather than trusting client MIME type or extension.
   */
  public validateContent(buffer: Buffer): FileValidationResult {
    if (buffer.length === 0) {
      return { isValid: false, mimeType: "unknown", error: "File is empty" };
    }

    if (buffer.length > 5 * 1024 * 1024) {
      return { isValid: false, mimeType: "unknown", error: "File exceeds maximum permitted size of 5MB" };
    }

    // PDF Magic Bytes: %PDF (0x25 0x50 0x44 0x46)
    if (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      return { isValid: true, mimeType: "application/pdf" };
    }

    // DOCX / ZIP Magic Bytes: PK\x03\x04 (0x50 0x4B 0x03 0x04)
    if (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    ) {
      return {
        isValid: true,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    }

    // Plain text verification: must consist of valid UTF-8 without control codes (except \t, \r, \n)
    let isAsciiOrUtf8 = true;
    const sampleSize = Math.min(buffer.length, 1024);
    for (let i = 0; i < sampleSize; i++) {
      const byte = buffer[i];
      if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
        isAsciiOrUtf8 = false;
        break;
      }
    }

    if (isAsciiOrUtf8) {
      return { isValid: true, mimeType: "text/plain" };
    }

    return {
      isValid: false,
      mimeType: "unknown",
      error: "Unsupported file format. Please upload a valid PDF, DOCX, or TXT resume.",
    };
  }

  /**
   * Sanitizes extracted text by stripping null bytes, control characters,
   * collapsing whitespace, and bounding length to 50,000 characters.
   */
  public sanitizeText(rawText: string): ExtractedResumeText {
    if (typeof rawText !== "string") {
      rawText = String(rawText || "");
    }

    // Strip null bytes and non-printable control characters
    let cleaned = rawText
      .replace(/\0/g, "")
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

    // Collapse multiple consecutive spaces/lines
    cleaned = cleaned.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();

    // Bound maximum text to prevent token explosion or memory exhaustion
    if (cleaned.length > 50000) {
      cleaned = cleaned.slice(0, 50000);
    }

    const words = cleaned.split(/\s+/).filter(Boolean);
    return {
      text: cleaned,
      wordCount: words.length,
      characterCount: cleaned.length,
    };
  }

  /**
   * Extracts and normalizes text from supported document types.
   */
  public async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    if (!buffer || buffer.length === 0) {
      throw new AppError("Cannot extract text from an empty document", 400, "EMPTY_FILE");
    }

    try {
      if (mimeType === "application/pdf") {
        const parser = new PDFParse({ data: buffer });
        let textResult: { text?: string; total?: number } | string;
        try {
          textResult = await parser.getText();
        } finally {
          await parser.destroy().catch(() => {});
        }

        const rawText = typeof textResult === "string" ? textResult : (textResult?.text ?? "");
        const pageCount =
          typeof textResult === "object" && textResult && "total" in textResult
            ? textResult.total ?? 0
            : 0;

        // pdf-parse automatically injects page markers like "-- 1 of 1 --".
        // Strip these markers when determining whether actual selectable text was extracted.
        const contentWithoutPageMarkers = rawText.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, "").trim();

        if (!contentWithoutPageMarkers || contentWithoutPageMarkers.length === 0) {
          if (pageCount > 0) {
            throw new AppError(
              "The uploaded PDF contains no selectable text. It appears to be a scanned image or document. OCR is required to process scanned resumes.",
              422,
              "SCANNED_PDF_OCR_REQUIRED"
            );
          }
          throw new AppError(
            "The uploaded PDF contains no readable text or pages.",
            422,
            "EMPTY_DOCUMENT"
          );
        }

        const sanitized = this.sanitizeText(rawText).text;
        if (!sanitized || sanitized.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, "").trim().length === 0) {
          throw new AppError(
            "The uploaded PDF contains no readable text after normalization. OCR may be required.",
            422,
            "EMPTY_NORMALIZED_TEXT"
          );
        }

        return sanitized;
      }

      if (mimeType === "text/plain") {
        const raw = buffer.toString("utf-8");
        if (!raw || raw.trim().length === 0) {
          throw new AppError("The uploaded text file is empty.", 422, "EMPTY_DOCUMENT");
        }
        const sanitized = this.sanitizeText(raw).text;
        if (!sanitized || sanitized.trim().length === 0) {
          throw new AppError("The uploaded text file contains no readable text.", 422, "EMPTY_NORMALIZED_TEXT");
        }
        return sanitized;
      }

      if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const raw = buffer.toString("utf-8");
        const matches = raw.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
        let docxText = "";
        if (matches && matches.length > 0) {
          docxText = matches
            .map((m) => m.replace(/<[^>]+>/g, ""))
            .join(" ");
        } else {
          docxText = raw.replace(/[^\x20-\x7E\t\n\r]/g, " ");
        }

        const sanitized = this.sanitizeText(docxText).text;
        if (!sanitized || sanitized.trim().length === 0) {
          throw new AppError("The uploaded DOCX file contains no readable text.", 422, "EMPTY_DOCUMENT");
        }
        return sanitized;
      }

      throw new AppError("Unsupported file type for text parsing", 400, "UNSUPPORTED_TYPE");
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Failed to parse resume content: ${error instanceof Error ? error.message : "Malformed or unreadable document"}`,
        422,
        "PARSE_ERROR"
      );
    }
  }

  /**
   * Securely saves the uploaded file using the active storage adapter (Cloudflare R2 or Local).
   */
  public async saveResumeFile(
    buffer: Buffer,
    originalFilename: string,
    mimeType?: string
  ): Promise<StoredResumeResult> {
    return this.adapter.saveFile(buffer, originalFilename, mimeType);
  }

  /**
   * Retrieves read stream for authorized download from the active storage adapter.
   */
  public async getReadStream(storagePath: string): Promise<NodeJS.ReadableStream> {
    return this.adapter.getReadStream(storagePath);
  }

  /**
   * Safely deletes file from the active storage adapter.
   */
  public async deleteFile(storagePath: string): Promise<void> {
    await this.adapter.deleteFile(storagePath);
  }

  /**
   * Checks whether a file exists in the active storage adapter.
   */
  public async fileExists(storagePath: string): Promise<boolean> {
    return this.adapter.fileExists(storagePath);
  }
}

export const resumeStorage = new ResumeStorageService();

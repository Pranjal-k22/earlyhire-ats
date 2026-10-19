import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { ResumeFile } from "../models/resume.model.js";
import { User } from "../models/user.model.js";
import { Candidate } from "../models/candidate.model.js";
import { resumeStorage } from "../services/storage/resumeStorage.js";
import { AppError } from "../middleware/errorHandler.js";
import { normalizeRole } from "../models/user.model.js";
import { sseEventHub } from "../services/sse/sseEventHub.js";

// Multer in-memory storage with 5MB ceiling
export const resumeUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
}).single("resume");

/**
 * Handles resume upload with content inspection, text extraction, and private storage.
 */
export const uploadResume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    if (!req.file || !req.file.buffer) {
      return next(new AppError("No resume file was uploaded. Please attach a file.", 400, "FILE_MISSING"));
    }

    const fileBuffer = req.file.buffer;
    const originalFilename = req.file.originalname || "resume.pdf";

    // 1. Content validation by magic bytes
    const validation = resumeStorage.validateContent(fileBuffer);
    if (!validation.isValid) {
      return next(new AppError(validation.error || "Invalid file content", 400, "INVALID_FILE_TYPE"));
    }

    // 2. Extract and sanitize text
    let parsedText = "";
    try {
      parsedText = await resumeStorage.extractText(fileBuffer, validation.mimeType);
    } catch (parseErr) {
      if (parseErr instanceof AppError) {
        return next(parseErr);
      }
      return next(
        new AppError(
          `Failed to parse resume content: ${parseErr instanceof Error ? parseErr.message : "Malformed or unreadable document"}`,
          422,
          "PARSE_ERROR"
        )
      );
    }

    if (!parsedText || parsedText.trim().length === 0) {
      return next(
        new AppError(
          "The uploaded resume contains no readable text. If this is a scanned document, OCR is required.",
          422,
          "EMPTY_RESUME_TEXT"
        )
      );
    }

    // 3. Save to private storage (Cloudflare R2 or Local adapter)
    const storageResult = await resumeStorage.saveResumeFile(fileBuffer, originalFilename, validation.mimeType);

    // 4. Create database record with compensation rollback if persistence fails
    let resumeDoc;
    try {
      resumeDoc = await ResumeFile.create({
        candidateUserId: req.user.id,
        candidateId: req.user.candidateProfileId || null,
        originalFilename,
        storedFilename: storageResult.storedFilename,
        storagePath: storageResult.storagePath,
        storageDriver: storageResult.driver,
        storageKey: storageResult.storageKey || storageResult.storagePath,
        storageBucket: storageResult.bucket || null,
        mimeType: validation.mimeType,
        fileSizeBytes: fileBuffer.length,
        contentSha256: storageResult.contentSha256,
        parsedText,
        parsingStatus: "completed",
        parsingError: null,
      });
    } catch (dbError) {
      // Best-effort compensation: remove orphaned uploaded file from storage
      console.error("[ResumeUpload] MongoDB persistence failed; rolling back uploaded storage file:", dbError instanceof Error ? dbError.message : "DB error");
      await resumeStorage.deleteFile(storageResult.storageKey || storageResult.storagePath).catch((cleanupErr) => {
        console.warn("[ResumeUpload] Compensation cleanup failed:", cleanupErr instanceof Error ? cleanupErr.message : "Cleanup error");
      });
      throw dbError;
    }

    // 5. Update user's active resumeId
    await User.findByIdAndUpdate(req.user.id, { resumeId: resumeDoc.id });

    // 6. Update candidate profile resumeUrl so recruiters can immediately view and download it
    const resumeDownloadUrl = `/api/v1/resumes/${resumeDoc.id}/download?inline=true`;
    await Candidate.updateMany(
      {
        $or: [
          ...(req.user.candidateProfileId ? [{ _id: req.user.candidateProfileId }] : []),
          ...(req.user.email ? [{ email: req.user.email.toLowerCase() }] : []),
          ...(req.user._id ? [{ createdBy: req.user._id }] : []),
        ],
      },
      { $set: { resumeUrl: resumeDownloadUrl } }
    );

    sseEventHub.broadcast({
      type: "resume:uploaded",
      entity: "resume",
      entityId: resumeDoc.id,
      candidateUserId: req.user.id,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: {
        resume: resumeDoc.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists the authenticated user's active resumes.
 */
export const getMyResumes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const resumes = await ResumeFile.find({
      candidateUserId: req.user.id,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        resumes: resumes.map((r) => r.toJSON()),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Downloads resume binary file with authorized access control.
 */
export const downloadResume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { id } = req.params;
    const resume = await ResumeFile.findById(id);

    if (!resume || resume.isDeleted) {
      return next(new AppError("Resume file not found", 404, "RESUME_NOT_FOUND"));
    }

    // Check authorization: Owner or privileged role (hiring_team / platform_manager)
    const isOwner = resume.candidateUserId.toString() === req.user.id;
    const userRole = normalizeRole(req.user.role);
    const isPrivileged = userRole === "hiring_team" || userRole === "platform_manager";

    if (!isOwner && !isPrivileged) {
      return next(new AppError("You do not have permission to download this resume", 403, "FORBIDDEN"));
    }

    const stream = await resumeStorage.getReadStream(resume.storageKey || resume.storagePath);

    const isInline = req.query.inline === "true" || req.query.view === "true";
    const dispositionType = isInline ? "inline" : "attachment";

    res.setHeader("Content-Type", resume.mimeType || "application/pdf");
    res.setHeader("Content-Disposition", `${dispositionType}; filename="${encodeURIComponent(resume.originalFilename)}"`);
    if (resume.fileSizeBytes) {
      res.setHeader("Content-Length", resume.fileSizeBytes);
    }

    stream.on("error", (streamErr) => {
      console.error("[ResumeDownload] Stream error during transmission:", streamErr instanceof Error ? streamErr.message : "Stream error");
      if (!res.headersSent) {
        res.status(502).json({ success: false, error: { code: "STORAGE_STREAM_ERROR", message: "Failed to stream resume file" } });
      }
    });

    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes candidate's resume (soft-delete and unlinks storage).
 */
export const deleteResume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { id } = req.params;
    const resume = await ResumeFile.findById(id);

    if (!resume || resume.isDeleted) {
      return next(new AppError("Resume file not found", 404, "RESUME_NOT_FOUND"));
    }

    if (resume.candidateUserId.toString() !== req.user.id) {
      return next(new AppError("You can only delete your own resumes", 403, "FORBIDDEN"));
    }

    // 1. Delete object from storage (R2 or local) first; fail safely if storage delete fails
    try {
      await resumeStorage.deleteFile(resume.storageKey || resume.storagePath);
    } catch (storageErr) {
      console.error("[ResumeDelete] Storage object deletion failed:", storageErr instanceof Error ? storageErr.message : "Delete error");
      return next(
        new AppError(
          "Failed to delete resume file from storage. Database record was preserved.",
          502,
          "STORAGE_DELETE_FAILED"
        )
      );
    }

    // 2. Mark deleted in MongoDB only after storage deletion succeeds
    resume.isDeleted = true;
    resume.deletedAt = new Date();
    await resume.save();

    // 3. Unset user active resumeId if it was pointing to this resume
    await User.updateOne({ _id: req.user.id, resumeId: resume.id }, { $set: { resumeId: null } });

    res.status(200).json({
      success: true,
      data: {
        deleted: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Note } from "../models/note.model.js";
import { Candidate } from "../models/candidate.model.js";
import { createNoteSchema, noteQuerySchema } from "../schemas/note.schema.js";
import { AppError } from "../middleware/errorHandler.js";

/**
 * Creates a recruiter note on a candidate's profile.
 * Authenticated author is automatically recorded from req.user.
 */
export const createCandidateNote = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { candidateId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      return next(new AppError("Invalid candidate ID format", 400, "INVALID_ID"));
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return next(new AppError("Candidate not found", 404, "CANDIDATE_NOT_FOUND"));
    }

    const validated = createNoteSchema.parse(req.body);

    const note = await Note.create({
      candidateId: candidate._id,
      authorId: req.user._id,
      body: validated.body,
      deletedAt: null,
      deletedBy: null,
    });

    await note.populate("authorId", "name email role");

    res.status(201).json({
      success: true,
      data: {
        note,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists active (non-soft-deleted) recruiter notes for a specific candidate in chronological order.
 */
export const getCandidateNotes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { candidateId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      return next(new AppError("Invalid candidate ID format", 400, "INVALID_ID"));
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return next(new AppError("Candidate not found", 404, "CANDIDATE_NOT_FOUND"));
    }

    const query = noteQuerySchema.parse(req.query);

    const filter = {
      candidateId: new mongoose.Types.ObjectId(candidateId),
      deletedAt: null,
    };

    const skip = (query.page - 1) * query.limit;
    const sortOrder = query.order === "asc" ? 1 : -1;

    const [notes, total] = await Promise.all([
      Note.find(filter)
        .sort({ createdAt: sortOrder })
        .skip(skip)
        .limit(query.limit)
        .populate("authorId", "name email role"),
      Note.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        notes,
        pagination: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft-deletes a recruiter note.
 * Permitted only for the note author or an administrator.
 */
export const deleteNote = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { noteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return next(new AppError("Invalid note ID format", 400, "INVALID_ID"));
    }

    const note = await Note.findOne({
      _id: noteId,
      deletedAt: null,
    });

    if (!note) {
      return next(new AppError("Note not found", 404, "NOTE_NOT_FOUND"));
    }

    // Role check: Only the original author or an Admin can soft-delete notes
    const isAuthor = note.authorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isAuthor && !isAdmin) {
      return next(
        new AppError(
          "You do not have permission to delete this note. Only the author or an admin may delete it.",
          403,
          "FORBIDDEN"
        )
      );
    }

    note.deletedAt = new Date();
    note.deletedBy = req.user._id;
    await note.save();

    res.status(200).json({
      success: true,
      data: {
        id: note.id,
        deletedAt: note.deletedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

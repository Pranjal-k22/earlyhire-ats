import { Router } from "express";
import {
  createCandidateNote,
  getCandidateNotes,
  deleteNote,
} from "../controllers/note.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

// Router with mergeParams: true to access :candidateId from parent router
const router = Router({ mergeParams: true });

router.use(requireAuth);

// Read notes for a candidate (All authenticated roles: admin, recruiter, hiring_manager)
router.get("/", getCandidateNotes);

// Add note to a candidate (All authenticated recruiting team members per Architecture.md)
router.post("/", requireRole("admin", "recruiter", "hiring_manager"), createCandidateNote);

// Soft-delete note via nested route
router.delete("/:noteId", deleteNote);

export default router;

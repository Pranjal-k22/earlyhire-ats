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

// Read notes for a candidate (Restricted to hiring_team, hiring_manager, and platform_manager)
router.get("/", requireRole("hiring_team", "hiring_manager", "platform_manager"), getCandidateNotes);

// Add note to a candidate (Restricted to hiring_team, hiring_manager, and platform_manager)
router.post("/", requireRole("hiring_team", "hiring_manager", "platform_manager"), createCandidateNote);

// Soft-delete note via nested route
router.delete("/:noteId", requireRole("hiring_team", "platform_manager"), deleteNote);

export default router;

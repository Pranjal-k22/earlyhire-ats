import { Router } from "express";
import { deleteNote } from "../controllers/note.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.delete("/:noteId", requireRole("admin", "recruiter", "hiring_manager"), deleteNote);

export default router;

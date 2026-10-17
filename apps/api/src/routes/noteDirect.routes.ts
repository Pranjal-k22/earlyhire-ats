import { Router } from "express";
import { deleteNote } from "../controllers/note.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.delete("/:noteId", deleteNote);

export default router;

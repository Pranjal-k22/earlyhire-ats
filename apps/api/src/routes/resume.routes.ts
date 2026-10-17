import { Router } from "express";
import {
  uploadResume,
  resumeUploadMiddleware,
  getMyResumes,
  downloadResume,
  deleteResume,
} from "../controllers/resume.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.post("/upload", resumeUploadMiddleware, uploadResume);
router.get("/my", getMyResumes);
router.get("/:id/download", downloadResume);
router.delete("/:id", deleteResume);

export default router;

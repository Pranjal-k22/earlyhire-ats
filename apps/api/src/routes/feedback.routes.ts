import { Router } from "express";
import {
  submitFeedback,
  getFeedbackForApplication,
  releaseFeedback,
  synthesizeFeedback,
} from "../controllers/feedback.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.post("/submit", requireRole("hiring_team"), submitFeedback);
router.get("/application/:applicationId", getFeedbackForApplication);
router.post("/:id/release", requireRole("hiring_team"), releaseFeedback);
router.post("/synthesize/:applicationId", requireRole("hiring_team"), synthesizeFeedback);

export default router;

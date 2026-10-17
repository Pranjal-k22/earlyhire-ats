import { Router } from "express";
import {
  scheduleInterview,
  getInterviewsForApplication,
  getMyInterviews,
  cancelInterview,
} from "../controllers/interview.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.post("/schedule", requireRole("hiring_team"), scheduleInterview);
router.get("/my", getMyInterviews);
router.get("/application/:applicationId", getInterviewsForApplication);
router.post("/:id/cancel", requireRole("hiring_team"), cancelInterview);

export default router;

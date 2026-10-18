import { Router } from "express";
import {
  getDashboardOverview,
  getRecruitmentFunnel,
} from "../controllers/analytics.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Analytics endpoints require authentication and recruiter/management privileges
router.use(requireAuth);
router.use(requireRole("hiring_team", "platform_manager"));

router.get("/overview", getDashboardOverview);
router.get("/funnel", getRecruitmentFunnel);
router.get("/metrics", getDashboardOverview);

export default router;

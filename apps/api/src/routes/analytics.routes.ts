import { Router } from "express";
import {
  getDashboardOverview,
  getRecruitmentFunnel,
} from "../controllers/analytics.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Analytics endpoints require authentication
router.use(requireAuth);

router.get("/overview", getDashboardOverview);
router.get("/funnel", getRecruitmentFunnel);
router.get("/metrics", getDashboardOverview);

export default router;

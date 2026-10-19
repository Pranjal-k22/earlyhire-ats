import { Router } from "express";
import {
  getDashboardOverview,
  getRecruitmentFunnel,
  getPlatformAnalytics,
  getCandidateAnalytics,
  streamAnalyticsEvents,
} from "../controllers/analytics.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// All analytics endpoints require authentication
router.use(requireAuth);

// Live SSE event stream: accessible to all authenticated roles
router.get("/events", streamAnalyticsEvents);

// Candidate personal analytics: accessible to candidate accounts
router.get("/candidate", getCandidateAnalytics);

// Platform manager analytics: accessible to platform managers & system admins
router.get("/platform", requireRole("platform_manager"), getPlatformAnalytics);

// Recruiter & hiring management analytics endpoints
router.get("/overview", requireRole("hiring_team", "platform_manager"), getDashboardOverview);
router.get("/funnel", requireRole("hiring_team", "platform_manager"), getRecruitmentFunnel);
router.get("/metrics", requireRole("hiring_team", "platform_manager"), getDashboardOverview);

export default router;

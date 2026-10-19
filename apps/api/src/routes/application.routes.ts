import { Router } from "express";
import {
  createApplication,
  applyForJob,
  getApplications,
  getApplicationById,
  transitionStage,
  getApplicationHistory,
  updateApplication,
  getApplicationComparison,
  retryApplicationScreening,
} from "../controllers/application.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Protect all application endpoints with authentication
router.use(requireAuth);

// Candidate Self-Application with ATS Snapshot
router.post("/apply", applyForJob);

// Application Read Endpoints (All authenticated roles)
router.get("/", getApplications);
router.get("/:id", getApplicationById);
router.get("/:id/comparison", getApplicationComparison);
router.get("/:id/history", getApplicationHistory);
router.get("/:id/stage-history", getApplicationHistory);

// Screening Retry Endpoints (Restricted to hiring_team and platform_manager roles)
router.post("/:id/screening/retry", requireRole("hiring_team", "platform_manager"), retryApplicationScreening);
router.post("/:id/retry-screening", requireRole("hiring_team", "platform_manager"), retryApplicationScreening);

// Application Mutating Endpoints (Restricted to hiring_team and platform_manager roles)
router.post("/", requireRole("hiring_team", "platform_manager"), createApplication);
router.patch("/:id", requireRole("hiring_team", "platform_manager"), updateApplication);

// Stage Transition Endpoints (Supporting both PATCH and POST per contract flexibility)
router.patch("/:id/stage", requireRole("hiring_team", "platform_manager"), transitionStage);
router.post("/:id/stage", requireRole("hiring_team", "platform_manager"), transitionStage);

export default router;

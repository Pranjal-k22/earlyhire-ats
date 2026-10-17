import { Router } from "express";
import {
  createApplication,
  getApplications,
  getApplicationById,
  transitionStage,
  getApplicationHistory,
  updateApplication,
} from "../controllers/application.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Protect all application endpoints with authentication
router.use(requireAuth);

// Application Read Endpoints (All authenticated roles: admin, recruiter, hiring_manager)
router.get("/", getApplications);
router.get("/:id", getApplicationById);
router.get("/:id/history", getApplicationHistory);
router.get("/:id/stage-history", getApplicationHistory);

// Application Mutating Endpoints (Restricted to admin and recruiter roles)
router.post("/", requireRole("admin", "recruiter"), createApplication);
router.patch("/:id", requireRole("admin", "recruiter"), updateApplication);

// Stage Transition Endpoints (Supporting both PATCH and POST per contract flexibility)
router.patch("/:id/stage", requireRole("admin", "recruiter"), transitionStage);
router.post("/:id/stage", requireRole("admin", "recruiter"), transitionStage);

export default router;

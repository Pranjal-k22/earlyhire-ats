import { Router } from "express";
import {
  runAtsAnalysis,
  getMyAnalyses,
  getAnalysisById,
  getAnalysesForJob,
  getApplicationAtsReport,
} from "../controllers/ats.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.post("/analyze", runAtsAnalysis);
router.get("/my", getMyAnalyses);
router.get("/application/:applicationId", getApplicationAtsReport);
router.get("/:id", getAnalysisById);
router.get("/job/:jobId", requireRole("hiring_team"), getAnalysesForJob);

export default router;

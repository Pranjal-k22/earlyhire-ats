import { Router } from "express";
import {
  getOrGenerateStageReview,
  recordHumanDecision,
} from "../controllers/stageReview.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/application/:applicationId", requireRole("hiring_team"), getOrGenerateStageReview);
router.post("/:reviewId/decision", requireRole("hiring_team"), recordHumanDecision);

export default router;
